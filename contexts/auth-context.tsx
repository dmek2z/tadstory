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
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  if (typeof document !== 'undefined') {
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
  }
};

const eraseCookie = (name: string) => {
  if (typeof document !== 'undefined') {
    document.cookie = name+'=; Max-Age=-99999999; path=/';
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 초기에는 항상 로딩 중
  const router = useRouter();
  const pathname = usePathname();

  const updateUserProfile = useCallback(async (supabaseUser: SupabaseAuthUser | null) => {
    // console.log("AuthProvider: updateUserProfile called with Supabase user:", supabaseUser?.id || 'null'); // 로깅 추가
    if (supabaseUser) {
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
          email: userData.email || supabaseUser.email || '',
          name: userData.name || supabaseUser.email || 'Unknown User',
          role: userData.role || 'guest',
          permissions: userData.permissions || []
        };
        setUser(userToSet);
        localStorage.setItem('user', JSON.stringify(userToSet));
        setCookie('currentUser', userToSet.id, 1);
        // console.log("AuthProvider: updateUserProfile - User profile set:", userToSet); // 로깅 줄이기
      } else {
        // console.warn("AuthProvider: updateUserProfile - No user data for ID:", supabaseUser.id); // 로깅 줄이기
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
      }
    } else {
      // console.log("AuthProvider: updateUserProfile - No Supabase user, clearing user state."); // 로깅 줄이기
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
    }
  }, []);

  useEffect(() => {
    // console.log("AuthProvider: Mounting. Initializing auth state..."); // 로깅 줄이기
    setIsLoading(true);
    let isMounted = true; // 컴포넌트 마운트 상태 추적

    // 초기 세션 확인
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // console.log("AuthProvider: getSession result:", session); // 로깅 줄이기
      if (!isMounted) return; // 컴포넌트 언마운트 시 작업 중단

      if (session?.user) {
        await updateUserProfile(session.user);
      } else {
        await updateUserProfile(null); // 명시적으로 null 처리
      }
      // 중요: onAuthStateChange의 INITIAL_SESSION에서 최종적으로 isLoading을 false로 설정.
      // 여기서 바로 false로 설정하면 INITIAL_SESSION이 늦게 도착할 경우 상태가 꼬일 수 있음.
      // 만약 INITIAL_SESSION 이벤트가 확실히 발생하지 않는 경우가 있다면,
      // 여기서 (특히 !session 일때) setIsLoading(false)를 호출하는 것이 안전할 수 있음.
      // 하지만 Supabase auth helper는 보통 INITIAL_SESSION을 발생시킴.
    }).catch(error => {
      if (!isMounted) return;
      console.error("AuthProvider: Error during initial getSession:", error);
      setUser(null); // 에러 시 사용자 상태 초기화
      eraseCookie('currentUser');
      localStorage.removeItem('user');
      setIsLoading(false); // 에러 시 확실히 로딩 종료
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        // console.log(`AuthProvider: onAuthStateChange - Event: ${event}, User ID: ${session?.user?.id || 'null'}`); // 로깅 줄이기

        // 모든 주요 인증 이벤트 발생 시 일단 로딩 상태로 진입 고려
        // (SIGNED_IN, SIGNED_OUT, INITIAL_SESSION)
        // USER_UPDATED, TOKEN_REFRESHED 등은 백그라운드에서 조용히 처리될 수 있음
        const criticalEvents: AuthChangeEvent[] = ['SIGNED_IN', 'SIGNED_OUT', 'INITIAL_SESSION'];
        if (criticalEvents.includes(event)) {
          setIsLoading(true);
        }
        
        await updateUserProfile(session?.user || null);

        if (event === 'SIGNED_OUT') {
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
        
        // 중요: INITIAL_SESSION 이벤트 이후에는 로딩 상태를 false로 설정.
        // SIGNED_IN, SIGNED_OUT 이후에도 로딩 상태를 false로 설정.
        if (criticalEvents.includes(event)) {
            setIsLoading(false);
            // console.log(`AuthProvider: onAuthStateChange - Event ${event} processed, setIsLoading(false).`); // 로깅 줄이기
        }
      }
    );

    return () => {
      isMounted = false; // 컴포넌트 언마운트 시 플래그 설정
      // console.log("AuthProvider: Unsubscribing from onAuthStateChange listener."); // 로깅 줄이기
      authListener?.subscription.unsubscribe();
    };
  }, [updateUserProfile, router, pathname]);


  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: { session: supabaseSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (signInError) {
        console.error("AuthProvider: login - Error signing in:", signInError.message);
        setIsLoading(false);
        return false;
      }
      if (!supabaseSession?.user) {
        console.error("AuthProvider: login - No session or user after successful signIn.");
        setIsLoading(false);
        return false;
      }
      // onAuthStateChange가 SIGNED_IN 이벤트를 처리하고 isLoading을 false로 변경
      return true;
    } catch (error: any) {
      console.error('AuthProvider: login - Overall error:', error.message);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("AuthProvider: logout - Error signing out:", error.message);
      await updateUserProfile(null); // 로그아웃 실패 시에도 클라이언트 상태 초기화 시도
      setIsLoading(false);
      if (pathname !== '/login') router.push('/login'); // 강제 리디렉션
      throw error; 
    }
    // 성공 시 onAuthStateChange가 SIGNED_OUT을 처리 (user null, isLoading false, 페이지 이동)
  };

  const hasPermission = useCallback((pageId: string, permissionType: "view" | "edit"): boolean => {
    if (!user) { 
      return false; 
    }
    if (user.role && user.role.trim() === "admin") {
      return true; 
    }
    const permission = user.permissions.find((p: Permission) => p.page === pageId);
    return !!(permission && permission[permissionType]);
  }, [user]);

  const authContextValue = React.useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    hasPermission,
  }), [user, isLoading, hasPermission]); // login, logout 추가 (useCallback으로 감싸는 것이 이상적)

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}
