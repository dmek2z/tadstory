"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SupabaseClient, Session, AuthChangeEvent, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation'; // usePathname은 여전히 로그아웃 시 현재 경로 확인에 유용할 수 있습니다.

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
  const [isLoading, setIsLoading] = useState(true); // 초기 상태는 항상 true
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
        // console.warn("AuthProvider: updateUserProfile - No user data found for ID:", supabaseUser.id);
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
      }
    } else {
      // console.log("AuthProvider: updateUserProfile - No Supabase user, clearing user state.");
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
    }
  }, []); // 의존성 없음

  useEffect(() => {
    // console.log("AuthProvider: useEffect (auth listener) - Setting up. Current Pathname:", pathname);
    setIsLoading(true); // 리스너 설정 시작 시 로딩 true
    let isMounted = true;

    // 즉시 세션 확인 (페이지 로드/새로고침 시)
    // onAuthStateChange의 INITIAL_SESSION이 대부분의 경우 이를 처리하지만,
    // 만약을 위해 getSession도 호출하여 초기 상태를 빠르게 파악.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!isMounted) return;
        // console.log("AuthProvider: getSession() result:", session?.user?.id || 'null');
        if (session?.user) {
            await updateUserProfile(session.user);
        } else {
            await updateUserProfile(null);
        }
        // 여기서 setIsLoading(false)를 호출하지 않고, onAuthStateChange의 INITIAL_SESSION에 맡겨서
        // 로딩 상태 변경 시점을 일관되게 관리합니다.
        // 만약 onAuthStateChange가 INITIAL_SESSION을 확실히 발생시키지 않는다면 여기서 처리해야 합니다.
    }).catch(error => {
        if (!isMounted) return;
        console.error("AuthProvider: getSession() error:", error.message);
        setUser(null); // 에러 시 사용자 상태 초기화
        eraseCookie('currentUser');
        localStorage.removeItem('user');
        setIsLoading(false); // getSession에서 에러 발생 시 확실히 로딩 종료
    });
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        // console.log(`AuthProvider: onAuthStateChange - Event: ${event}, User ID: ${session?.user?.id || 'null'}`);

        // 세션 상태 변경이 있는 주요 이벤트에 대해서만 로딩 상태를 명시적으로 관리
        if (event === 'INITIAL_SESSION') {
          await updateUserProfile(session?.user || null);
          setIsLoading(false); // 초기 세션 처리가 완료되면 로딩 종료
          // console.log("AuthProvider: INITIAL_SESSION processed, setIsLoading(false).");
        } else if (event === 'SIGNED_IN') {
          await updateUserProfile(session!.user); // SIGNED_IN이면 session.user가 항상 존재
          setIsLoading(false);
          // console.log("AuthProvider: SIGNED_IN processed, setIsLoading(false).");
        } else if (event === 'SIGNED_OUT') {
          await updateUserProfile(null);
          setIsLoading(false);
          if (pathname !== '/login') {
            router.push('/login');
          }
          // console.log("AuthProvider: SIGNED_OUT processed, setIsLoading(false).");
        } else if (event === 'USER_UPDATED') {
          if (session?.user) await updateUserProfile(session.user);
          // USER_UPDATED는 백그라운드 업데이트이므로 isLoading을 변경하지 않을 수 있음
        }
        // TOKEN_REFRESHED, PASSWORD_RECOVERY 등은 isLoading에 직접적인 영향을 주지 않음
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
      // console.log("AuthProvider: useEffect (auth listener) - Unsubscribed.");
    };
  }, [updateUserProfile, router, pathname]); // pathname 의존성 유지 (로그아웃 시 현재 경로 확인)


  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true); // 로그인 시도 시작
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
      // 성공 시 onAuthStateChange가 SIGNED_IN 이벤트를 처리하여 user 상태를 업데이트하고,
      // 거기서 setIsLoading(false)가 호출될 것임.
      return true;
    } catch (error: any) {
      console.error('AuthProvider: login - Overall error:', error.message);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true); // 로그아웃 시도 시작
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("AuthProvider: logout - Error:", error.message);
      // 에러 발생 시에도 클라이언트 상태 정리 및 리디렉션 시도 (방어적 코드)
      await updateUserProfile(null); 
      setIsLoading(false);
      if (pathname !== '/login') router.push('/login');
      throw error; 
    }
    // 성공 시 onAuthStateChange가 SIGNED_OUT 이벤트 처리 (user null, isLoading false, 페이지 이동)
    // 여기서 직접 setIsLoading(false)를 하지 않는 이유는 onAuthStateChange에서 일관되게 처리하기 위함
  };

  const hasPermission = useCallback((pageId: string, permissionType: "view" | "edit"): boolean => {
    // isLoading이 true일 때는 user가 확정되지 않았으므로, 권한 없다고 판단 가능
    if (isLoading || !user) return false; 
    if (user.role?.trim() === "admin") return true; 
    const permission = user.permissions.find((p: Permission) => p.page === pageId);
    return !!(permission && permission[permissionType]);
  }, [user, isLoading]); // isLoading도 의존성에 추가하여 로딩 중일 때 정확한 권한 반환

  const authContextValue = React.useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    hasPermission,
  // login, logout은 useCallback으로 감싸는 것이 이상적이나, 현재 문제의 직접적 원인은 아닐 가능성
  // 일단 user, isLoading, hasPermission만 의존성으로 둠
  }), [user, isLoading, hasPermission]); 

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}
