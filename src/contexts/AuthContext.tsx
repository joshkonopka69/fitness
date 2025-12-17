import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_CALLBACK_URL = Linking.createURL('/auth-callback');
const RESET_PASSWORD_URL = Linking.createURL('/reset-password');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const shouldHandleAuthCallback = (url: string) => {
      const lowerUrl = url.toLowerCase();
      const hasCode = lowerUrl.includes('code=');
      const hasAccessToken = lowerUrl.includes('access_token=');
      const isRecovery = lowerUrl.includes('type=recovery');
      const matchesAuthRoutes =
        lowerUrl.includes('auth-callback') || lowerUrl.includes('reset-password');

      return matchesAuthRoutes && (hasCode || hasAccessToken || isRecovery);
    };

    const handleDeepLink = async (event: { url: string }) => {
      if (!event.url || !shouldHandleAuthCallback(event.url)) {
        return;
      }

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(event.url);
        if (error) {
          console.error('Error exchanging code for session:', error);
          return;
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch (exchangeError) {
        console.error('Unexpected deep link handling error:', exchangeError);
      }
    };

    const bootstrapDeepLink = async () => {
      const url = await Linking.getInitialURL();
      if (url && shouldHandleAuthCallback(url)) {
        await handleDeepLink({ url });
      }
    };

    bootstrapDeepLink();
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: AUTH_CALLBACK_URL,
        data: {
          name,
        },
      },
    });
    if (error) throw error;
    
    console.log('User signed up successfully:', data.user?.id);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_PASSWORD_URL,
    });
    if (error) throw error;
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
