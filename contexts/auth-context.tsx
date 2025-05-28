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
  const [isLoading, setIsLoading] = useState(true); // 앱 시작 시 로딩 중 상태로 초기화
  const router = useRouter();

  useEffect(() => {
    console.log("AuthProvider: useEffect for onAuthStateChange setup.");
    // 이 useEffect는 마운트 시 한 번만 실행되어 리스너를 설정하고 초기 세션을 확인합니다.

    const processUserSession = async (sessionUser: any | null) => {
      if (sessionUser) {
        console.log("processUserSession: Active session, fetching user data for ID:", sessionUser.id);
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (userFetchError) {
          console.error("processUserSession: Error fetching user data:", userFetchError);
          setUser(null);
          eraseCookie('currentUser');
          localStorage.removeItem('user');
        } else if (userData) {
          const userToSet: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name || sessionUser.email, // 이름이 없으면 이메일 사용
            role: userData.role,
            permissions: userData.permissions || []
          };
          setUser(userToSet);
          localStorage.setItem('user', JSON.stringify(userToSet));
          setCookie('currentUser', userToSet.id, 1);
          console.log("processUserSession: User set:", userToSet);
        } else {
          console.warn("processUserSession: No user data in 'users' table for ID:", sessionUser.id);
          setUser(null);
          eraseCookie('currentUser');
          localStorage.removeItem('user');
        }
      } else {
        console.log("processUserSession: No active session.");
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
      }
    };

    // 1. 초기 세션 확인 (앱 로드 시)
    let initialSessionChecked = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("AuthProvider Initial getSession result:", session);
      await processUserSession(session?.user || null);
      initialSessionChecked = true;
      setIsLoading(false); // 초기 세션 확인 및 사용자 처리 후 로딩 완료
      console.log("AuthProvider Initial getSession processed. isLoading: false");
    }).catch(error => {
      console.error("AuthProvider Initial getSession error:", error);
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
      initialSessionChecked = true;
      setIsLoading(false); // 에러 발생 시에도 로딩 완료 처리
    });

    // 2. 인증 상태 변경 리스너 설정
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("onAuthStateChange triggered. Event:", event, "Session:", session);

      // INITIAL_SESSION 이벤트는 이미 getSession()으로 처리했으므로,
      // 중복 처리를 피하거나 상태가 완전히 안정된 후 로딩을 해제하기 위함.
      // 또는, getSession() 호출 없이 onAuthStateChange의 INITIAL_SESSION 이벤트에만 의존할 수도 있습니다.
      // 여기서는 getSession()이 완료된 후에만 onAuthStateChange가 isLoading을 제어하도록 합니다.
      if (!initialSessionChecked && event !== 'INITIAL_SESSION') {
        // 아직 초기 세션 확인이 끝나지 않았는데 다른 이벤트가 발생하면 기다릴 수 있습니다.
        // 하지만 일반적으로 INITIAL_SESSION이 먼저 발생하거나 getSession이 먼저 완료됩니다.
        console.log("onAuthStateChange: Waiting for initial session check to complete before processing event:", event);
        return;
      }
      
      // INITIAL_SESSION 외의 이벤트에 대해서만 setIsLoading(true)를 명시적으로 호출하여
      // 로그인/로그아웃 과정 중임을 나타냅니다.
      if (event !== 'INITIAL_SESSION') {
        setIsLoading(true);
        console.log("onAuthStateChange: Set isLoading to true for event:", event);
      }

      await processUserSession(session?.user || null);
      
      // INITIAL_SESSION 이벤트가 아니거나, INITIAL_SESSION이지만 getSession 보다 늦게 처리된 경우
      // 여기서 로딩 상태를 false로 설정합니다.
      if (event !== 'INITIAL_SESSION' || (event === 'INITIAL_SESSION' && initialSessionChecked)) {
         setIsLoading(false);
         console.log("onAuthStateChange: Set isLoading to false after processing event:", event);
      }


      if (event === 'SIGNED_OUT') {
        console.log("onAuthStateChange: SIGNED_OUT detected, navigating to /login.");
        router.push('/login');
      }
    });

    return () => {
      console.log("AuthProvider: Unsubscribing from onAuthStateChange.");
      authListener?.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // router를 의존성 배열에 포함 (router.push 때문)


  const login = async (email: string, password: string) => {
    console.log("login: function called with email:", email);
    setIsLoading(true); // 로그인 시도 시작, UI 로딩 상태 true

    try {
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      console.log("login: signInWithPassword response", { session, signInError });

      if (signInError) {
        console.error("login: Error signing in:", signInError);
        setIsLoading(false); // 로그인 실패 시 로딩 해제
        throw signInError;
      }

      if (!session?.user) {
        console.error("login: No session or user after successful signInWithPassword (unexpected).");
        setIsLoading(false); // 세션 없음 에러 시 로딩 해제
        throw new Error("Login failed: No user session created.");
      }

      // signInWithPassword 성공 시, onAuthStateChange 리스너가 'SIGNED_IN' 이벤트를 감지하고,
      // processUserSession을 통해 사용자 정보를 설정하고, 최종적으로 setIsLoading(false)를 호출합니다.
      console.log("login: signInWithPassword successful. User ID:", session.user.id, ". Waiting for onAuthStateChange.");
      // 여기서 router.push를 호출하면, onAuthStateChange가 새 페이지에서 사용자 상태를 설정하기 전에
      // DashboardLogic 등이 실행될 수 있습니다. onAuthStateChange 내부에서 리디렉션을 관리하거나,
      // 또는 여기서 push 후 DashboardLogic이 isLoading 상태를 보고 대기하도록 합니다.
      // 사용자가 즉시 페이지 이동을 경험하게 하려면 여기서 push.
      router.push('/dashboard');
      // setIsLoading(false)는 onAuthStateChange의 processUserSession에서 처리됩니다.

    } catch (error) {
      console.error('Login error (overall catch):', error);
      // 에러 발생 시 로딩 상태가 true로 남아있을 수 있으므로 확실히 false로 설정
      // (이미 signInError 또는 !session?.user 블록에서 false로 설정했을 수 있음)
      if (isLoading) setIsLoading(false);
      throw error; // 에러를 상위로 전파하여 로그인 페이지에서 처리
    }
    // login 함수가 끝나도, 실제 사용자 상태 업데이트와 isLoading=false는 onAuthStateChange를 통해 비동기적으로 발생
    console.log("login: function finished execution.");
  };

  const logout = async () => {
    console.log("logout: function called");
    setIsLoading(true); // 로그아웃 시도 시작, UI 로딩 상태 true
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("logout: Error signing out:", error);
        // 에러가 발생해도 onAuthStateChange가 SIGNED_OUT 이벤트를 (아마도) 받지 못할 수 있으므로,
        // 수동으로 상태를 정리하고 리디렉션하는 것이 안전할 수 있습니다.
        // 하지만 우선은 onAuthStateChange에 맡겨봅니다.
        setIsLoading(false); // signOut 에러 시 로딩 해제
        throw error; // 에러 전파
      }
      // signOut 성공 시, onAuthStateChange 리스너가 'SIGNED_OUT' 이벤트를 감지하고,
      // processUserSession(null)을 호출하여 user 상태를 null로 만들고, 쿠키/localStorage를 정리하며,
      // setIsLoading(false)를 호출하고, '/login'으로 리디렉션합니다.
      console.log("logout: supabase.auth.signOut() successful. Waiting for onAuthStateChange.");
      // router.push('/login'); // onAuthStateChange에서 처리 예정
    } catch (error) {
      console.error('Logout error (overall catch):', error);
      // catch 블록에서 isLoading이 true로 남아있을 수 있으므로 false로 설정
      if(isLoading) setIsLoading(false);
    }
    console.log("logout: function finished execution.");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
