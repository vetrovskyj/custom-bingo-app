import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const { token } = useParams();
  const { t } = useLang();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error(t('reset.passwordMismatch'));
    }
    if (password.length < 6) {
      return toast.error(t('reset.passwordShort'));
    }
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      toast.success(t('reset.success'));
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || t('reset.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">{t('reset.title')}</h1>
        <p className="auth-subtitle">{t('reset.subtitle')}</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('reset.newPassword')}</label>
            <input
              type="password"
              className="form-input"
              placeholder={t('reset.newPasswordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('reset.confirmPassword')}</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop: '1rem' }}
          >
            {loading ? t('reset.resetting') : t('reset.submit')}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">{t('reset.back')}</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
