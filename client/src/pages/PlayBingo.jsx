import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';

const PlayBingo = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLang();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [textProof, setTextProof] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  const fetchGame = useCallback(async () => {
    try {
      const res = await api.get(`/bingo/${id}`);
      setGame(res.data.game);
      setIsCreator(res.data.isCreator);
    } catch (error) {
      toast.error(t('play.error.load'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error(t('play.fileTooLarge'));
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = async () => {
    if (selectedCard === null) return;

    const proofType = game.proofType || 'photo';

    if (proofType === 'photo' && !selectedFile) return;
    if (proofType === 'text' && !textProof.trim()) return;

    setUploading(true);
    try {
      if (proofType === 'photo') {
        const formData = new FormData();
        formData.append('photo', selectedFile);
        const res = await api.post(`/bingo/${id}/fulfill/${selectedCard}`, formData);
        setGame(res.data.game);
      } else if (proofType === 'text') {
        const res = await api.post(`/bingo/${id}/fulfill/${selectedCard}`, { textProof });
        setGame(res.data.game);
      } else {
        const res = await api.post(`/bingo/${id}/fulfill/${selectedCard}`, {});
        setGame(res.data.game);
      }

      toast.success(proofType === 'none' ? t('play.success.none') : t('play.success.proof'));
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || t('play.error.submit'));
    } finally {
      setUploading(false);
    }
  };

  const closeModal = () => {
    setSelectedCard(null);
    setSelectedFile(null);
    setPreview(null);
    setTextProof('');
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

  const translateStatus = (status) => t(`status.${status}`);

  const lineDefinitions = useMemo(() => {
    if (!game) return [];
    const defs = [];
    const { rows, cols } = game;

    for (let r = 0; r < rows; r++) {
      defs.push({
        id: `row-${r}`,
        label: t('line.row', { n: r + 1 }),
        cells: Array.from({ length: cols }, (_, c) => r * cols + c),
      });
    }

    for (let c = 0; c < cols; c++) {
      defs.push({
        id: `col-${c}`,
        label: t('line.col', { n: c + 1 }),
        cells: Array.from({ length: rows }, (_, r) => r * cols + c),
      });
    }

    if (rows === cols) {
      defs.push({
        id: 'diag-main',
        label: t('line.diagMain'),
        cells: Array.from({ length: rows }, (_, i) => i * cols + i),
      });
      defs.push({
        id: 'diag-anti',
        label: t('line.diagAnti'),
        cells: Array.from({ length: rows }, (_, i) => i * cols + (cols - 1 - i)),
      });
    }

    return defs;
  }, [game, t]);

  // Bingo detection: find completed lines for each player
  const detectBingos = useMemo(() => {
    if (!game) return { bingos: [], playerBingos: {} };

    const { cards } = game;
    const playerBingos = {};
    const bingos = [];

    (game.players || []).forEach(player => {
      const pid = player._id;
      const grid = cards.map(card =>
        card.fulfillments?.some(f => f.user?._id === pid && f.status === 'approved') || false
      );

      const lines = [];
      lineDefinitions.forEach(line => {
        if (line.cells.every(idx => grid[idx])) {
          lines.push({ type: line.id, label: line.label, cells: line.cells });
        }
      });

      if (lines.length > 0) {
        playerBingos[pid] = { player, lines, grid };
        lines.forEach(line => bingos.push({ player, line }));
      }
    });

    return { bingos, playerBingos };
  }, [game, lineDefinitions]);

  // Activity log with bingo entries inserted immediately after the triggering fulfillment
  const activityLog = useMemo(() => {
    if (!game) return [];

    const approvals = [];
    game.cards.forEach((card, cardIndex) => {
      card.fulfillments?.forEach(f => {
        if (f.status === 'approved') {
          approvals.push({
            type: 'fulfillment',
            user: f.user,
            cardText: card.text,
            cardIndex,
            submittedAt: new Date(f.submittedAt || Date.now()).getTime(),
          });
        }
      });
    });

    approvals.sort((a, b) => a.submittedAt - b.submittedAt);

    const timeline = [];
    const cellsPerUser = new Map();
    const linesPerUser = new Map();
    const totalCells = game.cards.length;

    approvals.forEach(entry => {
      timeline.push(entry);

      const userId = entry.user?._id;
      if (!userId) return;

      if (!cellsPerUser.has(userId)) cellsPerUser.set(userId, new Set());
      if (!linesPerUser.has(userId)) linesPerUser.set(userId, new Set());

      const cellSet = cellsPerUser.get(userId);
      const completedLineSet = linesPerUser.get(userId);

      cellSet.add(entry.cardIndex);

      const currentGrid = Array.from({ length: totalCells }, (_, idx) => cellSet.has(idx));

      lineDefinitions.forEach(line => {
        if (line.cells.every(idx => cellSet.has(idx)) && !completedLineSet.has(line.id)) {
          completedLineSet.add(line.id);
          timeline.push({
            type: 'bingo',
            user: entry.user,
            lineLabel: line.label,
            lineCells: line.cells,
            grid: currentGrid.slice(),
            submittedAt: entry.submittedAt + 1, // ensures it renders right above the triggering fulfillment
          });
        }
      });
    });

    return timeline.sort((a, b) => b.submittedAt - a.submittedAt);
  }, [game, lineDefinitions]);

  // Mini board renderer
  const renderMiniBoard = (grid, bingoCells) => {
    if (!game) return null;
    const bingoSet = new Set(bingoCells);
    return (
      <div
        className="mini-board"
        style={{ gridTemplateColumns: `repeat(${game.cols}, 16px)` }}
      >
        {grid.map((filled, i) => (
          <div
            key={i}
            className={`mini-cell ${filled ? 'mini-filled' : ''} ${bingoSet.has(i) ? 'mini-bingo-line' : ''}`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="loading-inline"><div className="spinner" /></div>;
  }

  if (!game) {
    return (
      <div className="empty-state">
        <div className="empty-icon">😕</div>
        <h3 className="empty-title">{t('play.notFound')}</h3>
        <Link to="/dashboard" className="btn btn-primary">{t('play.backToDashboard')}</Link>
      </div>
    );
  }

  const proofType = game.proofType || 'photo';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{game.title}</h1>
          {game.description && <p className="page-subtitle">{game.description}</p>}
          <div className="game-card-meta" style={{ marginTop: '0.5rem' }}>
            <span>{t('play.createdBy')} {game.creator?.name}</span>
            <span>👥 {game.players?.length} {t('play.players')}</span>
            <span className="proof-type-badge">
              {proofType === 'photo' ? t('play.proofPhoto') : proofType === 'text' ? t('play.proofText') : t('play.proofNone')} {t('play.proof')}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isCreator && (
            <Link to={`/manage/${game._id}`} className="btn btn-secondary btn-sm">
              {t('play.manage')}
            </Link>
          )}
          <button className="btn btn-ghost btn-sm" onClick={fetchGame}>
            {t('play.refresh')}
          </button>
        </div>
      </div>

      {/* Players bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{t('play.playersLabel')}</span>
          {game.players?.map(player => (
            <div key={player._id} className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Avatar user={player} size="sm" />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{player.name?.split(' ')[0]}</span>
              <span className="tooltip">{player.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bingo Alerts */}
      {detectBingos.bingos.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', borderColor: 'var(--accent)' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent)' }}>{t('play.bingo')}</div>
          {Object.values(detectBingos.playerBingos).map(({ player, lines, grid }) => {
            const allBingoCells = lines.flatMap(l => l.cells);
            return (
              <div key={player._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Avatar user={player} size="sm" />
                <span style={{ fontSize: '0.85rem' }}>
                  <strong>{player.name}</strong> — {t(lines.length === 1 ? 'play.bingoLines' : 'play.bingoLines_plural', { count: lines.length })}
                </span>
                {renderMiniBoard(grid, allBingoCells)}
              </div>
            );
          })}
        </div>
      )}

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
                        {f.user?.name} ({translateStatus(f.status)})
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
                  {translateStatus(myFulfillment.status)}
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
          {t('play.legend.approved')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, border: '2px solid var(--warning)', background: 'var(--warning-bg)' }} />
          {t('play.legend.pending')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, border: '2px solid var(--danger)' }} />
          {t('play.legend.declined')}
        </div>
      </div>

      {/* Activity Log */}
      {activityLog.length > 0 && (
        <div className="activity-log">
          <div className="activity-log-title">{t('play.activityLog')}</div>
          <div className="activity-list">
            {activityLog.map((item, i) => {
              const isBingo = item.type === 'bingo';
              return (
                <div key={i} className={`activity-item ${isBingo ? 'bingo-alert' : ''}`}>
                  <Avatar user={item.user} size="sm" />
                  <div className="activity-text">
                    {isBingo ? (
                      <div className="activity-bingo-content">
                        <div className="activity-bingo-line">
                          <span className="activity-bingo-icon">🎯</span>
                          <span>
                            <strong>{item.user?.name}</strong> {t('play.completedBingo')} ({item.lineLabel}) 🎉
                          </span>
                        </div>
                        {item.grid && item.lineCells && (
                          <div className="activity-bingo-visual">
                            {renderMiniBoard(item.grid, item.lineCells)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <strong>{item.user?.name}</strong> {t('play.completed')} "{item.cardText}"
                      </>
                    )}
                  </div>
                  <span className="activity-time">
                    {new Date(item.submittedAt).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit Proof Modal */}
      {selectedCard !== null && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {proofType === 'none' ? t('play.modal.complete') : t('play.modal.submit')}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="card" style={{ marginBottom: '1rem', background: 'var(--bg-primary)' }}>
                <p style={{ textAlign: 'center', fontWeight: 500 }}>
                  "{game.cards[selectedCard]?.text}"
                </p>
                {game.cards[selectedCard]?.description && (
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    {game.cards[selectedCard].description}
                  </p>
                )}
              </div>

              {proofType === 'photo' && (
                <>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {t('play.modal.photoSubtitle')}
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
                        <div className="upload-text">{t('play.modal.uploadClick')}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {t('play.modal.uploadFormats')}
                        </div>
                      </>
                    )}
                  </label>
                </>
              )}

              {proofType === 'text' && (
                <>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {t('play.modal.textSubtitle')}
                  </p>
                  <textarea
                    className="form-input"
                    placeholder={t('play.modal.textPlaceholder')}
                    value={textProof}
                    onChange={(e) => setTextProof(e.target.value)}
                    rows={4}
                    maxLength={1000}
                  />
                </>
              )}

              {proofType === 'none' && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                  {t('play.modal.noneSubtitle')}
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                {t('play.modal.cancelBtn')}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitProof}
                disabled={
                  uploading ||
                  (proofType === 'photo' && !selectedFile) ||
                  (proofType === 'text' && !textProof.trim())
                }
              >
                {uploading
                  ? t('play.modal.submitting')
                  : proofType === 'none'
                    ? t('play.modal.markComplete')
                    : t('play.modal.submitProof')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayBingo;
