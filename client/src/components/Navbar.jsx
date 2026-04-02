import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import Avatar from './Avatar';
import { useState } from 'react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to={user ? '/dashboard' : '/login'} className="navbar-brand">
          <span className="navbar-logo">🎯</span>
          <span className="navbar-title">Bingo</span>
        </Link>

        <div className="navbar-actions">
          <div className="lang-switcher">
            <button
              className={`lang-btn ${lang === 'cs' ? 'active' : ''}`}
              onClick={() => setLang('cs')}
            >CZ</button>
            <span className="lang-divider">|</span>
            <button
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >EN</button>
          </div>

          {user && (
            <>
              <Link to="/create" className="btn btn-primary btn-sm navbar-create">
                {t('nav.newBingo')}
              </Link>

              <div className="navbar-profile">
                <button
                  className="navbar-avatar-btn"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <Avatar user={user} size="sm" />
                </button>

                {menuOpen && (
                  <>
                    <div className="navbar-menu-backdrop" onClick={() => setMenuOpen(false)} />
                    <div className="navbar-menu">
                      <div className="navbar-menu-header">
                        <Avatar user={user} size="md" />
                        <div>
                          <div className="navbar-menu-name">{user.name}</div>
                          <div className="navbar-menu-email">{user.email}</div>
                        </div>
                      </div>
                      <div className="navbar-menu-divider" />
                      <Link to="/dashboard" className="navbar-menu-item" onClick={() => setMenuOpen(false)}>
                        {t('nav.dashboard')}
                      </Link>
                      <Link to="/profile" className="navbar-menu-item" onClick={() => setMenuOpen(false)}>
                        {t('nav.profile')}
                      </Link>
                      <div className="navbar-menu-divider" />
                      <button className="navbar-menu-item navbar-menu-logout" onClick={handleLogout}>
                        {t('nav.logout')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: rgba(15, 15, 26, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          z-index: 100;
        }
        .navbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
        }
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-primary);
          font-weight: 700;
          font-size: 1.1rem;
        }
        .navbar-brand:hover {
          color: var(--text-primary);
        }
        .navbar-logo {
          font-size: 1.5rem;
        }
        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .lang-switcher {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 0.2rem 0.5rem;
        }
        .lang-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          padding: 0.15rem 0.35rem;
          border-radius: 12px;
          transition: var(--transition);
          font-family: var(--font);
          letter-spacing: 0.03em;
        }
        .lang-btn:hover {
          color: var(--text-primary);
        }
        .lang-btn.active {
          background: var(--accent);
          color: white;
        }
        .lang-divider {
          color: var(--border);
          font-size: 0.7rem;
          user-select: none;
        }
        .navbar-profile {
          position: relative;
        }
        .navbar-avatar-btn {
          background: none;
          border: 2px solid transparent;
          border-radius: 50%;
          cursor: pointer;
          padding: 2px;
          transition: var(--transition);
        }
        .navbar-avatar-btn:hover {
          border-color: var(--accent);
        }
        .navbar-menu-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 99;
        }
        .navbar-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          min-width: 240px;
          box-shadow: var(--shadow-lg);
          z-index: 100;
          animation: modalIn 0.15s ease;
        }
        .navbar-menu-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
        }
        .navbar-menu-name {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .navbar-menu-email {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .navbar-menu-divider {
          height: 1px;
          background: var(--border);
        }
        .navbar-menu-item {
          display: block;
          width: 100%;
          padding: 0.75rem 1rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
          transition: var(--transition);
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
          font-family: var(--font);
        }
        .navbar-menu-item:hover {
          background: var(--accent-light);
          color: var(--text-primary);
        }
        .navbar-menu-logout {
          color: var(--danger);
        }
        @media (max-width: 480px) {
          .navbar-create {
            display: none;
          }
          .navbar-title {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
