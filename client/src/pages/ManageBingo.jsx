import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';

const ManageBingo = () => {
  const { id } = useParams();
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
        toast.error('Only the creator can manage this game');
        navigate('/dashboard');
        return;
      }
      setGame(res.data.game);
    } catch (error) {
      toast.error('Failed to load game');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${game.inviteCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleReview = async (cardIndex, fulfillmentId, status) => {
    try {
      const res = await api.put(`/bingo/${id}/review/${cardIndex}/${fulfillmentId}`, { status });
      setGame(res.data.game);
      toast.success(`Fulfillment ${status}!`);
    } catch (error) {
      toast.error('Failed to update fulfillment');
    }
  };

  const toggleActive = async () => {
    try {
      const res = await api.put(`/bingo/${id}`, { isActive: !game.isActive });
      setGame(res.data.game);
      toast.success(game.isActive ? 'Game ended' : 'Game reactivated');
    } catch (error) {
      toast.error('Failed to update game');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/bingo/${id}`);
      toast.success('Game deleted');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to delete game');
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
            Manage your bingo game • {game.rows}×{game.cols} • {game.players?.length} players
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to={`/play/${game._id}`} className="btn btn-secondary btn-sm">
            🎮 Play View
          </Link>
          <Link to={`/edit/${game._id}`} className="btn btn-secondary btn-sm">
            ✏️ Edit
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={fetchGame}>
            🔄
          </button>
        </div>
      </div>

      {/* Invite Section */}
      <div className="invite-section" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>📨 Invite Players</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Share this link with friends to invite them to your bingo game.
        </p>
        <div className="invite-code">
          <span className="invite-code-text">
            {window.location.origin}/join/{game.inviteCode}
          </span>
          <button className="btn btn-primary btn-sm" onClick={copyInviteLink}>
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Invite Code: <strong style={{ color: 'var(--accent)' }}>{game.inviteCode}</strong>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'board' ? 'active' : ''}`}
          onClick={() => setActiveTab('board')}
        >
          Board Overview
        </button>
        <button
          className={`tab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          Review {pendingCount > 0 && `(${pendingCount} pending)`}
        </button>
        <button
          className={`tab ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          Players ({game.players?.length})
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
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
                          {f.user?.name} ({f.status})
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
              <h3 className="empty-title">No submissions yet</h3>
              <p className="empty-text">Players haven't submitted any proof photos yet.</p>
            </div>
          ) : (
            <div className="review-list">
              {getAllFulfillments().map((f, i) => (
                <div key={i} className="review-item">
                  <img
                    src={f.photoUrl}
                    alt="Proof"
                    className="review-photo"
                    onClick={() => setPhotoModal(f.photoUrl)}
                  />
                  <div className="review-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <Avatar user={f.user} size="sm" />
                      <strong style={{ fontSize: '0.9rem' }}>{f.user?.name}</strong>
                      <span className={`fulfillment-status status-${f.status}`}>{f.status}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Card: "{f.cardText}"
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(f.submittedAt).toLocaleString()}
                    </p>
                    {f.status === 'pending' && (
                      <div className="review-actions">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleReview(f.cardIndex, f._id, 'approved')}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleReview(f.cardIndex, f._id, 'declined')}
                        >
                          ✗ Decline
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
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>Active Players</h3>
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
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent)', marginLeft: '0.5rem' }}>CREATOR</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{player.email}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {playerFulfillments}/{game.cards.length} completed
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
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Game Settings</h3>

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
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Game Status</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {game.isActive ? 'Game is currently active and players can submit proofs' : 'Game is ended. No new submissions accepted.'}
                </div>
              </div>
              <button
                className={`btn btn-sm ${game.isActive ? 'btn-danger' : 'btn-success'}`}
                onClick={toggleActive}
              >
                {game.isActive ? 'End Game' : 'Reactivate'}
              </button>
            </div>

            <div style={{
              padding: '1rem',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--danger)' }}>
                Danger Zone
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Permanently delete this game and all associated data.
              </div>
              {!deleteConfirm ? (
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(true)}>
                  🗑️ Delete Game
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Are you sure?</span>
                  <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                    Yes, Delete
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirm(false)}>
                    Cancel
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
              <h3 className="modal-title">Proof Photo</h3>
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
