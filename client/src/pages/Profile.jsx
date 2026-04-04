import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import api from '../api/axios';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { t } = useLang();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error(t('profile.fileTooLarge'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (fileInputRef.current?.files[0]) {
        formData.append('profilePicture', fileInputRef.current.files[0]);
      }

      const res = await api.put('/auth/profile', formData);

      updateUser(res.data.user);
      setPreview(null);
      toast.success(t('profile.success'));
    } catch (error) {
      toast.error(t('profile.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">{t('profile.title')}</h1>
        <p className="auth-subtitle">{t('profile.subtitle')}</p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <div className="avatar avatar-xl">
                  <img src={preview} alt="Preview" />
                </div>
              ) : (
                <Avatar user={user} size="xl" />
              )}
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: 'var(--accent)',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                border: '2px solid var(--bg-secondary)',
              }}>
                📷
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('profile.fullName')}</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('profile.email')}</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.6 }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {t('profile.emailNote')}
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={saving}
            style={{ marginTop: '0.5rem' }}
          >
            {saving ? t('profile.saving') : t('profile.save')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
