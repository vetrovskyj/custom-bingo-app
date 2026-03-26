import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import CreateBingo from './pages/CreateBingo';
import EditBingo from './pages/EditBingo';
import PlayBingo from './pages/PlayBingo';
import ManageBingo from './pages/ManageBingo';
import JoinGame from './pages/JoinGame';
import Profile from './pages/Profile';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return !user ? children : <Navigate to="/dashboard" />;
};

const JoinRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { inviteCode } = useParams();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (user) return children;
  // Store invite code so we can redirect after login/register
  sessionStorage.setItem('pendingInviteCode', inviteCode);
  return <Navigate to="/register" />;
};

const AppRoutes = () => {
  return (
    <>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/create" element={<PrivateRoute><CreateBingo /></PrivateRoute>} />
          <Route path="/edit/:id" element={<PrivateRoute><EditBingo /></PrivateRoute>} />
          <Route path="/play/:id" element={<PrivateRoute><PlayBingo /></PrivateRoute>} />
          <Route path="/manage/:id" element={<PrivateRoute><ManageBingo /></PrivateRoute>} />
          <Route path="/join/:inviteCode" element={<JoinRoute><JoinGame /></JoinRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              background: '#1e1e2e',
              color: '#cdd6f4',
              border: '1px solid rgba(108, 99, 255, 0.2)',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
