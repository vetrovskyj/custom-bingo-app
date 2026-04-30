const express = require('express');
const { v4: uuidv4 } = require('uuid');
const BingoGame = require('../models/BingoGame');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { upload, handleUpload } = require('../middleware/upload');
const { storeUploadedImage } = require('../services/mediaStorage');

const router = express.Router();

// POST /api/bingo - Create a new bingo game
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, rows, cols, cards, invitedEmails, proofType } = req.body;

    if (!title || !rows || !cols || !cards) {
      return res.status(400).json({ message: 'Title, dimensions, and cards are required' });
    }

    if (rows < 2 || rows > 10 || cols < 2 || cols > 10) {
      return res.status(400).json({ message: 'Dimensions must be between 2 and 10' });
    }

    const expectedCards = rows * cols;
    if (!Array.isArray(cards) || cards.length !== expectedCards) {
      return res.status(400).json({ message: `Expected ${expectedCards} cards for ${rows}x${cols} grid` });
    }

    const inviteCode = uuidv4().slice(0, 8).toUpperCase();

    const game = new BingoGame({
      title,
      description: description || '',
      creator: req.userId,
      rows,
      cols,
      cards: cards.map((card, index) => ({
        text: card.text,
        description: card.description || '',
        position: index,
        fulfillments: [],
      })),
      inviteCode,
      invitedEmails: invitedEmails || [],
      players: [req.userId],
      proofType: proofType || 'photo',
    });

    await game.save();
    await game.populate('creator', 'name email profilePicture');

    res.status(201).json({ game });
  } catch (error) {
    console.error('Create bingo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/bingo/my-games - Get games created by user
router.get('/my-games', auth, async (req, res) => {
  try {
    const games = await BingoGame.find({ creator: req.userId })
      .populate('creator', 'name email profilePicture')
      .populate('players', 'name email profilePicture')
      .sort({ createdAt: -1 });

    res.json({ games });
  } catch (error) {
    console.error('Get my games error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/bingo/playing - Get games user is playing (not created by them)
router.get('/playing', auth, async (req, res) => {
  try {
    const games = await BingoGame.find({
      players: req.userId,
      creator: { $ne: req.userId },
      isActive: true,
    })
      .populate('creator', 'name email profilePicture')
      .populate('players', 'name email profilePicture')
      .sort({ createdAt: -1 });

    res.json({ games });
  } catch (error) {
    console.error('Get playing games error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/bingo/join/:inviteCode - Join a bingo game
router.get('/join/:inviteCode', auth, async (req, res) => {
  try {
    const gameStatus = await BingoGame.findOne({ inviteCode: req.params.inviteCode })
      .select('_id isActive')
      .lean();

    if (!gameStatus) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (!gameStatus.isActive) {
      return res.status(400).json({ message: 'This game is no longer active' });
    }

    const game = await BingoGame.findOneAndUpdate(
      { _id: gameStatus._id, isActive: true },
      { $addToSet: { players: req.userId } },
      { new: true }
    )
      .populate('creator', 'name email profilePicture')
      .populate('players', 'name email profilePicture');

    if (!game) {
      return res.status(400).json({ message: 'This game is no longer active' });
    }

    res.json({ game });
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/bingo/:id - Get a specific bingo game
router.get('/:id', auth, async (req, res) => {
  try {
    const game = await BingoGame.findById(req.params.id)
      .populate('creator', 'name email profilePicture')
      .populate('players', 'name email profilePicture')
      .populate('cards.fulfillments.user', 'name email profilePicture');

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Check if user is player or creator
    const isPlayer = game.players.some(p => p._id.toString() === req.userId.toString());
    const isCreator = game.creator._id.toString() === req.userId.toString();

    if (!isPlayer && !isCreator) {
      return res.status(403).json({ message: 'You are not part of this game' });
    }

    res.json({ game, isCreator });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/bingo/:id - Update a bingo game (creator only)
router.put('/:id', auth, async (req, res) => {
  try {
    const game = await BingoGame.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.creator.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Only the creator can edit this game' });
    }

    const { title, description, rows, cols, cards, invitedEmails, isActive, proofType } = req.body;

    // Build a flat $set payload so we bypass Mongoose change-tracking entirely
    const $set = {};

    if (title) $set.title = title;
    if (description !== undefined) $set.description = description;
    if (invitedEmails) $set.invitedEmails = invitedEmails;
    if (isActive !== undefined) $set.isActive = isActive;
    if (proofType) $set.proofType = proofType;

    // Allow dimension and card changes
    if (rows && cols && cards) {
      const expectedCards = rows * cols;
      if (!Array.isArray(cards) || cards.length !== expectedCards) {
        return res.status(400).json({ message: `Expected ${expectedCards} cards for ${rows}x${cols} grid` });
      }

      $set.rows = rows;
      $set.cols = cols;

      const previousCards = game.cards || [];
      const updatedCards = [];
      for (let index = 0; index < expectedCards; index++) {
        const payloadCard = cards[index] || {};
        const existingCard = previousCards[index];

        const textValue = (payloadCard.text ?? existingCard?.text ?? '').trim();
        if (!textValue) {
          return res.status(400).json({ message: `Card ${index + 1} must include text` });
        }

        updatedCards.push({
          text: textValue,
          description: (payloadCard.description ?? existingCard?.description ?? '').trim(),
          position: index,
          fulfillments: existingCard?.fulfillments || [],
        });
      }

      $set.cards = updatedCards;
    }

    const updated = await BingoGame.findByIdAndUpdate(
      req.params.id,
      { $set },
      { new: true, runValidators: true }
    )
      .populate('creator', 'name email profilePicture')
      .populate('players', 'name email profilePicture');

    res.json({ game: updated });
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/bingo/:id - Delete a bingo game (creator only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const game = await BingoGame.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.creator.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Only the creator can delete this game' });
    }

    await BingoGame.findByIdAndDelete(req.params.id);
    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/bingo/:id/fulfill/:cardIndex - Fulfill a card with proof
router.post('/:id/fulfill/:cardIndex', auth, (req, res, next) => {
  handleUpload(upload.single('photo'), req, res, next);
}, async (req, res) => {
  try {
    const game = await BingoGame.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Check player is in the game
    if (!game.players.some(p => p.toString() === req.userId.toString())) {
      return res.status(403).json({ message: 'You are not part of this game' });
    }

    const cardIndex = parseInt(req.params.cardIndex);
    if (cardIndex < 0 || cardIndex >= game.cards.length) {
      return res.status(400).json({ message: 'Invalid card index' });
    }

    const card = game.cards[cardIndex];

    // Check if user already fulfilled this card
    const existingFulfillment = card.fulfillments.find(
      f => f.user.toString() === req.userId.toString()
    );

    let photoDataURI = '';
    let textProof = '';
    let autoApprove = false;

    if (game.proofType === 'photo') {
      if (!req.file) {
        return res.status(400).json({ message: 'Photo is required' });
      }
      photoDataURI = await storeUploadedImage(req.file, { folder: 'fulfillments' });
    } else if (game.proofType === 'text') {
      textProof = req.body.textProof || '';
      if (!textProof.trim()) {
        return res.status(400).json({ message: 'Text proof is required' });
      }
    } else {
      // proofType === 'none'
      autoApprove = true;
    }

    const status = autoApprove ? 'approved' : 'pending';

    if (existingFulfillment) {
      existingFulfillment.photoUrl = photoDataURI;
      existingFulfillment.textProof = textProof;
      existingFulfillment.status = status;
      existingFulfillment.submittedAt = Date.now();
    } else {
      card.fulfillments.push({
        user: req.userId,
        photoUrl: photoDataURI,
        textProof,
        status,
      });
    }

    await game.save();
    await game.populate('cards.fulfillments.user', 'name email profilePicture');
    await game.populate('players', 'name email profilePicture');
    await game.populate('creator', 'name email profilePicture');

    res.json({ game });
  } catch (error) {
    console.error('Fulfill card error:', error);

    if (error.name === 'MongoServerError' && error.code === 16402) {
      return res.status(413).json({ message: 'Game data too large. Please upload a smaller photo or remove old fulfillments.' });
    }

    if (error.message && error.message.includes('ENOSPC')) {
      return res.status(507).json({ message: 'Server storage full. Please try again later.' });
    }

    res.status(500).json({ message: 'Server error while saving fulfillment' });
  }
});

// PUT /api/bingo/:id/review/:cardIndex/:fulfillmentId - Approve/decline fulfillment (creator only)
router.put('/:id/review/:cardIndex/:fulfillmentId', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or declined' });
    }

    const game = await BingoGame.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.creator.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Only the creator can review fulfillments' });
    }

    const cardIndex = parseInt(req.params.cardIndex);
    if (cardIndex < 0 || cardIndex >= game.cards.length) {
      return res.status(400).json({ message: 'Invalid card index' });
    }

    const fulfillment = game.cards[cardIndex].fulfillments.id(req.params.fulfillmentId);
    if (!fulfillment) {
      return res.status(404).json({ message: 'Fulfillment not found' });
    }

    fulfillment.status = status;
    await game.save();

    await game.populate('cards.fulfillments.user', 'name email profilePicture');
    await game.populate('players', 'name email profilePicture');
    await game.populate('creator', 'name email profilePicture');

    res.json({ game });
  } catch (error) {
    console.error('Review fulfillment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
