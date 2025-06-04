"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SupabaseClient, Session, AuthChangeEvent, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation'; // usePathname 추가

// 사용자 권한 타입
export interface Permission {
  page: string
  view: boolean
  edit: boolean
}

// 사용자 타입 (애플리케이션 내부용)
export interface User {
  id: string
  email: string
  name: string
  role: string
  permissions: Permission[]
}

// 인증 컨텍스트 타입
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
    // console.log(`AuthProvider: Cookie set: ${name}=${value}`); // 배포 시에는 로깅 줄이기
  }
};

const eraseCookie = (name: string) => {
  if (typeof document !== 'undefined') {
    document.cookie = name+'=; Max-Age=-99999999; path=/';
    // console.log(`AuthProvider: Cookie erased: ${name}`); // 배포 시에는 로깅 줄이기
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // console.log("AuthProvider: Component rendered"); // 배포 시에는 로깅 줄이기
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 초기에는 항상 로딩 중
  const router = useRouter();
  const pathname = usePathname(); // 현재 경로를 가져오기 위해 추가

  const updateUserProfile = useCallback(async (supabaseUser: SupabaseAuthUser | null) => {
    if (supabaseUser) {
      // console.log("AuthProvider: updateUserProfile - Fetching user data for ID:", supabaseUser.id); // 배포 시에는 로깅 줄이기
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
        // console.log("AuthProvider: updateUserProfile - User profile set:", userToSet); // 배포 시에는 로깅 줄이기
      } else {
        console.warn("AuthProvider: updateUserProfile - No user data in 'users' table for ID:", supabaseUser.id);
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
      }
    } else {
      // console.log("AuthProvider: updateUserProfile - No Supabase user provided, clearing user state."); // 배포 시에는 로깅 줄이기
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
    }
  }, []);

  useEffect(() => {
    // console.log("AuthProvider: useEffect for auth state change listener setup. Current Pathname:", pathname); // 배포 시에는 로깅 줄이기
    setIsLoading(true);
    let getSessionCalled = false; // getSession 호출 여부 플래그

    const handleInitialAuth = async () => {
        if (getSessionCalled) return;
        getSessionCalled = true;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            // console.log("AuthProvider: Initial session check (getSession) result:", session); // 배포 시에는 로깅 줄이기
            if (session?.user) {
                await updateUserProfile(session.user);
            } else {
                setUser(null);
                eraseCookie('currentUser');
                localStorage.removeItem('user');
            }
            // INITIAL_SESSION 이벤트가 발생하지 않는 경우를 대비하여,
            // onAuthStateChange 리스너의 INITIAL_SESSION에서 setIsLoading(false)를 주로 처리하지만,
            // 여기서도 세션이 명확히 없을 경우 로딩을 종료할 수 있습니다.
            // 단, onAuthStateChange가 항상 INITIAL_SESSION을 발생시킨다면 이 부분은 중복될 수 있습니다.
            // 지금은 onAuthStateChange에 로딩 종료를 맡깁니다.
        } catch (error: any) {
            console.error("AuthProvider: Error during initial getSession:", error.message);
            setUser(null);
            eraseCookie('currentUser');
            localStorage.removeItem('user');
            setIsLoading(false); // getSession에서 에러 발생 시 명시적으로 로딩 종료
        }
    };

    handleInitialAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      // console.log(`AuthProvider: onAuthStateChange - Event: ${event}, User: ${session?.user?.id || 'null'}`); // 배포 시에는 로깅 줄이기
      
      // 로딩 상태는 중요한 이벤트(SIGNED_IN, SIGNED_OUT, INITIAL_SESSION)에 대해서만 true로 설정
      const criticalEvents: AuthChangeEvent[] = ['SIGNED_IN', 'SIGNED_OUT', 'INITIAL_SESSION'];
      if (criticalEvents.includes(event)) {
          setIsLoading(true);
          // console.log("AuthProvider: onAuthStateChange - setIsLoading(true) for event:", event); // 배포 시에는 로깅 줄이기
      }

      await updateUserProfile(session?.user || null);

      if (event === 'SIGNED_OUT') {
        // console.log("AuthProvider: onAuthStateChange - SIGNED_OUT event received."); // 배포 시에는 로깅 줄이기
        // updateUserProfile(null)이 이미 user, cookie, localStorage를 정리함
        if (pathname !== '/login') { // 현재 경로가 /login이 아니면 이동
            router.push('/login');
            // console.log("AuthProvider: Redirected to /login after SIGNED_OUT."); // 배포 시에는 로깅 줄이기
        }
      }
      
      // 로딩 상태는 중요한 이벤트 처리 후 false로 설정
      if (criticalEvents.includes(event) || (event === 'INITIAL_SESSION' && !session?.user && getSessionCalled)) {
        setIsLoading(false);
        // console.log("AuthProvider: onAuthStateChange - setIsLoading(false) after event:", event); // 배포 시에는 로깅 줄이기
      }
    });

    return () => {
      // console.log("AuthProvider: Unsubscribing from onAuthStateChange listener."); // 배포 시에는 로깅 줄이기
      authListener?.subscription.unsubscribe();
    };
  }, [updateUserProfile, router, pathname]);


  const login = async (email: string, password: string): Promise<boolean> => {
    // console.log("AuthProvider: login function called with email:", email); // 배포 시에는 로깅 줄이기
    // setIsLoading(true); // onAuthStateChange가 SIGNED_IN 처리 시 isLoading을 관리

    try {
      const { data: { session: supabaseSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      // console.log("AuthProvider: login - signInWithPassword response", { supabaseSession, signInError }); // 배포 시에는 로깅 줄이기

      if (signInError) {
        console.error("AuthProvider: login - Error signing in:", signInError.message);
        return false;
      }
      if (!supabaseSession?.user) {
        console.error("AuthProvider: login - No session or user after successful signIn (unexpected).");
        return false;
      }
      
      // console.log("AuthProvider: login - signInWithPassword successful. User ID:", supabaseSession.user.id); // 배포 시에는 로깅 줄이기
      return true;

    } catch (error: any) {
      console.error('AuthProvider: login - Overall error:', error.message);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    // console.log("AuthProvider: logout function called"); // 배포 시에는 로깅 줄이기
    // setIsLoading(true); // onAuthStateChange가 SIGNED_OUT 처리 시 isLoading을 관리

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("AuthProvider: logout - Error signing out:", error.message);
      // 에러가 발생해도 onAuthStateChange가 호출되지 않을 수 있으므로, 수동으로 상태 정리 및 리디렉션
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
      setIsLoading(false); // 로그아웃 실패 시에도 로딩은 해제
      if (pathname !== '/login') {
        router.push('/login'); 
      }
      throw error;
    }
    // 성공 시, onAuthStateChange 리스너가 'SIGNED_OUT' 이벤트를 처리.
    // console.log("AuthProvider: logout - supabase.auth.signOut() successful. Waiting for onAuthStateChange."); // 배포 시에는 로깅 줄이기
  };

  const hasPermission = useCallback((pageId: string, permissionType: "view" | "edit"): boolean => {
    if (isLoading || !user) { 
      return false; 
    }
    if (user.role && user.role.trim() === "admin") {
      return true; 
    }
    const permission = user.permissions.find((p: Permission) => p.page === pageId);
    return permission ? permission[permissionType] : false;
  }, [user, isLoading]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}
