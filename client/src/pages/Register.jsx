import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import toast from 'react-hot-toast';

const Register = () => {
  const { register } = useAuth();
  const { t } = useLang();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t('register.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      toast.error(t('register.passwordShort'));
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      toast.success(t('register.success'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('register.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">{t('register.title')}</h1>
        <p className="auth-subtitle">{t('register.subtitle')}</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('register.fullName')}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t('register.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('login.email')}</label>
            <input
              type="email"
              className="form-input"
              placeholder={t('register.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('login.password')}</label>
            <input
              type="password"
              className="form-input"
              placeholder={t('register.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('register.confirmPassword')}</label>
            <input
              type="password"
              className="form-input"
              placeholder={t('register.confirmPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? t('register.creating') : t('register.submit')}
          </button>
        </form>

        <p className="auth-footer">
          {t('register.hasAccount')} <Link to="/login">{t('register.signIn')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
