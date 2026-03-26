const mongoose = require('mongoose');

const fulfillmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  photoUrl: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
    default: 'pending',
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

const cardSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  position: {
    type: Number,
    required: true,
  },
  fulfillments: [fulfillmentSchema],
});

const bingoGameSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    default: '',
    maxlength: 500,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rows: {
    type: Number,
    required: true,
    min: 2,
    max: 10,
  },
  cols: {
    type: Number,
    required: true,
    min: 2,
    max: 10,
  },
  cards: [cardSchema],
  inviteCode: {
    type: String,
    unique: true,
    required: true,
  },
  invitedEmails: [{
    type: String,
    lowercase: true,
    trim: true,
  }],
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('BingoGame', bingoGameSchema);
