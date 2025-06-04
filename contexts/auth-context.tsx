"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SupabaseClient, Session, AuthChangeEvent, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';

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
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  hasPermission: (pageId: string, permissionType: "view" | "edit") => boolean
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
  if (typeof document === 'undefined') return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
};

const eraseCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = name+'=; Max-Age=-99999999; path=/';
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 최초 로딩 상태는 항상 true
  const router = useRouter();
  const pathname = usePathname();

  // console.log("AuthProvider rendered. isLoading:", isLoading, "User:", user?.id || 'null');


  const updateUserProfile = useCallback(async (supabaseUser: SupabaseAuthUser | null) => {
    // console.log("AuthProvider: updateUserProfile START - Supabase User ID:", supabaseUser?.id || 'null');
    if (supabaseUser) {
      const { data: userData, error: userFetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (userFetchError) {
        console.error("AuthProvider: updateUserProfile - Error fetching user data:", userFetchError.message);
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
      } else if (userData) {
        const userToSet: User = {
          id: userData.id,
          email: userData.email || supabaseUser.email || '',
          name: userData.name || supabaseUser.email || 'Unknown User',
          role: userData.role || 'guest',
          permissions: userData.permissions || []
        };
        setUser(userToSet);
        localStorage.setItem('user', JSON.stringify(userToSet));
        setCookie('currentUser', userToSet.id, 1);
        // console.log("AuthProvider: updateUserProfile - User profile SET:", userToSet.id);
      } else {
        // console.warn("AuthProvider: updateUserProfile - No user data found for ID:", supabaseUser.id);
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
      }
    } else {
      // console.log("AuthProvider: updateUserProfile - No Supabase user provided, clearing user state.");
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
    }
    // console.log("AuthProvider: updateUserProfile END");
  }, []);

  useEffect(() => {
    // console.log("AuthProvider: Main useEffect - START. Pathname:", pathname);
    setIsLoading(true);
    // console.log("AuthProvider: Main useEffect - setIsLoading(true) at start.");
    let isMounted = true;
    let initialSessionResolved = false; // INITIAL_SESSION 이벤트 처리 여부

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        // console.log(`AuthProvider: onAuthStateChange - Event: ${event}, User: ${session?.user?.id || 'null'}, Current isLoading: ${isLoading}`);

        await updateUserProfile(session?.user || null);

        if (event === 'INITIAL_SESSION') {
          initialSessionResolved = true;
          setIsLoading(false);
          // console.log("AuthProvider: onAuthStateChange - INITIAL_SESSION processed, setIsLoading(false).");
        } else if (event === 'SIGNED_IN') {
          setIsLoading(false);
          // console.log("AuthProvider: onAuthStateChange - SIGNED_IN processed, setIsLoading(false).");
        } else if (event === 'SIGNED_OUT') {
          setIsLoading(false);
          // console.log("AuthProvider: onAuthStateChange - SIGNED_OUT processed, setIsLoading(false).");
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
        // USER_UPDATED, TOKEN_REFRESHED 등은 isLoading 상태를 변경하지 않음
      }
    );

    // onAuthStateChange가 INITIAL_SESSION을 놓치는 경우를 대비하여 getSession도 호출
    // 하지만 onAuthStateChange가 안정적으로 INITIAL_SESSION을 발생시킨다면 이 부분이 없어도 됨
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      // console.log("AuthProvider: getSession() - Result:", session?.user?.id || 'null');
      if (!initialSessionResolved) { // onAuthStateChange의 INITIAL_SESSION이 아직 처리되지 않았다면
        // console.log("AuthProvider: getSession() - INITIAL_SESSION not yet processed by listener.");
        await updateUserProfile(session?.user || null);
        setIsLoading(false);
        // console.log("AuthProvider: getSession() - Fallback, setIsLoading(false).");
      }
    }).catch(error => {
      if (!isMounted) return;
      console.error("AuthProvider: getSession() - Error:", error.message);
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
      setIsLoading(false);
      // console.log("AuthProvider: getSession() - Error, setIsLoading(false).");
    });
    

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
      // console.log("AuthProvider: Main useEffect - UNMOUNTED.");
    };
  }, [updateUserProfile, router, pathname]);


  const login = async (email: string, password: string): Promise<boolean> => {
    // console.log("AuthProvider: login - START. Email:", email);
    setIsLoading(true);
    // console.log("AuthProvider: login - setIsLoading(true).");
    try {
      const { data: { session: supabaseSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error("AuthProvider: login - Error signing in:", signInError.message);
        setIsLoading(false);
        // console.log("AuthProvider: login - Error, setIsLoading(false).");
        return false;
      }
      if (!supabaseSession?.user) {
        console.error("AuthProvider: login - No session or user after successful signIn.");
        setIsLoading(false);
        // console.log("AuthProvider: login - No session/user, setIsLoading(false).");
        return false;
      }
      // onAuthStateChange가 SIGNED_IN을 처리하고 user 상태 업데이트 및 isLoading=false로 설정
      // console.log("AuthProvider: login - signInWithPassword successful. User ID:", supabaseSession.user.id);
      return true;
    } catch (error: any) {
      console.error('AuthProvider: login - Overall error:', error.message);
      setIsLoading(false);
      // console.log("AuthProvider: login - Catch error, setIsLoading(false).");
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    // console.log("AuthProvider: logout - START.");
    setIsLoading(true);
    // console.log("AuthProvider: logout - setIsLoading(true).");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("AuthProvider: logout - Error signing out:", error.message);
      await updateUserProfile(null); 
      setIsLoading(false);
      // console.log("AuthProvider: logout - Error, updateUserProfile(null) & setIsLoading(false).");
      if (pathname !== '/login') router.push('/login');
      throw error; 
    }
    // 성공 시 onAuthStateChange가 SIGNED_OUT 처리
    // console.log("AuthProvider: logout - signOut successful. Waiting for onAuthStateChange.");
  };

  const hasPermission = useCallback((pageId: string, permissionType: "view" | "edit"): boolean => {
    if (!user) return false; 
    if (user.role?.trim() === "admin") return true; 
    const permission = user.permissions.find((p: Permission) => p.page === pageId);
    return !!(permission && permission[permissionType]);
  }, [user]);

  const authContextValue = React.useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    hasPermission,
  }), [user, isLoading, hasPermission, login, logout]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}
