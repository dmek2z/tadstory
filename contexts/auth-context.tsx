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
  login: (email: string, password: string) => Promise<boolean> // 변경: 반환 타입 boolean으로 명시
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
        setCookie('currentUser', userToSet.id, 1); // 쿠키 설정
        console.log("AuthProvider: updateUserProfile - User profile set:", userToSet);
      } else {
        console.warn("AuthProvider: updateUserProfile - No user data in 'users' table for ID:", supabaseUser.id);
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
  };

  useEffect(() => {
    console.log("AuthProvider: useEffect for auth state change listener setup.");
    setIsLoading(true);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
        console.log("AuthProvider: Initial session check (getSession)", session);
        if (session?.user) {
            await updateUserProfile(session.user);
        } else {
            setUser(null);
            eraseCookie('currentUser');
            localStorage.removeItem('user');
        }
        // onAuthStateChange의 INITIAL_SESSION에서 최종적으로 setIsLoading(false)를 호출하도록 함
        // 여기서 바로 false로 설정하면 onAuthStateChange의 INITIAL_SESSION 이벤트와 경합할 수 있음
    }).catch(error => {
        console.error("AuthProvider: Error during initial getSession:", error);
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
        setIsLoading(false); // 에러 발생 시에는 로딩 상태 해제
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`AuthProvider: onAuthStateChange - Event: ${event}, User: ${session?.user?.id || 'null'}`);
      
      // INITIAL_SESSION을 포함한 모든 이벤트 시작 시 로딩 true
      // 이렇게 하면 getSession과 INITIAL_SESSION 간의 로딩 상태 충돌을 줄일 수 있음
      if (event !== 'USER_UPDATED' && event !== 'PASSWORD_RECOVERY') { // 사용자 정보 업데이트나 PW 복구는 백그라운드 진행으로 간주
          setIsLoading(true);
          console.log("AuthProvider: onAuthStateChange - setIsLoading(true) for event:", event);
      }

      await updateUserProfile(session?.user || null);

      if (event === 'SIGNED_OUT') {
        console.log("AuthProvider: onAuthStateChange - SIGNED_OUT, redirecting to /login");
        router.push('/login');
      }
      
      // 모든 인증 상태 변경 처리 후 로딩 완료
      // (단, USER_UPDATED 같은 이벤트는 UI 블로킹 없이 진행되도록 할 수 있음)
      if (event !== 'USER_UPDATED' && event !== 'PASSWORD_RECOVERY') {
        setIsLoading(false);
        console.log("AuthProvider: onAuthStateChange - setIsLoading(false) after event:", event);
      }
    });

    return () => {
      console.log("AuthProvider: Unsubscribing from onAuthStateChange listener.");
      authListener?.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // router 의존성 제거 (일반적으로 router는 안정적이나, StrictMode 등에서 재생성될 수 있으므로 주의)


  const login = async (email: string, password: string): Promise<boolean> => { // boolean 반환
    console.log("AuthProvider: login function called with email:", email);
    // setIsLoading(true); // login 함수 자체에서는 isLoading 직접 제어하지 않음
                       // onAuthStateChange가 SIGNED_IN 이벤트에서 처리

    try {
      const { data: { session: supabaseSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      console.log("AuthProvider: login - signInWithPassword response", { supabaseSession, signInError });

      if (signInError) {
        console.error("AuthProvider: login - Error signing in:", signInError);
        // setIsLoading(false); // login 함수 자체에서는 isLoading 직접 제어하지 않음
        // throw signInError; // LoginPage에서 에러를 표시할 수 있도록 throw 또는 false 반환
        return false;
      }

      if (!supabaseSession?.user) {
        console.error("AuthProvider: login - No session or user after successful signIn (unexpected).");
        // setIsLoading(false); // login 함수 자체에서는 isLoading 직접 제어하지 않음
        // throw new Error("Login failed: No user session created.");
        return false;
      }
      
      // onAuthStateChange 리스너가 SIGNED_IN 이벤트를 감지하고 updateUserProfile 호출,
      // 그 후 isLoading을 false로 설정합니다.
      // router.push도 onAuthStateChange 또는 LoginPage의 useEffect에서 처리하도록 유도
      console.log("AuthProvider: login - signInWithPassword successful. User ID:", supabaseSession.user.id);
      // router.push('/dashboard'); // LoginPage에서 성공 후 처리하도록 변경
      return true; // 성공 반환

    } catch (error) {
      console.error('AuthProvider: login - Overall error:', error);
      // setIsLoading(false); // login 함수 자체에서는 isLoading 직접 제어하지 않음
      // throw error; // 호출부에서 에러를 인지하도록 다시 throw
      return false; // 또는 throw error;
    }
    // console.log("AuthProvider: login function finished."); // 이 위치는 도달하지 않을 수 있음
  };

  const logout = async () => {
    console.log("AuthProvider: logout function called");
    // setIsLoading(true); // onAuthStateChange가 SIGNED_OUT 이벤트에서 처리

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthProvider: logout - Error signing out:", error);
        // setIsLoading(false); // onAuthStateChange가 SIGNED_OUT 이벤트에서 처리
        throw error;
      }
      // onAuthStateChange가 SIGNED_OUT 이벤트를 처리:
      // updateUserProfile(null) 호출 -> user=null, 쿠키/localStorage 삭제
      // router.push('/login') 호출
      // setIsLoading(false) 호출
      console.log("AuthProvider: logout - supabase.auth.signOut() successful. Waiting for onAuthStateChange.");
    } catch (error) {
      console.error('AuthProvider: logout - Overall error:', error);
      // setIsLoading(false); // onAuthStateChange가 SIGNED_OUT 이벤트에서 처리 (만약 signOut 에러 시 여기까지 안 올 수 있음)
    }
    // console.log("AuthProvider: logout function finished.");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
