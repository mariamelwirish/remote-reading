import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  // Don't render anything until we know whether a session exists
  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  // If the user is authenticated but has a different role, send them to their own dashboard
  if (role && user.role !== role) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
}
