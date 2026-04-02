import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

const CreateBingo = () => {
  const navigate = useNavigate();
  const { t } = useLang();
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
      return toast.error(t('create.error.title'));
    }

    const emptyCards = cards.filter(c => !c.text.trim());
    if (emptyCards.length > 0) {
      return toast.error(t('create.error.cards', { n: rows * cols }));
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

      toast.success(t('create.success'));
      navigate(`/manage/${res.data.game._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || t('create.error.fail'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('create.title')}</h1>
          <p className="page-subtitle">{t('create.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>{t('create.gameInfo')}</h3>

          <div className="form-group">
            <label className="form-label">{t('create.titleLabel')}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t('create.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('create.descLabel')}</label>
            <textarea
              className="form-input"
              placeholder={t('create.descPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">{t('create.rows')}</label>
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
              <label className="form-label">{t('create.cols')}</label>
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
              <label className="form-label">{t('create.proofType')}</label>
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
            {t('create.cardsTitle', { rows, cols, total: rows * cols })}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {t('create.cardsSubtitle')}
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
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>{t('create.inviteTitle')}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {t('create.inviteSubtitle')}
          </p>

          <div className="form-group">
            <label className="form-label">{t('create.inviteLabel')}</label>
            <textarea
              className="form-input"
              placeholder={t('create.invitePlaceholder')}
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
            {t('create.cancel')}
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
          >
            {loading ? t('create.creating') : t('create.submit')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBingo;
