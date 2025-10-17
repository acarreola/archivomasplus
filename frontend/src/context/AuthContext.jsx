import { createContext, useState, useContext, useEffect } from 'react';

// Ensure a single AuthContext instance even if the module is evaluated twice
const getGlobalThis = () => (typeof window !== 'undefined' ? window : globalThis);
const __global = getGlobalThis();
if (!__global.__ARCHIVO_AUTH_CONTEXT__) {
  __global.__ARCHIVO_AUTH_CONTEXT__ = createContext(null);
}
const AuthContext = __global.__ARCHIVO_AUTH_CONTEXT__;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/me/', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Check if the response indicates authenticated user
        if (data.authenticated === false) {
          setUser(null);
        } else {
          setUser(data);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await fetch('http://localhost:8000/api/auth/logout/', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
  };

  const hasPermission = (permissionKey) => {
    if (!user || !user.perfil_info || !user.perfil_info.permisos) {
      return false;
    }
    return user.perfil_info.permisos[permissionKey] === true;
  };

  const getPerfilColor = () => {
    if (!user || !user.perfil_info) {
      return '#3b82f6';
    }
    return user.perfil_info.color;
  };

  const getPerfilNombre = () => {
    if (!user || !user.perfil_info) {
      return 'Usuario';
    }
    return user.perfil_info.nombre;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    getPerfilColor,
    getPerfilNombre,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Return a safe default so the app doesn't crash; also surface a console error once.
    if (typeof console !== 'undefined' && !__global.__AUTH_HOOK_WARNED__) {
      console.error('[Auth] useAuth called outside of AuthProvider or context mismatch. Falling back to default.');
      __global.__AUTH_HOOK_WARNED__ = true;
    }
    return {
      user: null,
      loading: true,
      login: () => {},
      logout: () => {},
      hasPermission: () => false,
      getPerfilColor: () => '#3b82f6',
      getPerfilNombre: () => 'Usuario',
      isAuthenticated: false,
    };
  }
  return context;
}

// Optional named export (useful for debugging/visibility)
export { AuthContext };
