"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export interface Permission {
  page: string
  view: boolean
  edit: boolean
}

export interface User {
  id: string
  email: string
  name: string
  role: string
  permissions: Permission[]
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean> // 반환 타입 boolean으로 명시
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const setCookie = (name: string, value: string, days: number) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  if (typeof document !== 'undefined') {
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
    console.log(`AuthProvider: Cookie set: ${name}=${value}`);
  }
};

const eraseCookie = (name: string) => {
  if (typeof document !== 'undefined') {
    document.cookie = name+'=; Max-Age=-99999999; path=/';
    console.log(`AuthProvider: Cookie erased: ${name}`);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log("AuthProvider: Component rendered");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const updateUserProfile = async (supabaseUser: any | null) => {
    if (supabaseUser) {
      console.log("AuthProvider: updateUserProfile - Fetching user data for ID:", supabaseUser.id);
      const { data: userData, error: userFetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (userFetchError) {
        console.error("AuthProvider: updateUserProfile - Error fetching user data:", userFetchError);
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
      } else if (userData) {
        const userToSet: User = {
          id: userData.id,
          email: userData.email,
          name: userData.name || supabaseUser.email,
          role: userData.role,
          permissions: userData.permissions || []
        };
        setUser(userToSet);
        localStorage.setItem('user', JSON.stringify(userToSet));
        setCookie('currentUser', userToSet.id, 1);
        console.log("AuthProvider: updateUserProfile - User profile set:", userToSet);
      } else {
        console.warn("AuthProvider: updateUserProfile - No user data in 'users' table for ID:", supabaseUser.id);
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
      }
    } else {
      console.log("AuthProvider: updateUserProfile - No Supabase user provided, clearing user state.");
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
    }
  };

  useEffect(() => {
    console.log("AuthProvider: useEffect for auth state change listener setup.");
    setIsLoading(true);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
        console.log("AuthProvider: Initial session check (getSession)", session);
        if (session?.user) {
            await updateUserProfile(session.user);
        } else {
            setUser(null);
            eraseCookie('currentUser');
            localStorage.removeItem('user');
        }
        // onAuthStateChange의 INITIAL_SESSION 이벤트에서 setIsLoading(false)를 최종적으로 호출
    }).catch(error => {
        console.error("AuthProvider: Error during initial getSession:", error);
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
        setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`AuthProvider: onAuthStateChange - Event: ${event}, User: ${session?.user?.id || 'null'}`);
      
      // USER_UPDATED, PASSWORD_RECOVERY 등 백그라운드성 이벤트는 UI 로딩 상태를 변경하지 않음
      if (event !== 'USER_UPDATED' && event !== 'PASSWORD_RECOVERY') {
          setIsLoading(true);
          console.log("AuthProvider: onAuthStateChange - setIsLoading(true) for event:", event);
      }

      await updateUserProfile(session?.user || null);

      if (event === 'SIGNED_OUT') {
        console.log("AuthProvider: onAuthStateChange - SIGNED_OUT, redirecting to /login");
        router.push('/login'); // 로그아웃 시 로그인 페이지로 강제 이동
      }
      
      if (event !== 'USER_UPDATED' && event !== 'PASSWORD_RECOVERY') {
        setIsLoading(false);
        console.log("AuthProvider: onAuthStateChange - setIsLoading(false) after event:", event);
      }
    });

    return () => {
      console.log("AuthProvider: Unsubscribing from onAuthStateChange listener.");
      authListener?.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const login = async (email: string, password: string): Promise<boolean> => {
    console.log("AuthProvider: login function called with email:", email);
    // setIsLoading(true); // 이 함수 내에서는 isLoading을 직접 제어하지 않음

    try {
      const { data: { session: supabaseSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      console.log("AuthProvider: login - signInWithPassword response", { supabaseSession, signInError });

      if (signInError) {
        console.error("AuthProvider: login - Error signing in:", signInError);
        return false; // 실패 시 false 반환
      }

      if (!supabaseSession?.user) {
        console.error("AuthProvider: login - No session or user after successful signIn (unexpected).");
        return false; // 실패 시 false 반환
      }
      
      console.log("AuthProvider: login - signInWithPassword successful. User ID:", supabaseSession.user.id);
      // onAuthStateChange가 SIGNED_IN 이벤트를 처리하여 currentUser와 isLoading을 업데이트할 것임
      return true; // 성공 시 true 반환

    } catch (error) {
      console.error('AuthProvider: login - Overall error:', error);
      return false; // 에러 발생 시 false 반환
    }
  };

  const logout = async () => {
    console.log("AuthProvider: logout function called");
    // setIsLoading(true); // onAuthStateChange가 SIGNED_OUT 이벤트에서 처리

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthProvider: logout - Error signing out:", error);
        throw error;
      }
      // onAuthStateChange가 SIGNED_OUT 이벤트를 처리
      console.log("AuthProvider: logout - supabase.auth.signOut() successful. Waiting for onAuthStateChange.");
    } catch (error) {
      console.error('AuthProvider: logout - Overall error:', error);
      // setIsLoading(false)도 onAuthStateChange에서 처리
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
