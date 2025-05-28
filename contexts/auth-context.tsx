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
  name: string // Supabase users 테이블에 name이 없을 경우 null 가능성 고려
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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log("AuthProvider: useEffect for onAuthStateChange mounted.");
    setIsLoading(true);

    const fetchAndSetUser = async (sessionUser: any | null) => {
      let userToLog: User | null = null;
      if (sessionUser) {
        console.log("fetchAndSetUser: Session found, user ID:", sessionUser.id);
        const { data: userData, error: userFetchError } = await supabase
          .from('users') // Supabase 'users' 테이블 (auth.users 아님)
          .select('*')
          .eq('id', sessionUser.id)
          .single();
        console.log("fetchAndSetUser: Fetched user data from 'users' table", { userData, userFetchError });

        if (userFetchError) {
          console.error("fetchAndSetUser: Error fetching user data:", userFetchError);
          setUser(null);
          eraseCookie('currentUser');
          localStorage.removeItem('user');
        } else if (userData) {
          console.log("fetchAndSetUser: User data found:", userData);
          const userToSet: User = { // User 타입 명시
            id: userData.id,
            email: userData.email,
            name: userData.name || sessionUser.email, // name이 null일 경우 email 사용
            role: userData.role,
            permissions: userData.permissions || []
          };
          setUser(userToSet);
          localStorage.setItem('user', JSON.stringify(userToSet));
          setCookie('currentUser', userToSet.id, 1);
          userToLog = userToSet;
          console.log("fetchAndSetUser: User state, localStorage, and cookie set:", userToSet);
        } else {
          console.warn("fetchAndSetUser: No user data found in 'users' table for ID:", sessionUser.id);
          setUser(null);
          eraseCookie('currentUser');
          localStorage.removeItem('user');
        }
      } else {
        console.log("fetchAndSetUser: No active session/user.");
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
      }
      setIsLoading(false);
      console.log("fetchAndSetUser finished. isLoading: false, Current User for log:", userToLog);
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
      // SIGNED_IN 이벤트 발생 시 fetchAndSetUser 내부에서 setIsLoading(true)를 호출하지 않도록 수정
      // 전역 isLoading은 여기서 관리
      if(event !== "INITIAL_SESSION") setIsLoading(true);

      await fetchAndSetUser(session?.user || null);

      if (event === 'SIGNED_OUT') {
         // setUser(null) 및 쿠키 삭제는 fetchAndSetUser(null)에서 처리됨
         console.log("onAuthStateChange: SIGNED_OUT detected, redirecting to /login");
         router.push('/login');
      }
      // INITIAL_SESSION이 아닌 다른 이벤트 후에는 setIsLoading(false)가 fetchAndSetUser에서 호출됨
      // INITIAL_SESSION의 경우, 위의 getSession().then()에서 이미 처리하므로 중복 호출 방지
       if(event !== "INITIAL_SESSION") {
            // setIsLoading(false); // fetchAndSetUser 내부에서 처리
       }
    });

    return () => {
      console.log("AuthProvider: useEffect for onAuthStateChange unmounted. Unsubscribing listener.");
      authListener?.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const login = async (email: string, password: string) => {
    console.log("login: function called with email:", email);
    setIsLoading(true); // 로그인 시도 시작 시 로딩 상태로

    try {
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      console.log("login: signInWithPassword response", { session, signInError });

      if (signInError) {
        console.error("login: Error signing in:", signInError);
        setIsLoading(false); // 로그인 실패 시 로딩 상태 해제
        throw signInError;
      }

      if (!session?.user) {
        console.error("login: No session or user found after successful sign-in call without error.");
        setIsLoading(false); // 세션 없음 에러 시 로딩 상태 해제
        throw new Error("Login failed: No user session created.");
      }

      // onAuthStateChange 리스너가 사용자 정보 설정, 쿠키 설정, 최종 isLoading(false)를 처리합니다.
      // 성공적으로 signInWithPassword가 호출되면 onAuthStateChange가 트리거됩니다.
      console.log("login: Sign-in successful via Supabase. User ID:", session.user.id, "Waiting for onAuthStateChange to handle user state and redirect.");
      // router.push('/dashboard'); // onAuthStateChange 핸들러 또는 DashboardLogic에서 리디렉션 관리
                                  // 또는 여기서 리디렉션하되, onAuthStateChange가 상태를 안정화할 것을 기대.
                                  // 사용자가 로그인 성공 후 즉시 대시보드로 이동하는 경험을 위해 여기서 push
      router.push('/dashboard');
      // setIsLoading(false)는 onAuthStateChange의 fetchAndSetUser에서 호출됨

    } catch (error) {
      console.error('Login error (overall catch):', error);
      // setIsLoading(false)는 각 에러 분기 또는 onAuthStateChange에서 처리
      // 최종적으로 로딩 상태가 해제되도록 보장해야 함
      if (isLoading) setIsLoading(false); // catch 블록에서 isLoading이 여전히 true이면 false로 설정
      throw error;
    }
    console.log("login: function finished.");
  };

  const logout = async () => {
    console.log("logout: function called");
    setIsLoading(true); // 로그아웃 시작 시 로딩 상태로
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("logout: Error signing out:", error);
        // 에러 발생해도 클라이언트 측 상태는 onAuthStateChange가 처리하도록 유도
      }
      // setUser(null), 쿠키 삭제, localStorage 삭제는 onAuthStateChange (SIGNED_OUT 이벤트)에서 처리됨
      console.log("logout: Supabase signOut called. onAuthStateChange will handle state cleanup and redirection.");
      // router.push('/login'); // onAuthStateChange에서 리디렉션 처리하므로 여기서 중복 호출 필요 없음
    } catch (error) {
      console.error('Logout error (overall catch):', error);
      setIsLoading(false); // 예외 발생 시 로딩 상태 해제
    }
    // finally { setIsLoading(false); } // onAuthStateChange가 SIGNED_OUT 후 isLoading을 false로 설정
    console.log("logout: function finished.");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
