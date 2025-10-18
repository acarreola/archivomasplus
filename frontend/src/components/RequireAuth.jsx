import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEBUG_LOGS = false;

function RequireAuth({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();

  if (DEBUG_LOGS) console.log('🛡️ RequireAuth - loading:', loading, 'user:', user);

  if (loading) {
    if (DEBUG_LOGS) console.log('⏳ Still loading...');
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (DEBUG_LOGS) console.log('❌ No user - redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (DEBUG_LOGS) console.log('✅ User authenticated - rendering children');

  // If requireAdmin is true, check for puede_acceder_administracion permission
  if (requireAdmin && !user.perfil_info?.permisos?.puede_acceder_administracion) {
    if (DEBUG_LOGS) console.log('⛔ No admin permission - redirecting to home');
    return <Navigate to="/" replace />;
  }

  return children;
}

export default RequireAuth;
