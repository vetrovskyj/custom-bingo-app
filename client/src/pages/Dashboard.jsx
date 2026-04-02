import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import api from '../api/axios';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLang();
  const [myGames, setMyGames] = useState([]);
  const [playingGames, setPlayingGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-games');
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchGames();

    // Check for pending invite code from pre-registration flow
    const pendingCode = sessionStorage.getItem('pendingInviteCode');
    if (pendingCode) {
      sessionStorage.removeItem('pendingInviteCode');
      setJoinCode(pendingCode);
      setJoinModalOpen(true);
    }
  }, []);

  const fetchGames = async () => {
    try {
      const [myRes, playingRes] = await Promise.all([
        api.get('/bingo/my-games'),
        api.get('/bingo/playing'),
      ]);
      setMyGames(myRes.data.games);
      setPlayingGames(playingRes.data.games);
    } catch (error) {
      toast.error(t('dashboard.error.load'));
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    setJoining(true);
    try {
      const res = await api.get(`/bingo/join/${code}`);
      toast.success(t('dashboard.joined', { title: res.data.game.title }));
      setJoinModalOpen(false);
      setJoinCode('');
      navigate(`/play/${res.data.game._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || t('dashboard.error.join'));
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <div className="loading-inline"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">{t('dashboard.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setJoinModalOpen(true)}>
            {t('dashboard.joinExisting')}
          </button>
          <Link to="/create" className="btn btn-primary">
            {t('dashboard.createNew')}
          </Link>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'my-games' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-games')}
        >
          {t('dashboard.myGames')} ({myGames.length})
        </button>
        <button
          className={`tab ${activeTab === 'playing' ? 'active' : ''}`}
          onClick={() => setActiveTab('playing')}
        >
          {t('dashboard.playing')} ({playingGames.length})
        </button>
      </div>

      {activeTab === 'my-games' && (
        <>
          {myGames.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <h3 className="empty-title">{t('dashboard.noGames.title')}</h3>
              <p className="empty-text">{t('dashboard.noGames.text')}</p>
              <Link to="/create" className="btn btn-primary">
                {t('dashboard.createFirst')}
              </Link>
            </div>
          ) : (
            <div className="games-grid">
              {myGames.map(game => (
                <Link
                  key={game._id}
                  to={`/manage/${game._id}`}
                  className="game-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 className="game-card-title">{game.title}</h3>
                    <span className={`game-card-badge ${game.isActive ? 'badge-active' : 'badge-inactive'}`}>
                      {game.isActive ? t('dashboard.active') : t('dashboard.ended')}
                    </span>
                  </div>
                  {game.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      {game.description}
                    </p>
                  )}
                  <div className="game-card-meta">
                    <span>📐 {game.rows}×{game.cols}</span>
                    <span>👥 {game.players?.length || 0} {t('dashboard.players')}</span>
                  </div>
                  {game.players && game.players.length > 0 && (
                    <div className="game-card-players">
                      <div className="avatar-stack">
                        {game.players.slice(0, 5).map(player => (
                          <Avatar key={player._id} user={player} size="sm" />
                        ))}
                      </div>
                      {game.players.length > 5 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {t('dashboard.morePlayers', { n: game.players.length - 5 })}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'playing' && (
        <>
          {playingGames.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎮</div>
              <h3 className="empty-title">{t('dashboard.noPlaying.title')}</h3>
              <p className="empty-text">{t('dashboard.noPlaying.text')}</p>
              <button className="btn btn-primary" onClick={() => setJoinModalOpen(true)}>
                {t('dashboard.joinGame')}
              </button>
            </div>
          ) : (
            <div className="games-grid">
              {playingGames.map(game => (
                <Link
                  key={game._id}
                  to={`/play/${game._id}`}
                  className="game-card"
                >
                  <h3 className="game-card-title">{game.title}</h3>
                  {game.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      {game.description}
                    </p>
                  )}
                  <div className="game-card-meta">
                    <span>📐 {game.rows}×{game.cols}</span>
                    <span>👥 {game.players?.length || 0} {t('dashboard.players')}</span>
                    <span>{t('dashboard.by', { name: game.creator?.name })}</span>
                  </div>
                  {game.players && game.players.length > 0 && (
                    <div className="game-card-players">
                      <div className="avatar-stack">
                        {game.players.slice(0, 5).map(player => (
                          <Avatar key={player._id} user={player} size="sm" />
                        ))}
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Join Game Modal */}
      {joinModalOpen && (
        <div className="modal-overlay" onClick={() => setJoinModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('dashboard.joinModal.title')}</h3>
              <button className="modal-close" onClick={() => setJoinModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleJoin}>
              <div className="modal-body">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {t('dashboard.joinModal.description')}
                </p>
                <div className="form-group">
                  <label className="form-label">{t('dashboard.joinModal.label')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('dashboard.joinModal.placeholder')}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    autoFocus
                    required
                    maxLength={20}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setJoinModalOpen(false)}>
                  {t('dashboard.joinModal.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={!joinCode.trim() || joining}>
                  {joining ? t('dashboard.joinModal.joining') : t('dashboard.joinModal.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
