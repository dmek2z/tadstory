"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

// 사용자 권한 타입
export interface Permission {
  page: string
  view: boolean
  edit: boolean
}

// 사용자 타입
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
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

// 인증 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 인증 컨텍스트 훅
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function to set a cookie
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

// Helper function to erase a cookie
const eraseCookie = (name: string) => {
  if (typeof document !== 'undefined') {
    document.cookie = name+'=; Max-Age=-99999999; path=/';
    console.log(`AuthProvider: Cookie erased: ${name}`);
  }
};

// 인증 프로바이더 컴포넌트
export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log("AuthProvider: Component rendered");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 앱 시작 시 항상 로딩 중
  const router = useRouter();

  useEffect(() => {
    console.log("AuthProvider: useEffect setup initiated");
    // 초기 isLoading은 true로 유지됩니다.

    const processUserSession = async (sessionUser: any | null, eventType?: string) => {
      console.log(`AuthProvider: processUserSession called for event: ${eventType || 'INITIAL'}, sessionUser ID: ${sessionUser?.id}`);
      if (sessionUser) {
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (userFetchError) {
          console.error("AuthProvider: Error fetching user data for processUserSession:", userFetchError);
          setUser(null);
          eraseCookie('currentUser');
          localStorage.removeItem('user');
        } else if (userData) {
          const userToSet: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name || sessionUser.email,
            role: userData.role,
            permissions: userData.permissions || []
          };
          setUser(userToSet);
          localStorage.setItem('user', JSON.stringify(userToSet));
          setCookie('currentUser', userToSet.id, 1);
          console.log("AuthProvider: User data processed and set for processUserSession:", userToSet);
        } else {
          console.warn("AuthProvider: No user data in 'users' table for ID (processUserSession):", sessionUser.id);
          setUser(null);
          eraseCookie('currentUser');
          localStorage.removeItem('user');
        }
      } else {
        console.log("AuthProvider: No active session for processUserSession.");
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
      }
    };

    // 1. 초기 세션 확인 (앱 로드 시)
    // onAuthStateChange의 INITIAL_SESSION 이벤트가 이 역할을 대신하므로, 중복 호출을 피하기 위해 getSession을 직접 호출하지 않을 수 있습니다.
    // 또는, getSession을 호출하고 onAuthStateChange의 INITIAL_SESSION 처리를 조건부로 만들 수 있습니다.
    // 여기서는 onAuthStateChange에 더 의존하는 방식으로 변경합니다.

    // 2. 인증 상태 변경 리스너 설정
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`AuthProvider: onAuthStateChange - Event: ${event}, Session User ID: ${session?.user?.id}`);
      
      // 모든 인증 이벤트 처리 시작 시 로딩 상태로 설정 (INITIAL_SESSION 포함)
      setIsLoading(true);
      console.log("AuthProvider: onAuthStateChange - setIsLoading(true)");

      await processUserSession(session?.user || null, event);

      if (event === 'SIGNED_OUT') {
        console.log("AuthProvider: onAuthStateChange - SIGNED_OUT, redirecting to /login");
        router.push('/login');
      }
      
      // 모든 이벤트 처리 후 로딩 완료
      setIsLoading(false);
      console.log("AuthProvider: onAuthStateChange - setIsLoading(false)");
    });

    // 초기 로딩 상태를 해제하는 로직은 onAuthStateChange의 INITIAL_SESSION 이벤트 핸들러로 이동합니다.
    // 만약 INITIAL_SESSION 이벤트가 발생하지 않는 환경(매우 드묾)이 걱정된다면,
    // 짧은 시간 후 강제로 setIsLoading(false)를 호출하는 타임아웃을 추가할 수 있지만, 권장되지는 않습니다.
    // supabase.auth.getSession().then(...) 부분은 제거하고 onAuthStateChange의 INITIAL_SESSION에 의존합니다.

    return () => {
      console.log("AuthProvider: Unsubscribing from onAuthStateChange.");
      authListener?.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // router 의존성 유지 (SIGNED_OUT 시 push)


  const login = async (email: string, password: string) => {
    console.log("AuthProvider: login function called with email:", email);
    setIsLoading(true); // 로그인 시도 시작 시 로딩 상태로

    try {
      const { data: { session: supabaseSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      console.log("AuthProvider: login - signInWithPassword response", { supabaseSession, signInError });

      if (signInError) {
        console.error("AuthProvider: login - Error signing in:", signInError);
        setIsLoading(false);
        throw signInError;
      }

      if (!supabaseSession?.user) {
        console.error("AuthProvider: login - No session or user after successful signInWithPassword.");
        setIsLoading(false);
        throw new Error("Login failed: No user session created.");
      }

      // onAuthStateChange가 SIGNED_IN 이벤트를 처리하고 user 상태 및 isLoading을 업데이트합니다.
      console.log("AuthProvider: login - signInWithPassword successful. User ID:", supabaseSession.user.id);
      // 여기서 router.push를 호출하면 onAuthStateChange가 새 페이지에서 상태를 설정합니다.
      router.push('/dashboard');
      // setIsLoading(false)는 onAuthStateChange에서 처리됩니다.

    } catch (error) {
      console.error('AuthProvider: login - Overall error:', error);
      if (isLoading) setIsLoading(false); // 예외 발생 시 로딩 상태가 true로 남아있으면 해제
      throw error;
    }
    console.log("AuthProvider: login function finished.");
  };

  const logout = async () => {
    console.log("AuthProvider: logout function called");
    setIsLoading(true); // 로그아웃 시도 시작 시 로딩 상태로
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthProvider: logout - Error signing out:", error);
        setIsLoading(false); // signOut 에러 시 로딩 해제
        throw error;
      }
      // onAuthStateChange가 SIGNED_OUT 이벤트를 처리하고 user 상태를 null로, isLoading을 false로 설정하며,
      // '/login'으로 리디렉션합니다.
      console.log("AuthProvider: logout - supabase.auth.signOut() successful.");
      // router.push('/login'); // onAuthStateChange에서 처리
    } catch (error) {
      console.error('AuthProvider: logout - Overall error:', error);
      if(isLoading) setIsLoading(false); // 예외 발생 시 로딩 상태가 true로 남아있으면 해제
    }
    console.log("AuthProvider: logout function finished.");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
