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
    console.log(`Cookie set: ${name}=${value}`);
  }
};

// Helper function to erase a cookie
const eraseCookie = (name: string) => {
  if (typeof document !== 'undefined') {
    document.cookie = name+'=; Max-Age=-99999999; path=/';
    console.log(`Cookie erased: ${name}`);
  }
};

// 인증 프로바이더 컴포넌트
export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log("AuthProvider component rendered - Initial Log");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 초기 로딩 상태 true
  const router = useRouter();

  useEffect(() => {
    console.log("AuthProvider: useEffect for onAuthStateChange mounted.");
    setIsLoading(true); // 리스너 설정 시작 시 로딩 상태로

    const fetchAndSetUser = async (sessionUser: any) => {
      if (sessionUser) {
        console.log("onAuthStateChange/Initial: Session found, user ID:", sessionUser.id);
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUser.id)
          .single();
        console.log("onAuthStateChange/Initial: Fetched user data from 'users' table", { userData, userFetchError });

        if (userFetchError) {
          console.error("onAuthStateChange/Initial: Error fetching user data:", userFetchError);
          setUser(null);
          eraseCookie('currentUser');
          localStorage.removeItem('user');
        } else if (userData) {
          console.log("onAuthStateChange/Initial: User data found:", userData);
          const userToSet = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            permissions: userData.permissions || []
          };
          setUser(userToSet);
          localStorage.setItem('user', JSON.stringify(userToSet));
          setCookie('currentUser', userToSet.id, 1);
          console.log("onAuthStateChange/Initial: User state, localStorage, and cookie set:", userToSet);
        } else {
          console.warn("onAuthStateChange/Initial: No user data found for ID:", sessionUser.id);
          setUser(null);
          eraseCookie('currentUser');
          localStorage.removeItem('user');
        }
      } else {
        console.log("onAuthStateChange/Initial: No active session/user.");
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
      }
      setIsLoading(false); // 사용자 정보 처리 후 로딩 완료
      console.log("onAuthStateChange/Initial: fetchAndSetUser finished. isLoading:", false, "User:", user);
    };

    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("AuthProvider Initial getSession:", session);
      fetchAndSetUser(session?.user || null);
    }).catch(error => {
      console.error("AuthProvider Initial getSession error:", error);
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("onAuthStateChange event:", event, "session:", session);
      setIsLoading(true); // 인증 상태 변경 시작 시 로딩 상태로
      await fetchAndSetUser(session?.user || null);
      if (event === 'SIGNED_OUT') {
         // SIGNED_OUT 시 login 페이지로 리다이렉트, 이미 로그아웃 함수에서 처리하고 있다면 중복될 수 있음
         // router.push('/login');
      }
    });

    return () => {
      console.log("AuthProvider: useEffect for onAuthStateChange unmounted. Unsubscribing listener.");
      authListener?.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // router를 의존성 배열에서 제거하거나, 꼭 필요하다면 useCallback 등으로 안정화 필요


  const login = async (email: string, password: string) => {
    console.log("login: function called with email:", email);
    // 로그인 버튼 자체의 로딩 상태는 로컬 state로 관리하거나, AuthContext의 isLoading을 활용.
    // 여기서는 onAuthStateChange가 AuthContext의 isLoading을 관리하므로, 추가적인 setIsLoading(true)는 생략 가능.
    // 필요하다면 로그인 시도 중임을 나타내는 별도 상태 사용 고려.

    try {
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      console.log("login: signInWithPassword response", { session, signInError });

      if (signInError) {
        console.error("login: Error signing in:", signInError);
        // UI에 에러 메시지 표시 (예: react-toastify, Sonner 등)
        throw signInError;
      }

      if (!session?.user) {
        console.error("login: No session or user found after successful sign-in call without error.");
        throw new Error("Login failed: No user session created.");
      }
      
      // onAuthStateChange 리스너가 사용자 정보 설정 및 쿠키 설정을 처리함
      // setUser, setCookie 등은 onAuthStateChange 핸들러로 이동/통합됨
      // 여기서 isLoading을 true로 설정하고, onAuthStateChange에서 false로 설정
      console.log("login: Sign-in successful via Supabase. User ID:", session.user.id, "Waiting for onAuthStateChange.");
      // onAuthStateChange가 isLoading을 false로 설정할 때까지 기다리거나,
      // 즉시 대시보드로 보내고 onAuthStateChange가 UI를 업데이트하도록 함.
      // 현재 onAuthStateChange가 isLoading을 관리하므로, login 함수에서는 직접 false로 설정하지 않음.
      router.push('/dashboard');

    } catch (error) {
      console.error('Login error (overall catch):', error);
      // setUser(null); // onAuthStateChange가 처리하거나, 필요시 명시적 초기화
      // eraseCookie('currentUser');
      // localStorage.removeItem('user');
      // setIsLoading(false); // onAuthStateChange가 처리하거나, 에러 발생 시 로딩 상태 해제
      throw error; // 에러를 다시 던져서 호출한 쪽에서 처리할 수 있도록 함
    }
    // finally 블록에서 isLoading을 false로 설정하지 않음 (onAuthStateChange가 담당)
    console.log("login: function finished.");
  };

  const logout = async () => {
    console.log("logout: function called");
    // setIsLoading(true); // onAuthStateChange가 처리
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("logout: Error signing out:", error);
        // 에러가 발생해도 클라이언트 측 상태는 초기화 시도
      }
      // setUser(null); // onAuthStateChange가 처리
      // localStorage.removeItem('user');
      // eraseCookie('currentUser');
      console.log("logout: SignOut called. Navigating to /login. onAuthStateChange will handle state cleanup.");
      router.push('/login');
    } catch (error) {
      console.error('Logout error (overall catch):', error);
    } finally {
      // setIsLoading(false); // onAuthStateChange가 처리
      console.log("logout: function finished.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
