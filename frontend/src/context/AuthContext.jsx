import { createContext, useState, useEffect, useContext } from 'react';
import axios from '../utils/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await axios.get('/api/auth/me/');
      if (data && data.authenticated === false) {
        setUser(null);
      } else {
        setUser(data);
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
      await axios.post('/api/auth/logout/');
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
  if (context === undefined || context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

