import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

const EditBingo = () => {
  const { id } = useParams();
  const { t } = useLang();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(4);
  const [cards, setCards] = useState([]);
  const [inviteEmails, setInviteEmails] = useState('');
  const [proofType, setProofType] = useState('photo');
  const [expandedDesc, setExpandedDesc] = useState(null);
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
        toast.error(t('edit.error.notCreator'));
        navigate('/dashboard');
        return;
      }

      setTitle(game.title);
      setDescription(game.description || '');
      setRows(game.rows);
      setCols(game.cols);
      setCards(game.cards.map(c => ({ text: c.text, description: c.description || '' })));
      setInviteEmails(game.invitedEmails?.join(', ') || '');
      setProofType(game.proofType || 'photo');
    } catch (error) {
      toast.error(t('edit.error.load'));
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

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
      return toast.error(t('edit.error.title'));
    }

    const emptyCards = cards.filter(c => !c.text.trim());
    if (emptyCards.length > 0) {
      return toast.error(t('edit.error.cards', { n: rows * cols }));
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
        proofType,
      });

      toast.success(t('edit.success'));
      navigate(`/manage/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || t('edit.error.fail'));
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
          <h1 className="page-title">{t('edit.title')}</h1>
          <p className="page-subtitle">{t('edit.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>{t('edit.gameInfo')}</h3>

          <div className="form-group">
            <label className="form-label">{t('edit.titleLabel')}</label>
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
            <label className="form-label">{t('edit.descLabel')}</label>
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
              <label className="form-label">{t('edit.rows')}</label>
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
              <label className="form-label">{t('edit.cols')}</label>
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
              <label className="form-label">{t('edit.proofType')}</label>
              <select
                className="form-input"
                value={proofType}
                onChange={(e) => setProofType(e.target.value)}
              >
                <option value="photo">{t('create.proofPhoto')}</option>
                <option value="text">{t('create.proofText')}</option>
                <option value="none">{t('create.proofNone')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>
            {t('edit.cardsTitle', { rows, cols })}
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
                  placeholder={t('create.cardPlaceholder', { n: index + 1 })}
                  value={card.text}
                  onChange={(e) => updateCardText(index, e.target.value)}
                  maxLength={200}
                />
                {expandedDesc === index ? (
                  <textarea
                    className="card-description-input"
                    placeholder={t('create.descInputPlaceholder')}
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
                    {card.description ? t('create.descToggleFilled') : t('create.descToggle')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>{t('edit.inviteTitle')}</h3>

          <div className="form-group">
            <label className="form-label">{t('edit.inviteLabel')}</label>
            <textarea
              className="form-input"
              placeholder={t('edit.invitePlaceholder')}
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
            {t('edit.cancel')}
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={saving}
          >
            {saving ? t('edit.saving') : t('edit.submit')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditBingo;
