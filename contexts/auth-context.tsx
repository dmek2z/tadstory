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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const updateUserProfile = useCallback(async (supabaseUser: SupabaseAuthUser | null) => {
    if (supabaseUser) {
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
      } else {
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
      }
    } else {
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    // console.log("AuthProvider: useEffect (auth state listener) - Mounting / Running. Pathname:", pathname);

    let initialSessionProcessedByListener = false;

    // 초기 세션 즉시 확인
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // console.log("AuthProvider: getSession - Result:", session);
      if (!authListener.subscription) { // 리스너가 아직 활성 상태가 아닐 수 있으므로 (매우 드문 경우)
          console.warn("AuthProvider: getSession - Auth listener not yet subscribed, potential race condition avoided.");
          // 이 경우 onAuthStateChange의 INITIAL_SESSION에 의존하거나, 약간의 지연 후 다시 확인하는 로직도 고려 가능
      }
      if (!session) {
        await updateUserProfile(null); // 사용자 정보 클리어
        if (!initialSessionProcessedByListener) { // onAuthStateChange의 INITIAL_SESSION이 먼저 처리 안됐을 경우
             setIsLoading(false);
            //  console.log("AuthProvider: getSession - No session, setIsLoading(false).");
        }
      } else {
         await updateUserProfile(session.user); // 사용자 정보 설정
         // setIsLoading(false)는 onAuthStateChange의 SIGNED_IN 또는 INITIAL_SESSION에서 처리되도록 함
      }
    }).catch(error => {
      console.error("AuthProvider: getSession - Error:", error);
      setUser(null);
      eraseCookie('currentUser');
      localStorage.removeItem('user');
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      // console.log(`AuthProvider: onAuthStateChange - Event: ${event}, User ID: ${session?.user?.id || 'null'}, isLoading: ${isLoading}`);
      
      if (event === 'INITIAL_SESSION') {
        initialSessionProcessedByListener = true;
        // console.log("AuthProvider: onAuthStateChange - INITIAL_SESSION received.");
        if (session?.user) {
          await updateUserProfile(session.user);
        } else {
          await updateUserProfile(null);
        }
        setIsLoading(false);
        // console.log("AuthProvider: onAuthStateChange - INITIAL_SESSION processed, setIsLoading(false).");
      } else if (event === 'SIGNED_IN') {
        // console.log("AuthProvider: onAuthStateChange - SIGNED_IN received.");
        if(session?.user) await updateUserProfile(session.user);
        setIsLoading(false);
        // console.log("AuthProvider: onAuthStateChange - SIGNED_IN processed, setIsLoading(false).");
      } else if (event === 'SIGNED_OUT') {
        // console.log("AuthProvider: onAuthStateChange - SIGNED_OUT received.");
        await updateUserProfile(null);
        setIsLoading(false); // 로딩 상태 확실히 변경
        if (pathname !== '/login') {
          router.push('/login');
          // console.log("AuthProvider: onAuthStateChange - Redirected to /login after SIGNED_OUT.");
        }
      } else if (event === 'USER_UPDATED') {
        // console.log("AuthProvider: onAuthStateChange - USER_UPDATED received.");
        if(session?.user) await updateUserProfile(session.user);
        // 이 이벤트는 setIsLoading을 변경하지 않을 수 있음 (백그라운드 업데이트)
      }
      // TOKEN_REFRESHED, PASSWORD_RECOVERY 등의 다른 이벤트들은 isLoading에 영향을 주지 않도록 함
    });

    return () => {
      // console.log("AuthProvider: useEffect (auth state listener) - Unmounting.");
      authListener?.subscription.unsubscribe();
    };
  }, [updateUserProfile, router, pathname]);


  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true); // 로그인 시도 시작 시 로딩
    try {
      const { data: { session: supabaseSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error("AuthProvider: login - Error signing in:", signInError.message);
        setIsLoading(false); // 로그인 실패 시 로딩 해제
        return false;
      }
      if (!supabaseSession?.user) {
        console.error("AuthProvider: login - No session or user after successful signIn (unexpected).");
        setIsLoading(false); // 세션/유저 없을 시 로딩 해제
        return false;
      }
      // 성공 시 onAuthStateChange가 SIGNED_IN 이벤트를 처리하고 거기서 setIsLoading(false) 호출
      return true;
    } catch (error: any) {
      console.error('AuthProvider: login - Overall error:', error.message);
      setIsLoading(false); // 예외 발생 시 로딩 해제
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true); // 로그아웃 시도 시작 시 로딩
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("AuthProvider: logout - Error signing out:", error.message);
      // 에러 발생해도 상태 초기화 및 리디렉션 시도
      await updateUserProfile(null); 
      setIsLoading(false);
      if (pathname !== '/login') router.push('/login');
      throw error;
    }
    // 성공 시 onAuthStateChange가 SIGNED_OUT을 처리 (user null, isLoading false, 페이지 이동)
  };

  const hasPermission = useCallback((pageId: string, permissionType: "view" | "edit"): boolean => {
    if (!user) { // isLoading이 false이고 user가 없을 때를 명확히
      return false; 
    }
    if (user.role && user.role.trim() === "admin") {
      return true; 
    }
    const permission = user.permissions.find((p: Permission) => p.page === pageId);
    return !!(permission && permission[permissionType]);
  }, [user]); // isLoading 의존성 제거, user만으로 판단

  // Context value
  const authContextValue = React.useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    hasPermission,
  }), [user, isLoading, hasPermission]); // login, logout은 useCallback으로 감싸지 않았으므로, 필요시 추가

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}
