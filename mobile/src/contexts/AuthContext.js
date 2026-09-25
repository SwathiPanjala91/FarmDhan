import React, { createContext, useState, useContext, useEffect } from 'react';
import { api, setAuthToken } from '../services/api';
import { TRANSLATIONS } from '../constants/translations';
import { storage } from '../utils/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState('farmer'); // default role
  const [language, setLanguage] = useState('en'); // 'en', 'te', 'hi'
  const [voiceAutoPlay, setVoiceAutoPlay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Load persisted language, session, and role on app launch
  useEffect(() => {
    const loadStoredSession = async () => {
      try {
        const [savedLang, savedToken, savedUser, savedProfile, savedRole] = await Promise.all([
          storage.getItem('farmdhan_language'),
          storage.getItem('farmdhan_token'),
          storage.getItem('farmdhan_user'),
          storage.getItem('farmdhan_profile'),
          storage.getItem('farmdhan_role'),
        ]);

        if (savedLang && ['en', 'te', 'hi'].includes(savedLang)) {
          setLanguage(savedLang);
        }

        if (savedToken && savedUser) {
          try {
            const parsedUser = typeof savedUser === 'string' ? JSON.parse(savedUser) : savedUser;
            const parsedProfile = savedProfile ? (typeof savedProfile === 'string' ? JSON.parse(savedProfile) : savedProfile) : null;
            const userRole = parsedUser.role || savedRole || 'farmer';

            setAuthToken(savedToken);
            setUser(parsedUser);
            setProfile(parsedProfile);
            setRole(userRole);
            if (parsedUser.language) {
              setLanguage(parsedUser.language);
            }
          } catch (parseErr) {
            console.warn('[AuthContext] Error parsing saved user:', parseErr);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Failed to load persisted session:', err);
      }
    };
    loadStoredSession();
  }, []);

  // Centralized translation helper with interpolation support
  const t = (key, params = {}) => {
    const langDict = TRANSLATIONS[language] || TRANSLATIONS.en;
    let str = langDict[key] || TRANSLATIONS.en[key] || key;
    if (typeof str === 'string' && params && typeof params === 'object') {
      Object.keys(params).forEach((paramKey) => {
        str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
      });
    }
    return str;
  };

  const sendOTP = async (phone) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await api.auth.sendOTP(phone);
      return response;
    } catch (err) {
      const msg = err.data?.message || err.message || 'Failed to send OTP';
      setAuthError(msg);
      return {
        success: false,
        message: msg,
        cooldownRemaining: err.data?.cooldownRemaining,
        requiresRegistration: err.data?.requiresRegistration,
      };
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async (phone) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await api.auth.resendOTP(phone);
      return response;
    } catch (err) {
      const msg = err.data?.message || err.message || 'Failed to resend OTP';
      setAuthError(msg);
      return {
        success: false,
        message: msg,
        cooldownRemaining: err.data?.cooldownRemaining,
      };
    } finally {
      setLoading(false);
    }
  };

  const persistSession = async (userObj, profileObj, tokenStr) => {
    try {
      await Promise.all([
        storage.setItem('farmdhan_token', tokenStr),
        storage.setItem('farmdhan_user', JSON.stringify(userObj)),
        storage.setItem('farmdhan_role', userObj.role || 'farmer'),
        storage.setItem('farmdhan_profile', JSON.stringify(profileObj || null)),
      ]);
    } catch (e) {
      console.warn('[AuthContext] Failed to persist session:', e);
    }
  };

  const clearSession = async () => {
    try {
      await Promise.all([
        storage.removeItem('farmdhan_token'),
        storage.removeItem('farmdhan_user'),
        storage.removeItem('farmdhan_role'),
        storage.removeItem('farmdhan_profile'),
      ]);
    } catch (e) {
      console.warn('[AuthContext] Failed to clear session:', e);
    }
  };

  const loginWithOTP = async (phone, otp, selectedRole = 'farmer', name = '') => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await api.auth.verifyOTP(phone, otp, selectedRole, name, language);
      if (response.success) {
        setUser(response.user);
        setProfile(response.profile);
        setRole(response.user.role);
        if (response.user.language) {
          setLanguage(response.user.language);
        }
        setAuthToken(response.token);
        await persistSession(response.user, response.profile, response.token);
        return { success: true, user: response.user };
      }
    } catch (err) {
      const msg = err.data?.message || err.message || 'OTP verification failed';
      setAuthError(msg);
      return {
        success: false,
        message: msg,
        code: err.data?.code,
        attemptsRemaining: err.data?.attemptsRemaining,
      };
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await api.auth.login(phone, password);
      if (response.success) {
        setUser(response.user);
        setProfile(response.profile);
        setRole(response.user.role);
        if (response.user.language) {
          setLanguage(response.user.language);
        }
        setAuthToken(response.token);
        await persistSession(response.user, response.profile, response.token);
        return { success: true, user: response.user };
      }
      const msg = response.message || 'Login failed';
      setAuthError(msg);
      return { success: false, message: msg };
    } catch (err) {
      const msg = err.message || 'Login failed';
      console.warn('[AuthContext Login Error]:', err);
      setAuthError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await api.auth.register({
        ...userData,
        language,
      });
      if (response.success) {
        setUser(response.user);
        setProfile(response.profile);
        setRole(response.user.role);
        setAuthToken(response.token);
        await persistSession(response.user, response.profile, response.token);
        return { success: true, user: response.user };
      }
      const msg = response.message || 'Registration failed';
      setAuthError(msg);
      return { success: false, message: msg };
    } catch (err) {
      const msg = err.message || 'Registration failed';
      console.warn('[AuthContext Registration Error]:', err);
      setAuthError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setProfile(null);
    setAuthToken(null);
    setRole('farmer');
    await clearSession();
  };

  const switchLanguage = (newLang) => {
    if (['en', 'te', 'hi'].includes(newLang)) {
      setLanguage(newLang);
      storage.setItem('farmdhan_language', newLang).catch(() => {});
      if (user) {
        api.auth.updateProfile({ language: newLang }).catch(() => {});
      }
    }
  };

  const toggleVoiceAutoPlay = () => {
    setVoiceAutoPlay((prev) => !prev);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        language,
        voiceAutoPlay,
        toggleVoiceAutoPlay,
        loading,
        authError,
        login,
        sendOTP,
        resendOTP,
        loginWithOTP,
        register,
        logout,
        switchLanguage,
        setRole,
        t,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
