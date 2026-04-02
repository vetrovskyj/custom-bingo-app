import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import api from '../api/axios';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';

const ManageBingo = () => {
  const { id } = useParams();
  const { t } = useLang();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board');
  const [copied, setCopied] = useState(false);
  const [photoModal, setPhotoModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchGame = useCallback(async () => {
    try {
      const res = await api.get(`/bingo/${id}`);
      if (!res.data.isCreator) {
        toast.error(t('manage.error.notCreator'));
        navigate('/dashboard');
        return;
      }
      setGame(res.data.game);
    } catch (error) {
      toast.error(t('manage.error.load'));
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, t]);

  const translateStatus = (status) => t(`status.${status}`);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${game.inviteCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success(t('manage.success.copied'));
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleReview = async (cardIndex, fulfillmentId, status) => {
    try {
      const res = await api.put(`/bingo/${id}/review/${cardIndex}/${fulfillmentId}`, { status });
      setGame(res.data.game);
      toast.success(status === 'approved' ? t('manage.success.approved') : t('manage.success.declined'));
    } catch (error) {
      toast.error(t('manage.error.review'));
    }
  };

  const toggleActive = async () => {
    try {
      const res = await api.put(`/bingo/${id}`, { isActive: !game.isActive });
      setGame(res.data.game);
      toast.success(game.isActive ? t('manage.success.ended') : t('manage.success.reactivated'));
    } catch (error) {
      toast.error(t('manage.error.update'));
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/bingo/${id}`);
      toast.success(t('manage.success.deleted'));
      navigate('/dashboard');
    } catch (error) {
      toast.error(t('manage.error.delete'));
    }
  };

  const getPendingCount = () => {
    if (!game) return 0;
    return game.cards.reduce((acc, card) => {
      return acc + (card.fulfillments?.filter(f => f.status === 'pending').length || 0);
    }, 0);
  };

  const getAllFulfillments = () => {
    if (!game) return [];
    const fulfillments = [];
    game.cards.forEach((card, cardIndex) => {
      card.fulfillments?.forEach(f => {
        fulfillments.push({
          ...f,
          cardIndex,
          cardText: card.text,
        });
      });
    });
    return fulfillments.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  };

  if (loading) {
    return <div className="loading-inline"><div className="spinner" /></div>;
  }

  if (!game) return null;

  const pendingCount = getPendingCount();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{game.title}</h1>
          <p className="page-subtitle">
            {t('manage.subtitle', { rows: game.rows, cols: game.cols, players: game.players?.length })}
            {' • '}
            <span className="proof-type-badge">
              {game.proofType === 'photo' ? t('manage.proofPhoto') : game.proofType === 'text' ? t('manage.proofText') : t('manage.proofNone')} {t('manage.proof')}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to={`/play/${game._id}`} className="btn btn-secondary btn-sm">
            {t('manage.playView')}
          </Link>
          <Link to={`/edit/${game._id}`} className="btn btn-secondary btn-sm">
            {t('manage.edit')}
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={fetchGame}>
            🔄
          </button>
        </div>
      </div>

      {/* Invite Section */}
      <div className="invite-section" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{t('manage.inviteTitle')}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          {t('manage.inviteSubtitle')}
        </p>
        <div className="invite-code">
          <span className="invite-code-text">
            {window.location.origin}/join/{game.inviteCode}
          </span>
          <button className="btn btn-primary btn-sm" onClick={copyInviteLink}>
            {copied ? t('manage.copied') : t('manage.copy')}
          </button>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {t('manage.inviteCodeLabel')} <strong style={{ color: 'var(--accent)' }}>{game.inviteCode}</strong>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'board' ? 'active' : ''}`}
          onClick={() => setActiveTab('board')}
        >
          {t('manage.tab.board')}
        </button>
        <button
          className={`tab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          {t('manage.tab.review')} {pendingCount > 0 && t('manage.tab.pending', { n: pendingCount })}
        </button>
        <button
          className={`tab ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          {t('manage.tab.players', { n: game.players?.length })}
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          {t('manage.tab.settings')}
        </button>
      </div>

      {/* Board Tab */}
      {activeTab === 'board' && (
        <div
          className="bingo-board"
          style={{ gridTemplateColumns: `repeat(${game.cols}, 1fr)` }}
        >
          {game.cards.map((card, index) => {
            const approved = card.fulfillments?.filter(f => f.status === 'approved') || [];
            const pending = card.fulfillments?.filter(f => f.status === 'pending') || [];
            const hasPending = pending.length > 0;

            return (
              <div
                key={card._id || index}
                className={`bingo-cell ${hasPending ? 'bingo-cell-pending' : approved.length > 0 ? 'bingo-cell-fulfilled' : ''}`}
                style={{ cursor: 'default' }}
              >
                <div className="bingo-cell-text">{card.text}</div>
                {(approved.length > 0 || pending.length > 0) && (
                  <div className="bingo-cell-avatars">
                    {[...approved, ...pending].map((f, i) => (
                      <div key={i} className="tooltip-container">
                        <Avatar user={f.user} size="sm" />
                        <span className="tooltip">
                          {f.user?.name} ({translateStatus(f.status)})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Tab */}
      {activeTab === 'review' && (
        <div>
          {getAllFulfillments().length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
                <h3 className="empty-title">{t('manage.review.empty.title')}</h3>
                <p className="empty-text">
                  {game.proofType === 'none'
                    ? t('manage.review.empty.none')
                    : t('manage.review.empty.text')}
                </p>
            </div>
          ) : (
            <div className="review-list">
              {getAllFulfillments().map((f, i) => (
                <div key={i} className="review-item">
                  {f.photoUrl && (
                    <img
                      src={f.photoUrl}
                      alt={t('manage.photo.title')}
                      className="review-photo"
                      onClick={() => setPhotoModal(f.photoUrl)}
                    />
                  )}
                  <div className="review-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <Avatar user={f.user} size="sm" />
                      <strong style={{ fontSize: '0.9rem' }}>{f.user?.name}</strong>
                      <span className={`fulfillment-status status-${f.status}`}>{translateStatus(f.status)}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      {t('manage.review.card')} "{f.cardText}"
                    </p>
                    {f.textProof && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.25rem', fontStyle: 'italic' }}>
                        📝 "{f.textProof}"
                      </p>
                    )}
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(f.submittedAt).toLocaleString()}
                    </p>
                    {f.status === 'pending' && (
                      <div className="review-actions">
                        <button
                          className="btn btn-success btn-sm"
                            onClick={() => handleReview(f.cardIndex, f._id, 'approved')}
                          >
                            {t('manage.review.approve')}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleReview(f.cardIndex, f._id, 'declined')}
                          >
                            {t('manage.review.decline')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Players Tab */}
      {activeTab === 'players' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>{t('manage.players.title')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {game.players?.map(player => {
              const playerFulfillments = game.cards.reduce((acc, card) => {
                const f = card.fulfillments?.filter(f => f.user?._id === player._id) || [];
                return acc + f.filter(f => f.status === 'approved').length;
              }, 0);

              return (
                <div
                  key={player._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <Avatar user={player} size="md" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {player.name}
                      {player._id === game.creator?._id && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent)', marginLeft: '0.5rem' }}>{t('manage.players.creator')}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{player.email}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {t('manage.players.progress', { done: playerFulfillments, total: game.cards.length })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>{t('manage.settings.title')}</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{t('manage.settings.statusTitle')}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {game.isActive ? t('manage.settings.statusActive') : t('manage.settings.statusEnded')}
                </div>
              </div>
              <button
                className={`btn btn-sm ${game.isActive ? 'btn-danger' : 'btn-success'}`}
                onClick={toggleActive}
              >
                {game.isActive ? t('manage.settings.endGame') : t('manage.settings.reactivate')}
              </button>
            </div>

            <div style={{
              padding: '1rem',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--danger)' }}>
                {t('manage.settings.dangerTitle')}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                {t('manage.settings.dangerText')}
              </div>
              {!deleteConfirm ? (
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(true)}>
                  {t('manage.settings.delete')}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>{t('manage.settings.sure')}</span>
                  <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                    {t('manage.settings.confirmDelete')}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirm(false)}>
                    {t('manage.settings.cancelDelete')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {photoModal && (
        <div className="modal-overlay" onClick={() => setPhotoModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw' }}>
            <div className="modal-header">
              <h3 className="modal-title">{t('manage.photo.title')}</h3>
              <button className="modal-close" onClick={() => setPhotoModal(null)}>×</button>
            </div>
            <img
              src={photoModal}
              alt="Proof"
              style={{ width: '100%', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageBingo;
