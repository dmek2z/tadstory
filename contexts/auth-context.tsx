"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js'; // SupabaseClient 타입을 명시적으로 가져옵니다.
import { supabase } from '@/lib/supabaseClient'; // supabase 인스턴스를 가져옵니다.
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

  // 사용자 프로필 정보 가져오기 및 상태 업데이트 함수
  const updateUserProfile = async (supabaseUser: any | null) => {
    if (supabaseUser) {
      console.log("AuthProvider: updateUserProfile - Fetching user data for ID:", supabaseUser.id);
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
          email: userData.email,
          name: userData.name || supabaseUser.email,
          role: userData.role,
          permissions: userData.permissions || []
        };
        setUser(userToSet);
        localStorage.setItem('user', JSON.stringify(userToSet));
        setCookie('currentUser', userToSet.id, 1);
        console.log("AuthProvider: updateUserProfile - User profile set:", userToSet);
      } else {
        console.warn("AuthProvider: updateUserProfile - No user data in 'users' table for ID:", supabaseUser.id);
        setUser(null); // 해당 ID의 프로필이 없으면 user를 null로 설정
        eraseCookie('currentUser');
        localStorage.removeItem('user');
      }
    } else {
      console.log("AuthProvider: updateUserProfile - No Supabase user provided, clearing user state.");
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
    }
  };

  useEffect(() => {
    console.log("AuthProvider: useEffect for auth state change listener setup.");
    setIsLoading(true); // 리스너 설정 시작 시 로딩 상태

    // 초기 세션 확인 및 사용자 프로필 로드
    // onAuthStateChange의 INITIAL_SESSION이 이 역할을 하지만,
    // 명시적으로 getSession을 호출하여 초기 로딩 완료 시점을 더 정확히 제어할 수 있습니다.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
        console.log("AuthProvider: Initial session check (getSession)", session);
        if (session?.user) {
            await updateUserProfile(session.user);
        } else {
            // 세션이 없는 경우, 명시적으로 사용자 관련 정보 제거
            setUser(null);
            eraseCookie('currentUser');
            localStorage.removeItem('user');
        }
        // 이 시점에서 초기 인증 상태 확인이 완료되었으므로 로딩 상태 해제
        // (onAuthStateChange의 INITIAL_SESSION보다 먼저 또는 거의 동시에 실행될 수 있음)
        //setIsLoading(false);
        //console.log("AuthProvider: Initial session check complete. isLoading set to false.");
    }).catch(error => {
        console.error("AuthProvider: Error during initial getSession:", error);
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
        //setIsLoading(false); // 에러 발생 시에도 로딩 상태 해제
    });


    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`AuthProvider: onAuthStateChange - Event: ${event}, User: ${session?.user?.id || 'null'}`);
      
      // INITIAL_SESSION은 getSession()으로 이미 처리 중이므로 중복 로딩 상태 변경 방지 가능.
      // 그러나 onAuthStateChange가 유일한 정보 소스라면 여기서 isLoading 관리.
      // 여기서는 모든 이벤트에 대해 로딩 상태를 설정하고 해제하는 명확한 흐름을 만듭니다.
      setIsLoading(true);
      console.log("AuthProvider: onAuthStateChange - setIsLoading(true) for event:", event);

      await updateUserProfile(session?.user || null);

      if (event === 'SIGNED_OUT') {
        console.log("AuthProvider: onAuthStateChange - SIGNED_OUT, redirecting to /login");
        // setUser(null), eraseCookie 등은 updateUserProfile(null)에서 처리됨
        router.push('/login');
      }
      
      // 모든 인증 상태 변경 처리 후 로딩 완료
      setIsLoading(false);
      console.log("AuthProvider: onAuthStateChange - setIsLoading(false) after event:", event);
    });

    return () => {
      console.log("AuthProvider: Unsubscribing from onAuthStateChange listener.");
      authListener?.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // router 객체는 일반적으로 안정적이지만, Next.js 버전 및 환경에 따라 다를 수 있음


  const login = async (email: string, password: string) => {
    console.log("AuthProvider: login function called with email:", email);
    setIsLoading(true);

    try {
      const { data: { session: supabaseSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      console.log("AuthProvider: login - signInWithPassword response", { supabaseSession, signInError });

      if (signInError) {
        console.error("AuthProvider: login - Error signing in:", signInError);
        setIsLoading(false);
        throw signInError; // 로그인 페이지에서 에러를 표시할 수 있도록 throw
      }

      if (!supabaseSession?.user) {
        console.error("AuthProvider: login - No session or user after successful signIn (unexpected).");
        setIsLoading(false);
        throw new Error("Login failed: No user session created.");
      }
      
      // onAuthStateChange 리스너가 SIGNED_IN 이벤트를 감지하고 updateUserProfile 호출,
      // 그 후 isLoading을 false로 설정합니다.
      console.log("AuthProvider: login - signInWithPassword successful. User ID:", supabaseSession.user.id);
      router.push('/dashboard');
      // setIsLoading(false)는 onAuthStateChange 핸들러에서 처리합니다.

    } catch (error) {
      console.error('AuthProvider: login - Overall error:', error);
      // 로그인 함수 내에서 발생한 모든 종류의 에러에 대해 isLoading을 false로 설정
      setIsLoading(false);
      throw error; // 호출부에서 에러를 인지하도록 다시 throw
    }
    // finally 블록은 불필요, catch에서 isLoading 처리
    console.log("AuthProvider: login function finished.");
  };

  const logout = async () => {
    console.log("AuthProvider: logout function called");
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthProvider: logout - Error signing out:", error);
        setIsLoading(false); // signOut 에러 시에도 로딩 상태 해제
        throw error;
      }
      // onAuthStateChange가 SIGNED_OUT 이벤트를 처리:
      // updateUserProfile(null) 호출 -> user=null, 쿠키/localStorage 삭제
      // router.push('/login') 호출
      // setIsLoading(false) 호출
      console.log("AuthProvider: logout - supabase.auth.signOut() successful. Waiting for onAuthStateChange.");
    } catch (error) {
      console.error('AuthProvider: logout - Overall error:', error);
      setIsLoading(false); // 예외 발생 시 로딩 상태 해제
    }
    console.log("AuthProvider: logout function finished.");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
