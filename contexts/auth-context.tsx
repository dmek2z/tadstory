"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SupabaseClient, Session, AuthChangeEvent, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

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
    console.log(`AuthProvider: Cookie set: ${name}=${value}`);
  }
};

const eraseCookie = (name: string) => {
  if (typeof document !== 'undefined') {
    document.cookie = name+'=; Max-Age=-99999999; path=/';
    console.log(`AuthProvider: Cookie erased: ${name}`);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log("AuthProvider: Component rendered");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const updateUserProfile = useCallback(async (supabaseUser: SupabaseAuthUser | null) => {
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
          email: userData.email || supabaseUser.email || '', // Ensure email is a string
          name: userData.name || supabaseUser.email || 'Unknown User', // Ensure name is a string
          role: userData.role || 'guest', // Ensure role is a string, provide default
          permissions: userData.permissions || []
        };
        setUser(userToSet);
        localStorage.setItem('user', JSON.stringify(userToSet));
        setCookie('currentUser', userToSet.id, 1);
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
  }, []); // No dependencies, as it uses arguments or globally available 'supabase'

  useEffect(() => {
    console.log("AuthProvider: useEffect for auth state change listener setup.");
    setIsLoading(true);

    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: Session | null } }) => {
        console.log("AuthProvider: Initial session check (getSession)", session);
        if (session?.user) {
            await updateUserProfile(session.user);
        } else {
            setUser(null);
            eraseCookie('currentUser');
            localStorage.removeItem('user');
        }
        // 로딩 상태는 onAuthStateChange의 INITIAL_SESSION에서 최종적으로 false로 설정됩니다.
        // 만약 INITIAL_SESSION 이벤트가 발생하지 않는 예외적인 경우를 대비해, 
        // 여기서도 일정 시간 후 setIsLoading(false)를 호출하는 타임아웃을 고려할 수 있으나,
        // 현재는 onAuthStateChange에 의존합니다.
    }).catch((error: any) => {
        console.error("AuthProvider: Error during initial getSession:", error);
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
        setIsLoading(false); 
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log(`AuthProvider: onAuthStateChange - Event: ${event}, User: ${session?.user?.id || 'null'}`);
      
      // 사용자 정보 업데이트, 비밀번호 복구, 토큰 갱신 등의 이벤트는 UI 로딩 상태를 직접 변경하지 않도록 함
      const shouldTriggerLoading = !['USER_UPDATED', 'PASSWORD_RECOVERY', 'TOKEN_REFRESHED'].includes(event);

      if (shouldTriggerLoading) {
          setIsLoading(true);
          console.log("AuthProvider: onAuthStateChange - setIsLoading(true) for event:", event);
      }

      await updateUserProfile(session?.user || null);

      if (event === 'SIGNED_OUT') {
        console.log("AuthProvider: onAuthStateChange - SIGNED_OUT event received.");
        // updateUserProfile(null)이 이미 user, cookie, localStorage를 정리했어야 함.
        // 리디렉션은 여기서 명시적으로 수행
        if (router) { // router 객체가 사용 가능한지 확인
            router.push('/login');
            console.log("AuthProvider: Redirected to /login after SIGNED_OUT.");
        } else {
            console.error("AuthProvider: router is not available for redirection on SIGNED_OUT.");
        }
      }
      
      if (shouldTriggerLoading) {
        setIsLoading(false);
        console.log("AuthProvider: onAuthStateChange - setIsLoading(false) after event:", event);
      }
    });

    return () => {
      console.log("AuthProvider: Unsubscribing from onAuthStateChange listener.");
      authListener?.subscription.unsubscribe();
    };
  }, [updateUserProfile, router]); // updateUserProfile과 router를 의존성 배열에 추가


  const login = async (email: string, password: string): Promise<boolean> => {
    console.log("AuthProvider: login function called with email:", email);
    // setIsLoading(true); // onAuthStateChange가 SIGNED_IN 처리 시 isLoading을 관리

    try {
      const { data: { session: supabaseSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      console.log("AuthProvider: login - signInWithPassword response", { supabaseSession, signInError });

      if (signInError) {
        console.error("AuthProvider: login - Error signing in:", signInError.message);
        return false;
      }
      if (!supabaseSession?.user) {
        console.error("AuthProvider: login - No session or user after successful signIn (unexpected).");
        return false;
      }
      
      console.log("AuthProvider: login - signInWithPassword successful. User ID:", supabaseSession.user.id);
      // onAuthStateChange 리스너가 'SIGNED_IN' 이벤트를 통해 user 상태를 업데이트하고,
      // LoginPage의 useEffect가 currentUser 상태 변경을 감지하여 대시보드로 이동시킬 것입니다.
      return true;

    } catch (error: any) {
      console.error('AuthProvider: login - Overall error:', error.message);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    console.log("AuthProvider: logout function called");
    // setIsLoading(true); // onAuthStateChange가 SIGNED_OUT 처리 시 isLoading을 관리

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("AuthProvider: logout - Error signing out:", error.message);
      // 에러가 발생해도 onAuthStateChange가 호출될 수 있는지, 또는 여기서 수동 처리가 필요한지 검토
      // 필요하다면 여기서도 사용자 상태 초기화 및 리디렉션 강제
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
      setIsLoading(false); // 로그아웃 실패 시에도 로딩은 해제
      if(router) router.push('/login'); // 강제 리디렉션
      throw error; // 에러를 throw하여 호출부에서 알 수 있도록 함
    }
    // 성공 시, onAuthStateChange 리스너가 'SIGNED_OUT' 이벤트를 처리하여
    // user 상태 업데이트, 쿠키/localStorage 정리, 페이지 이동을 수행합니다.
    console.log("AuthProvider: logout - supabase.auth.signOut() successful. Waiting for onAuthStateChange.");
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
  }, [user, isLoading]); // user와 isLoading이 변경될 때만 함수가 재생성되도록 함

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}
