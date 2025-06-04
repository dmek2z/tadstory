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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const updateUserProfile = useCallback(async (supabaseUser: SupabaseAuthUser | null) => {
    console.log("AuthProvider: updateUserProfile START - Supabase User ID:", supabaseUser?.id || 'null');
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
        console.log("AuthProvider: updateUserProfile - User profile SET:", userToSet.id);
      } else {
        console.warn("AuthProvider: updateUserProfile - No user data found for ID:", supabaseUser.id);
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
    console.log("AuthProvider: updateUserProfile END");
  }, []);

  useEffect(() => {
    console.log("AuthProvider: useEffect (listener & initial load) - START. Pathname:", pathname);
    setIsLoading(true); // 무조건 true로 시작
    console.log("AuthProvider: useEffect - setIsLoading(true) at start.");
    let isMounted = true;

    // 1. 초기 세션 확인 (가장 먼저 실행)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      console.log("AuthProvider: getSession() - Result:", session?.user?.id || 'null');
      await updateUserProfile(session?.user || null);
      // getSession 완료 후 onAuthStateChange의 INITIAL_SESSION 이벤트가 거의 바로 발생하므로,
      // 로딩 종료는 onAuthStateChange의 INITIAL_SESSION에 맡긴다.
      // 만약 INITIAL_SESSION이 확실히 발생하지 않는다면 여기서 로딩을 종료해야 한다.
      // 여기서는 onAuthStateChange를 신뢰하고 기다린다.
    }).catch(error => {
      if (!isMounted) return;
      console.error("AuthProvider: getSession() - Error:", error.message);
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
      setIsLoading(false); // getSession 에러 시에는 확실히 로딩 종료
      console.log("AuthProvider: getSession() - Error, setIsLoading(false).");
    });

    // 2. 인증 상태 변경 리스너
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        console.log(`AuthProvider: onAuthStateChange - Event: ${event}, Session User: ${session?.user?.id || 'null'}`);

        // 모든 이벤트에 대해 사용자 프로필 업데이트 시도
        await updateUserProfile(session?.user || null);

        if (event === 'INITIAL_SESSION') {
          setIsLoading(false); // 초기 세션 로드 완료, 로딩 종료
          console.log("AuthProvider: onAuthStateChange - INITIAL_SESSION processed, setIsLoading(false).");
        } else if (event === 'SIGNED_IN') {
          setIsLoading(false); // 로그인 완료, 로딩 종료
          console.log("AuthProvider: onAuthStateChange - SIGNED_IN processed, setIsLoading(false).");
        } else if (event === 'SIGNED_OUT') {
          setIsLoading(false); // 로그아웃 완료, 로딩 종료
          console.log("AuthProvider: onAuthStateChange - SIGNED_OUT processed, setIsLoading(false).");
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
        // USER_UPDATED, TOKEN_REFRESHED 등은 isLoading 상태를 직접 변경하지 않을 수 있음
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
      console.log("AuthProvider: useEffect (listener & initial load) - UNMOUNTED.");
    };
  }, [updateUserProfile, router, pathname]);


  const login = async (email: string, password: string): Promise<boolean> => {
    console.log("AuthProvider: login - START. Email:", email);
    setIsLoading(true);
    console.log("AuthProvider: login - setIsLoading(true).");
    try {
      const { data: { session: supabaseSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error("AuthProvider: login - Error signing in:", signInError.message);
        setIsLoading(false);
        console.log("AuthProvider: login - Error, setIsLoading(false).");
        return false;
      }
      if (!supabaseSession?.user) {
        console.error("AuthProvider: login - No session or user after successful signIn.");
        setIsLoading(false);
        console.log("AuthProvider: login - No session/user, setIsLoading(false).");
        return false;
      }
      // 성공 시 onAuthStateChange가 SIGNED_IN 이벤트를 처리하고 user 상태를 업데이트하며,
      // 해당 핸들러 내에서 setIsLoading(false)가 호출될 것입니다.
      console.log("AuthProvider: login - signInWithPassword successful. User ID:", supabaseSession.user.id);
      return true;
    } catch (error: any) {
      console.error('AuthProvider: login - Overall error:', error.message);
      setIsLoading(false);
      console.log("AuthProvider: login - Catch error, setIsLoading(false).");
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    console.log("AuthProvider: logout - START.");
    setIsLoading(true);
    console.log("AuthProvider: logout - setIsLoading(true).");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("AuthProvider: logout - Error signing out:", error.message);
      // 에러 발생 시에도 클라이언트 상태 정리 및 리디렉션 시도
      await updateUserProfile(null); 
      setIsLoading(false);
      console.log("AuthProvider: logout - Error, updateUserProfile(null) & setIsLoading(false).");
      if (pathname !== '/login') router.push('/login');
      throw error; 
    }
    // 성공 시 onAuthStateChange가 SIGNED_OUT 이벤트 처리 (user null, isLoading false, 페이지 이동)
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
