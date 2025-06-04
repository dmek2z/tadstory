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
  isLoading: boolean // 이 상태가 핵심입니다.
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
  const [isLoading, setIsLoading] = useState(true); // 최초 로딩 상태는 true
  const router = useRouter();
  const pathname = usePathname();

  const updateUserProfile = useCallback(async (supabaseUser: SupabaseAuthUser | null) => {
    // console.log("AuthProvider: updateUserProfile called with Supabase user ID:", supabaseUser?.id || 'null');
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
      } else {
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
      }
    } else {
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
    }
  }, []);

  useEffect(() => {
    // console.log("AuthProvider: useEffect (auth listener) - Mounting. Initial isLoading:", isLoading);
    let isMounted = true;

    // onAuthStateChange 리스너 설정
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        // console.log(`AuthProvider: onAuthStateChange - Event: ${event}, User ID: ${session?.user?.id || 'null'}`);

        // INITIAL_SESSION, SIGNED_IN, SIGNED_OUT 이벤트 발생 시 사용자 프로필 업데이트 및 로딩 상태 종료
        if (event === 'INITIAL_SESSION') {
          await updateUserProfile(session?.user || null);
          setIsLoading(false); // 초기 세션 처리 완료 후 로딩 종료
          // console.log("AuthProvider: INITIAL_SESSION processed, setIsLoading(false).");
        } else if (event === 'SIGNED_IN') {
          await updateUserProfile(session!.user); // SIGNED_IN이면 session.user가 항상 존재
          setIsLoading(false); // 로그인 완료 후 로딩 종료
          // console.log("AuthProvider: SIGNED_IN processed, setIsLoading(false).");
        } else if (event === 'SIGNED_OUT') {
          await updateUserProfile(null);
          setIsLoading(false); // 로그아웃 완료 후 로딩 종료
          if (pathname !== '/login') {
            router.push('/login');
          }
          // console.log("AuthProvider: SIGNED_OUT processed, setIsLoading(false).");
        } else if (event === 'USER_UPDATED') {
          if (session?.user) await updateUserProfile(session.user);
          // USER_UPDATED는 백그라운드 업데이트로 간주, isLoading을 변경하지 않을 수 있음
        }
        // TOKEN_REFRESHED 등의 이벤트는 isLoading에 영향을 주지 않음
      }
    );
    
    // 컴포넌트 언마운트 시 리스너 해제
    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
      // console.log("AuthProvider: useEffect (auth listener) - Unsubscribed.");
    };
  }, [updateUserProfile, router, pathname]); // 의존성 배열 유지


  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true); // 로그인 시도 시작 시 로딩 상태 true
    try {
      const { data: { session: supabaseSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error("AuthProvider: login - Error:", signInError.message);
        setIsLoading(false); // 실패 시 로딩 상태 false
        return false;
      }
      if (!supabaseSession?.user) {
        console.error("AuthProvider: login - No session/user after successful signIn.");
        setIsLoading(false); // 실패 시 로딩 상태 false
        return false;
      }
      // 성공 시 onAuthStateChange가 SIGNED_IN 이벤트를 처리하여 user 상태를 업데이트하고,
      // 해당 핸들러 내에서 setIsLoading(false)가 호출될 것입니다.
      return true;
    } catch (error: any) {
      console.error('AuthProvider: login - Overall error:', error.message);
      setIsLoading(false); // 예외 발생 시 로딩 상태 false
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true); // 로그아웃 시도 시작 시 로딩 상태 true
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("AuthProvider: logout - Error:", error.message);
      await updateUserProfile(null); 
      setIsLoading(false); // 실패 시에도 로딩 상태 false 및 정리
      if (pathname !== '/login') router.push('/login');
      throw error; 
    }
    // 성공 시 onAuthStateChange가 SIGNED_OUT 이벤트를 처리하고 거기서 setIsLoading(false) 호출
  };

  const hasPermission = useCallback((pageId: string, permissionType: "view" | "edit"): boolean => {
    if (!user) return false; 
    if (user.role?.trim() === "admin") return true; 
    const permission = user.permissions.find((p: Permission) => p.page === pageId);
    return !!(permission && permission[permissionType]);
  }, [user]); // isLoading 의존성 제거 (이미 !user 조건으로 커버)

  const authContextValue = React.useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    hasPermission,
  }), [user, isLoading, hasPermission]); // login, logout은 안정적이므로 의존성에서 제외 가능 (useCallback 사용 권장)

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}
