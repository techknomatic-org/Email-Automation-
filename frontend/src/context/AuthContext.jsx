import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, logoutUser, getCurrentUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('openoutreach_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('openoutreach_token') || null;
  });

  const [loading, setLoading] = useState(true);

  // Validate session token on startup
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('openoutreach_token');
      if (storedToken) {
        try {
          const profile = await getCurrentUser();
          if (profile && profile.id) {
            setUser(profile);
            localStorage.setItem('openoutreach_user', JSON.stringify(profile));
          }
        } catch (err) {
          console.warn('[AUTH] Token validation failed:', err);
          // If token expired, clear local storage
          localStorage.removeItem('openoutreach_token');
          localStorage.removeItem('openoutreach_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    if (res && res.access_token) {
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('openoutreach_token', res.access_token);
      localStorage.setItem('openoutreach_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error('Invalid login response from server');
  };

  const signup = async ({ fullName, email, password, role }) => {
    const res = await registerUser({
      full_name: fullName,
      email,
      password,
      role: role || 'Growth Lead'
    });
    if (res && res.access_token) {
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('openoutreach_token', res.access_token);
      localStorage.setItem('openoutreach_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error('Invalid registration response from server');
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn('[AUTH] Logout notification error:', err);
    } finally {
      localStorage.removeItem('openoutreach_token');
      localStorage.removeItem('openoutreach_user');
      setUser(null);
      setToken(null);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    signup,
    logout
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
