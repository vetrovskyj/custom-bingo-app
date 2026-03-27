import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const CreateBingo = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(4);
  const [cards, setCards] = useState(
    Array.from({ length: 16 }, (_, i) => ({ text: '', description: '' }))
  );
  const [inviteEmails, setInviteEmails] = useState('');
  const [proofType, setProofType] = useState('photo');
  const [expandedDesc, setExpandedDesc] = useState(null);
  const [loading, setLoading] = useState(false);

  const updateDimensions = (newRows, newCols) => {
    const total = newRows * newCols;
    const newCards = Array.from({ length: total }, (_, i) => ({
      text: i < cards.length ? cards[i].text : '',
      description: i < cards.length ? cards[i].description || '' : '',
    }));
    setRows(newRows);
    setCols(newCols);
    setCards(newCards);
  };

  const updateCardText = (index, text) => {
    const updated = [...cards];
    updated[index] = { ...updated[index], text };
    setCards(updated);
  };

  const updateCardDescription = (index, description) => {
    const updated = [...cards];
    updated[index] = { ...updated[index], description };
    setCards(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      return toast.error('Please enter a title');
    }

    const emptyCards = cards.filter(c => !c.text.trim());
    if (emptyCards.length > 0) {
      return toast.error(`Please fill in all ${rows * cols} cards`);
    }

    setLoading(true);
    try {
      const emails = inviteEmails
        .split(/[,;\n]/)
        .map(e => e.trim())
        .filter(e => e);

      const res = await api.post('/bingo', {
        title,
        description,
        rows,
        cols,
        cards,
        invitedEmails: emails,
        proofType,
      });

      toast.success('Bingo game created!');
      navigate(`/manage/${res.data.game._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Create New Bingo</h1>
          <p className="page-subtitle">Set up your bingo board and invite players</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>Game Info</h3>

          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Summer Fun Bingo, Office Bingo..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              className="form-input"
              placeholder="Describe your bingo game..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Rows</label>
              <select
                className="form-input"
                value={rows}
                onChange={(e) => updateDimensions(Number(e.target.value), cols)}
              >
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Columns</label>
              <select
                className="form-input"
                value={cols}
                onChange={(e) => updateDimensions(rows, Number(e.target.value))}
              >
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Proof Type</label>
              <select
                className="form-input"
                value={proofType}
                onChange={(e) => setProofType(e.target.value)}
              >
                <option value="photo">📸 Photo</option>
                <option value="text">📝 Text</option>
                <option value="none">✅ None</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>
            Bingo Cards ({rows}×{cols} = {rows * cols} cards)
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Fill in each card with a challenge or task for players to complete.
          </p>

          <div
            className="bingo-board"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              maxWidth: '100%',
            }}
          >
            {cards.map((card, index) => (
              <div key={index} className="bingo-cell" style={{ cursor: 'default', padding: '0.5rem' }}>
                <textarea
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '40px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font)',
                    fontSize: '0.8rem',
                    resize: 'none',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                  placeholder={`Card ${index + 1}`}
                  value={card.text}
                  onChange={(e) => updateCardText(index, e.target.value)}
                  maxLength={200}
                />
                {expandedDesc === index ? (
                  <textarea
                    className="card-description-input"
                    placeholder="Description (optional)"
                    value={card.description}
                    onChange={(e) => updateCardDescription(index, e.target.value)}
                    maxLength={500}
                    rows={2}
                    autoFocus
                    onBlur={() => !card.description && setExpandedDesc(null)}
                  />
                ) : (
                  <button
                    type="button"
                    className="card-description-toggle"
                    onClick={() => setExpandedDesc(index)}
                  >
                    {card.description ? '📝 desc' : '+ desc'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>Invite Players (optional)</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Enter email addresses separated by commas. You can also share the invite link after creating the game.
          </p>

          <div className="form-group">
            <label className="form-label">Email Addresses</label>
            <textarea
              className="form-input"
              placeholder="friend1@email.com, friend2@email.com"
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/dashboard')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
          >
            {loading ? 'Creating...' : '🎯 Create Bingo Game'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBingo;
