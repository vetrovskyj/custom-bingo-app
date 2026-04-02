import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success(t('forgot.success'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('forgot.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">{t('forgot.title')}</h1>
        <p className="auth-subtitle">
          {sent ? t('forgot.subtitle.sent') : t('forgot.subtitle.default')}
        </p>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('forgot.email')}</label>
              <input
                type="email"
                className="form-input"
                placeholder={t('register.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
              style={{ marginTop: '0.5rem' }}
            >
              {loading ? t('forgot.sending') : t('forgot.submit')}
            </button>
          </form>
        ) : (
          <div className="empty-state" style={{ padding: '2rem 0' }}>
            <div className="empty-icon">✉️</div>
            <p className="empty-text">{t('forgot.sentText')}</p>
            <button className="btn btn-secondary" onClick={() => setSent(false)}>
              {t('forgot.tryAnother')}
            </button>
          </div>
        )}

        <p className="auth-footer">
          {t('forgot.rememberPassword')} <Link to="/login">{t('forgot.signIn')}</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
