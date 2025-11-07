import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthContext: Initializing...');
    console.log('Current URL:', window.location.href);
    console.log('Has hash params:', window.location.hash.length > 0);

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email || 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        console.log('=== Auth state changed ===');
        console.log('Event:', event);
        console.log('User:', session?.user?.email || 'No user');
        console.log('Session valid:', !!session);

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN' && session) {
          console.log('User signed in successfully!');
          if (window.location.hash.includes('access_token')) {
            console.log('Cleaning OAuth hash from URL and redirecting');
            window.location.href = window.location.origin;
          }
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        persistSession: rememberMe,
      },
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = window.location.origin;
    console.log('Google OAuth redirect URL:', redirectUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error && error.message !== 'Session from session_id claim in JWT does not exist') {
        console.error('Sign out error:', error);
      }
    } catch (error: any) {
      if (error.message !== 'Auth session missing!' &&
          error.message !== 'Session from session_id claim in JWT does not exist') {
        console.error('Failed to sign out:', error);
      }
    } finally {
      setUser(null);
      setSession(null);
      localStorage.removeItem('supabase.auth.token');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, signIn, signUp, signInWithGoogle, signOut, loading }}>
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
