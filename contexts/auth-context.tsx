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
  const [isLoading, setIsLoading] = useState(true); // 항상 true로 시작
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
        return null; // 사용자 정보 가져오기 실패 시 null 반환
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
        return userToSet; // 성공 시 사용자 정보 반환
      } else {
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
        return null; // 사용자 데이터 없을 시 null 반환
      }
    } else {
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
      return null; // Supabase 사용자 없을 시 null 반환
    }
  }, []);

  useEffect(() => {
    // console.log("AuthProvider: useEffect (auth listener) - Setting up.");
    setIsLoading(true); // 리스너 설정 시작 시 로딩 true
    let isMounted = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        // console.log(`AuthProvider: onAuthStateChange - Event: ${event}, Session User: ${session?.user?.id || 'null'}`);

        if (event === 'INITIAL_SESSION') {
          // console.log("AuthProvider: Event INITIAL_SESSION - Updating profile and setting loading false.");
          await updateUserProfile(session?.user || null);
          setIsLoading(false);
        } else if (event === 'SIGNED_IN') {
          // console.log("AuthProvider: Event SIGNED_IN - Updating profile and setting loading false.");
          await updateUserProfile(session!.user); // SIGNED_IN이면 session.user가 항상 존재
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          // console.log("AuthProvider: Event SIGNED_OUT - Clearing profile, setting loading false, and redirecting.");
          await updateUserProfile(null);
          setIsLoading(false);
          if (pathname !== '/login') {
            router.push('/login');
          }
        } else if (event === 'USER_UPDATED') {
          // console.log("AuthProvider: Event USER_UPDATED - Updating profile.");
          if (session?.user) await updateUserProfile(session.user);
          // USER_UPDATED는 백그라운드 업데이트이므로 isLoading을 변경하지 않음
        }
        // TOKEN_REFRESHED, PASSWORD_RECOVERY 등은 isLoading에 직접적인 영향을 주지 않음
      }
    );
    
    // getSession을 호출하여 INITIAL_SESSION이 느리거나 발생하지 않는 경우 보완
    // 하지만 onAuthStateChange가 INITIAL_SESSION을 잘 처리한다면 이 부분은 생략해도 됨
    // Supabase 클라이언트 초기화 시 onAuthStateChange는 INITIAL_SESSION을 발생시켜야 함
    // 만약 이 부분을 추가한다면, onAuthStateChange의 INITIAL_SESSION과 중복 처리되지 않도록 주의 필요
    /*
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      console.log("AuthProvider: getSession() check - Current user from getSession:", session?.user?.id);
      // 이미 onAuthStateChange에서 INITIAL_SESSION으로 처리되었다면 user, isLoading 상태가 업데이트 되었을 것임.
      // 만약 isLoading이 여전히 true라면 (INITIAL_SESSION이 아직 발생 안했다는 의미), 여기서 처리
      if (isLoading) {
        await updateUserProfile(session?.user || null);
        setIsLoading(false);
        console.log("AuthProvider: getSession() fallback - setIsLoading(false).");
      }
    }).catch(error => {
      if (!isMounted) return;
      console.error("AuthProvider: getSession() error:", error.message);
      setIsLoading(false);
    });
    */

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
      // console.log("AuthProvider: useEffect (auth listener) - Unsubscribed.");
    };
  }, [updateUserProfile, router, pathname]); // pathname 의존성 유지


  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: { session: supabaseSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error("AuthProvider: login - Error:", signInError.message);
        setIsLoading(false);
        return false;
      }
      if (!supabaseSession?.user) {
        console.error("AuthProvider: login - No session/user after successful signIn.");
        setIsLoading(false);
        return false;
      }
      // 성공 시 onAuthStateChange가 SIGNED_IN 이벤트를 처리하고 거기서 setIsLoading(false) 호출
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
      console.error("AuthProvider: logout - Error:", error.message);
      await updateUserProfile(null); 
      setIsLoading(false);
      if (pathname !== '/login') router.push('/login');
      // throw error; // 에러를 throw할 수도 있으나, 로그아웃 실패 시 UI 처리가 더 중요할 수 있음
    }
    // 성공 시 onAuthStateChange가 SIGNED_OUT 처리 (user null, isLoading false, 페이지 이동)
  };

  const hasPermission = useCallback((pageId: string, permissionType: "view" | "edit"): boolean => {
    if (isLoading || !user) return false; 
    if (user.role?.trim() === "admin") return true; 
    const permission = user.permissions.find((p: Permission) => p.page === pageId);
    return !!(permission && permission[permissionType]);
  }, [user, isLoading]);

  const authContextValue = React.useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    hasPermission,
  }), [user, isLoading, hasPermission, login, logout]); // login, logout도 useCallback으로 감싸면 더 좋음

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}
