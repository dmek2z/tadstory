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

  // console.log(`AuthProvider Render: isLoading=${isLoading}, user=${user?.id || 'null'}`);

  const updateUserProfile = useCallback(async (supabaseUser: SupabaseAuthUser | null) => {
    // console.log("AuthProvider: updateUserProfile - START", supabaseUser?.id || 'null');
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
      // console.log("AuthProvider: updateUserProfile - No Supabase user, clearing user state.");
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
    }
    // console.log("AuthProvider: updateUserProfile - END");
  }, []);

  useEffect(() => {
    // console.log("AuthProvider: useEffect for auth listener - START. Pathname:", pathname);
    // 초기 로딩 상태를 true로 설정하는 것을 리스너 등록 직전으로 옮김.
    // 이렇게 하면 초기 getSession 호출 전에 리스너가 먼저 반응할 기회를 줌.
    
    let isMounted = true;
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        console.log(`AuthProvider: onAuthStateChange - Event: ${event}, User: ${session?.user?.id || 'null'}`);

        // 모든 중요한 세션 변경 이벤트 시작 시 로딩 상태로 설정
        if (['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT'].includes(event)) {
          setIsLoading(true);
          // console.log(`AuthProvider: onAuthStateChange - setIsLoading(true) for ${event}`);
        }

        await updateUserProfile(session?.user || null);

        if (event === 'SIGNED_OUT') {
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
        
        // 사용자 프로필 업데이트 후, 중요한 세션 이벤트가 완료되면 로딩 상태 해제
        if (['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT'].includes(event)) {
          setIsLoading(false);
          // console.log(`AuthProvider: onAuthStateChange - setIsLoading(false) after ${event}`);
        }
      }
    );
    
    // 초기 세션 정보를 가져와서 상태를 설정합니다.
    // onAuthStateChange가 INITIAL_SESSION을 발생시키지만, 만약을 위해 getSession도 호출.
    // 단, getSession의 결과로 isLoading을 직접 false로 바꾸는 것은 onAuthStateChange와 충돌 가능성이 있으므로
    // updateUserProfile만 호출하고, isLoading은 onAuthStateChange가 INITIAL_SESSION을 통해 관리하도록 함.
    // 그러나, 만약 onAuthStateChange가 INITIAL_SESSION을 늦게 발생시키거나 발생시키지 않는다면
    // isLoading이 계속 true로 남아있을 수 있습니다.
    // 이 문제를 해결하기 위해, getSession 후 user 상태에 따라 isLoading을 직접 제어하는 로직을 추가합니다.
    async function initializeAuth() {
      // console.log("AuthProvider: initializeAuth - Calling getSession.");
      setIsLoading(true); // 명시적으로 로딩 시작
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error) {
        console.error("AuthProvider: initializeAuth - Error in getSession:", error.message);
        await updateUserProfile(null);
      } else {
        // console.log("AuthProvider: initializeAuth - getSession successful, session user:", session?.user?.id || 'null');
        await updateUserProfile(session?.user || null);
      }
      // onAuthStateChange가 INITIAL_SESSION을 통해 isLoading을 false로 설정할 때까지 기다리지 않고,
      // getSession의 결과를 바탕으로 바로 isLoading 상태를 설정합니다.
      // 이렇게 하면 새로고침 시 "Loading application..."에서 멈추는 현상을 해결하는 데 도움이 될 수 있습니다.
      setIsLoading(false);
      // console.log("AuthProvider: initializeAuth - setIsLoading(false). User set to:", session?.user?.id || 'null');
    }

    initializeAuth();

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
      // console.log("AuthProvider: useEffect for auth listener - UNMOUNTED.");
    };
  }, [updateUserProfile, router, pathname]); // 의존성 배열에 router, pathname 추가


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
      // 성공 시 onAuthStateChange가 SIGNED_IN 이벤트를 처리하여 user 상태를 업데이트하고,
      // 해당 핸들러 내에서 setIsLoading(false)가 호출됩니다.
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
      // throw error; // 에러를 반드시 throw할 필요는 없을 수 있음
    }
    // 성공 시 onAuthStateChange가 SIGNED_OUT 처리 (user null, isLoading false, 페이지 이동)
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
  }), [user, isLoading, hasPermission, login, logout]); // login, logout 함수 참조가 변경되지 않도록 useCallback 적용 고려

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}
