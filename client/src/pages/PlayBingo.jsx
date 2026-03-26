import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';

const PlayBingo = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  const fetchGame = useCallback(async () => {
    try {
      const res = await api.get(`/bingo/${id}`);
      setGame(res.data.game);
      setIsCreator(res.data.isCreator);
    } catch (error) {
      toast.error('Failed to load game');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || selectedCard === null) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);

      const res = await api.post(`/bingo/${id}/fulfill/${selectedCard}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setGame(res.data.game);
      toast.success('Photo submitted! Waiting for approval.');
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const closeModal = () => {
    setSelectedCard(null);
    setSelectedFile(null);
    setPreview(null);
  };

  const getUserFulfillment = (card) => {
    return card.fulfillments?.find(f => f.user?._id === user._id);
  };

  const getCellStatus = (card) => {
    const myFulfillment = getUserFulfillment(card);
    if (!myFulfillment) return '';
    if (myFulfillment.status === 'approved') return 'bingo-cell-fulfilled';
    if (myFulfillment.status === 'pending') return 'bingo-cell-pending';
    if (myFulfillment.status === 'declined') return 'bingo-cell-declined';
    return '';
  };

  const getApprovedFulfillments = (card) => {
    return card.fulfillments?.filter(f => f.status === 'approved' || f.status === 'pending') || [];
  };

  if (loading) {
    return <div className="loading-inline"><div className="spinner" /></div>;
  }

  if (!game) {
    return (
      <div className="empty-state">
        <div className="empty-icon">😕</div>
        <h3 className="empty-title">Game not found</h3>
        <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{game.title}</h1>
          {game.description && <p className="page-subtitle">{game.description}</p>}
          <div className="game-card-meta" style={{ marginTop: '0.5rem' }}>
            <span>Created by {game.creator?.name}</span>
            <span>👥 {game.players?.length} players</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isCreator && (
            <Link to={`/manage/${game._id}`} className="btn btn-secondary btn-sm">
              ⚙️ Manage
            </Link>
          )}
          <button className="btn btn-ghost btn-sm" onClick={fetchGame}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Players bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Players:</span>
          {game.players?.map(player => (
            <div key={player._id} className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Avatar user={player} size="sm" />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{player.name?.split(' ')[0]}</span>
              <span className="tooltip">{player.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bingo Board */}
      <div
        className="bingo-board"
        style={{ gridTemplateColumns: `repeat(${game.cols}, 1fr)` }}
      >
        {game.cards.map((card, index) => {
          const myFulfillment = getUserFulfillment(card);
          const approvedAvatars = getApprovedFulfillments(card);
          const canClick = !myFulfillment || myFulfillment.status === 'declined';

          return (
            <div
              key={card._id || index}
              className={`bingo-cell ${getCellStatus(card)}`}
              onClick={() => canClick && setSelectedCard(index)}
              style={{ cursor: canClick ? 'pointer' : 'default' }}
            >
              <div className="bingo-cell-text">{card.text}</div>
              {approvedAvatars.length > 0 && (
                <div className="bingo-cell-avatars">
                  {approvedAvatars.map((f, i) => (
                    <div key={i} className="tooltip-container">
                      <Avatar user={f.user} size="sm" />
                      <span className="tooltip">
                        {f.user?.name} ({f.status})
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {myFulfillment && (
                <span
                  className={`fulfillment-status status-${myFulfillment.status}`}
                  style={{ marginTop: '0.25rem' }}
                >
                  {myFulfillment.status}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, border: '2px solid var(--success)', background: 'var(--success-bg)' }} />
          Approved
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, border: '2px solid var(--warning)', background: 'var(--warning-bg)' }} />
          Pending
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, border: '2px solid var(--danger)' }} />
          Declined
        </div>
      </div>

      {/* Upload Modal */}
      {selectedCard !== null && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Submit Proof</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="card" style={{ marginBottom: '1rem', background: 'var(--bg-primary)' }}>
                <p style={{ textAlign: 'center', fontWeight: 500 }}>
                  "{game.cards[selectedCard]?.text}"
                </p>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Upload a photo as proof that you completed this challenge.
              </p>

              <label className={`upload-area ${selectedFile ? 'has-file' : ''}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {preview ? (
                  <img src={preview} alt="Preview" className="upload-preview" />
                ) : (
                  <>
                    <div className="upload-icon">📸</div>
                    <div className="upload-text">Click to upload a photo</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      JPG, PNG, GIF or WebP (max 5MB)
                    </div>
                  </>
                )}
              </label>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? 'Uploading...' : '📤 Submit Proof'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayBingo;
