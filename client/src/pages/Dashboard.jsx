import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [myGames, setMyGames] = useState([]);
  const [playingGames, setPlayingGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-games');

  useEffect(() => {
    fetchGames();
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
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-inline"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Manage your bingo games or play others</p>
        </div>
        <Link to="/create" className="btn btn-primary">
          + Create New Bingo
        </Link>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'my-games' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-games')}
        >
          My Games ({myGames.length})
        </button>
        <button
          className={`tab ${activeTab === 'playing' ? 'active' : ''}`}
          onClick={() => setActiveTab('playing')}
        >
          Playing ({playingGames.length})
        </button>
      </div>

      {activeTab === 'my-games' && (
        <>
          {myGames.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <h3 className="empty-title">No games yet</h3>
              <p className="empty-text">
                Create your first bingo game and invite friends to play!
              </p>
              <Link to="/create" className="btn btn-primary">
                Create Your First Bingo
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
                      {game.isActive ? 'Active' : 'Ended'}
                    </span>
                  </div>
                  {game.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      {game.description}
                    </p>
                  )}
                  <div className="game-card-meta">
                    <span>📐 {game.rows}×{game.cols}</span>
                    <span>👥 {game.players?.length || 0} players</span>
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
                          +{game.players.length - 5} more
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
              <h3 className="empty-title">Not playing any games</h3>
              <p className="empty-text">
                Join a bingo game using an invite link from a friend!
              </p>
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
                    <span>👥 {game.players?.length || 0} players</span>
                    <span>by {game.creator?.name}</span>
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
    </div>
  );
};

export default Dashboard;
