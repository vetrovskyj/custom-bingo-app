import { useAuth } from '../context/AuthContext';

const Avatar = ({ user, size = 'md', className = '' }) => {
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getColor = (name) => {
    if (!name) return '#6C63FF';
    const colors = [
      '#6C63FF', '#FF6B6B', '#4ECDC4', '#45B7D1',
      '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E9', '#F1948A',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      className={`avatar avatar-${size} ${className}`}
      style={!user?.profilePicture ? { backgroundColor: getColor(user?.name) } : {}}
      title={user?.name || 'Unknown'}
    >
      {user?.profilePicture ? (
        <img src={user.profilePicture} alt={user.name} />
      ) : (
        getInitials(user?.name)
      )}
    </div>
  );
};

export default Avatar;
