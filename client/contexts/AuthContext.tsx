import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, otp: string, isRegistration?: boolean) => Promise<boolean>;
  loginWithPassword: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<{ success: boolean; demoOtp?: string; error?: string }>;
  sendLoginOtp: (email: string) => Promise<{ success: boolean; demoOtp?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { supabase } from '../../lib/supabase';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // Check Supabase session first
      const { data: supaUserData } = await supabase.auth.getUser();
      if (supaUserData?.user) {
        const supaUser = supaUserData.user;
        const mappedUser: User = {
          id: supaUser.id,
          email: supaUser.email || '',
          name: (supaUser.user_metadata && (supaUser.user_metadata.full_name || supaUser.user_metadata.name)) || undefined,
          isAdmin: false
        };
        setUser(mappedUser);
        localStorage.setItem('authUser', JSON.stringify(mappedUser));
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('authUser');

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {}
      }

      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem('authUser', JSON.stringify(data.user));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const mappedUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: (session.user.user_metadata && (session.user.user_metadata.full_name || session.user.user_metadata.name)) || undefined,
          isAdmin: false
        };
        setUser(mappedUser);
        localStorage.setItem('authUser', JSON.stringify(mappedUser));
      } else {
        // keep existing local auth if any
      }
    });
    return () => { sub?.subscription?.unsubscribe?.(); };
  }, []);

  const sendLoginOtp = async (email: string): Promise<{ success: boolean; demoOtp?: string }> => {
    try {
      // Use the real email OTP service for all users
      const response = await fetch('/api/auth/send-otp-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      // Handle demo OTP when email service is not configured
      if (response.ok && data.demoOTP) {
        console.log(`🔐 DEMO OTP: ${data.demoOTP}`);
        alert(`🔐 DEMO MODE\n\nEmail service not configured.\nYour OTP is: ${data.demoOTP}\n\nUse this OTP to login.`);
        return { success: true, demoOtp: data.demoOTP };
      }

      // If email was sent successfully
      if (response.ok) {
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      console.error('Send OTP failed:', error);
      return { success: false };
    }
  };

  const loginWithPassword = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUser', JSON.stringify(data.user));
        setUser(data.user);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Password login failed:', error);
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<void> => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const register = async (name: string, email: string, phone: string, password: string): Promise<{ success: boolean; demoOtp?: string; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, phone, password })
      });

      // Check if response has a body before trying to parse JSON
      let data: any = {};
      try {
        if (response.headers.get('content-type')?.includes('application/json')) {
          data = await response.json();
        }
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        if (!response.ok) {
          return { success: false, error: `Server error: ${response.status} ${response.statusText}` };
        }
      }

      // Handle demo OTP when email service is not configured
      if (response.ok && data.demoOTP) {
        console.log(`🔐 DEMO OTP: ${data.demoOTP}`);
        alert(`🔐 DEMO MODE\n\nEmail service not configured.\nYour Registration OTP is: ${data.demoOTP}\n\nUse this OTP to verify your account.`);
        return { success: true, demoOtp: data.demoOTP };
      }

      // If email was sent successfully
      if (response.ok) {
        return { success: true };
      }

      // Return the actual error message from server
      return { success: false, error: data.message || `Registration failed: ${response.status} ${response.statusText}` };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  };

  const login = async (email: string, otp: string, isRegistration = false): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp, isRegistration })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Login failed:', errorData.message);
        return false;
      }

      const data = await response.json();

      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUser', JSON.stringify(data.user));
        setUser(data.user);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithPassword,
    loginWithGoogle,
    register,
    sendLoginOtp,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
