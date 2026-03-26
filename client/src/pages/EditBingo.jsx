import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const EditBingo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(4);
  const [cards, setCards] = useState([]);
  const [inviteEmails, setInviteEmails] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGame();
  }, [id]);

  const fetchGame = async () => {
    try {
      const res = await api.get(`/bingo/${id}`);
      const game = res.data.game;

      if (!res.data.isCreator) {
        toast.error('Only the creator can edit this game');
        navigate('/dashboard');
        return;
      }

      setTitle(game.title);
      setDescription(game.description || '');
      setRows(game.rows);
      setCols(game.cols);
      setCards(game.cards.map(c => ({ text: c.text, fulfillments: c.fulfillments })));
      setInviteEmails(game.invitedEmails?.join(', ') || '');
    } catch (error) {
      toast.error('Failed to load game');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const updateDimensions = (newRows, newCols) => {
    const total = newRows * newCols;
    const newCards = Array.from({ length: total }, (_, i) => ({
      text: i < cards.length ? cards[i].text : '',
      fulfillments: i < cards.length ? cards[i].fulfillments : [],
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      return toast.error('Please enter a title');
    }

    const emptyCards = cards.filter(c => !c.text.trim());
    if (emptyCards.length > 0) {
      return toast.error(`Please fill in all ${rows * cols} cards`);
    }

    setSaving(true);
    try {
      const emails = inviteEmails
        .split(/[,;\n]/)
        .map(e => e.trim())
        .filter(e => e);

      await api.put(`/bingo/${id}`, {
        title,
        description,
        rows,
        cols,
        cards,
        invitedEmails: emails,
      });

      toast.success('Game updated!');
      navigate(`/manage/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update game');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-inline"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Edit Bingo</h1>
          <p className="page-subtitle">Modify your bingo game settings and cards</p>
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
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
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>
            Bingo Cards ({rows}×{cols})
          </h3>

          <div
            className="bingo-board"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: '100%' }}
          >
            {cards.map((card, index) => (
              <div key={index} className="bingo-cell" style={{ cursor: 'default', padding: '0.5rem' }}>
                <textarea
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '60px',
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
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>Invite Players</h3>

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
            onClick={() => navigate(`/manage/${id}`)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={saving}
          >
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditBingo;
