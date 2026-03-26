import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const JoinGame = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const joinGame = async () => {
      try {
        const res = await api.get(`/bingo/join/${inviteCode}`);
        toast.success(`Joined "${res.data.game.title}"!`);
        navigate(`/play/${res.data.game._id}`);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to join game');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    joinGame();
  }, [inviteCode, navigate]);

  if (loading) {
    return (
      <div className="loading-screen" style={{ height: 'calc(100vh - 100px)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Joining game...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default JoinGame;
