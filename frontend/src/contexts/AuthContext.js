import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const AUTH_API_BASE = 'https://auth.ilouli.com';

/**
 * User tier constants
 */
export const USER_TIERS = {
  GUEST: 'guest',
  GENERAL: 'general',
  SUBSCRIBER: 'subscriber',
  FAMILY: 'family',
  ADMIN: 'admin',
};

/**
 * ilouli_token 쿠키에서 JWT 토큰 추출
 */
function getToken() {
  const match = document.cookie.match(/ilouli_token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * JWT base64url 디코딩 (UTF-8 한글 지원)
 */
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    // Handle UTF-8 multibyte characters (한글 등)
    const utf8 = decodeURIComponent(
      raw.split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(utf8);
  } catch {
    return null;
  }
}

/**
 * JWT 토큰 만료 여부 확인
 */
function isTokenExpired(token) {
  try {
    const payload = decodeJwtPayload(token);
    if (!payload) return true;
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewAsTier, setViewAsTierState] = useState(null);

  const loadUser = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setLoading(false);
      return;
    }

    if (isTokenExpired(token)) {
      setLoading(false);
      return;
    }

    // First: decode JWT locally for instant user info (avoids CORS issues)
    try {
      const payload = decodeJwtPayload(token);
      if (!payload) throw new Error('decode failed');
      const localUser = {
        id: payload.id || payload.sub,
        email: payload.email,
        name: payload.name || payload.nickname,
        nickname: payload.nickname || payload.name,
        tier: payload.tier || 'general',
        profileImage: payload.profileImage || payload.profile_image,
      };
      setUser(localUser);
    } catch (e) {
      console.warn('JWT decode failed:', e);
    }

    // Then: validate with auth API (non-blocking, updates if successful)
    try {
      const response = await fetch(`${AUTH_API_BASE}/api/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user || userData);
      }
    } catch (err) {
      // Auth API unreachable — JWT-decoded user still works
      console.warn('Auth API unreachable, using JWT payload:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const logout = useCallback(() => {
    document.cookie = 'ilouli_token=; domain=.ilouli.com; path=/; max-age=0';
    setUser(null);
    setViewAsTierState(null);
  }, []);

  const redirectToLogin = useCallback(() => {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `${AUTH_API_BASE}/login?returnUrl=${returnUrl}`;
  }, []);

  /**
   * Check if user has access based on allowed tiers
   * @param {string[]} allowedTiers - Array of tier strings that are allowed
   * @returns {boolean}
   */
  const hasAccess = useCallback((allowedTiers) => {
    if (!allowedTiers || allowedTiers.length === 0) return true;
    if (!user) return false;
    const effectiveTier = viewAsTier || user.tier;
    return allowedTiers.includes(effectiveTier);
  }, [user, viewAsTier]);

  /**
   * Set view-as tier (admin feature to preview as another tier)
   * @param {string} tier - Tier to view as
   */
  const setViewAs = useCallback((tier) => {
    if (user?.tier === USER_TIERS.ADMIN) {
      setViewAsTierState(tier);
    }
  }, [user]);

  /**
   * Reset view-as tier back to actual tier
   */
  const resetViewAs = useCallback(() => {
    setViewAsTierState(null);
  }, []);

  /**
   * Get the actual user tier (ignoring viewAs)
   * @returns {string|null}
   */
  const getActualTier = useCallback(() => {
    return user?.tier || null;
  }, [user]);

  const isAuthenticated = !!user;
  const isAdmin = user?.tier === 'admin';

  const value = {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    getToken,
    logout,
    redirectToLogin,
    refreshUser: loadUser,
    // NavigationBar compatibility
    hasAccess,
    viewAsTier,
    setViewAs,
    resetViewAs,
    getActualTier,
    USER_TIERS,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
