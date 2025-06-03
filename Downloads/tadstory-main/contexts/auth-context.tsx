"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
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
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  hasPermission: (pageId: string, permissionType: "view" | "edit") => boolean // 추가
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
    }).catch(error => {
        console.error("AuthProvider: Error during initial getSession:", error);
        setUser(null);
        eraseCookie('currentUser');
        localStorage.removeItem('user');
        setIsLoading(false); 
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`AuthProvider: onAuthStateChange - Event: ${event}, User: ${session?.user?.id || 'null'}`);
      
      if (event !== 'USER_UPDATED' && event !== 'PASSWORD_RECOVERY') {
          setIsLoading(true);
          console.log("AuthProvider: onAuthStateChange - setIsLoading(true) for event:", event);
      }

      await updateUserProfile(session?.user || null);

      if (event === 'SIGNED_OUT') {
        console.log("AuthProvider: onAuthStateChange - SIGNED_OUT, redirecting to /login");
        router.push('/login');
      }
      
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
  }, []); 


  const login = async (email: string, password: string): Promise<boolean> => {
    console.log("AuthProvider: login function called with email:", email);
    try {
      const { data: { session: supabaseSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      console.log("AuthProvider: login - signInWithPassword response", { supabaseSession, signInError });

      if (signInError) {
        console.error("AuthProvider: login - Error signing in:", signInError);
        return false;
      }
      if (!supabaseSession?.user) {
        console.error("AuthProvider: login - No session or user after successful signIn (unexpected).");
        return false;
      }
      console.log("AuthProvider: login - signInWithPassword successful. User ID:", supabaseSession.user.id);
      return true;
    } catch (error) {
      console.error('AuthProvider: login - Overall error:', error);
      return false;
    }
  };

  const logout = async () => {
    console.log("AuthProvider: logout function called");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthProvider: logout - Error signing out:", error);
        throw error;
      }
      console.log("AuthProvider: logout - supabase.auth.signOut() successful. Waiting for onAuthStateChange.");
    } catch (error) {
      console.error('AuthProvider: logout - Overall error:', error);
    }
  };

  // 여기에 hasPermission 함수 정의
  const hasPermission = (pageId: string, permissionType: "view" | "edit"): boolean => {
    // console.log("AuthContext hasPermission called for:", { pageId, permissionType, userRole: user?.role, isLoading });
    if (isLoading || !user) { // AuthProvider의 isLoading과 user 사용
      // console.log("AuthContext hasPermission: auth loading or no user, returning false.");
      return false; 
    }
    if (user.role && user.role.trim() === "admin") {
      // console.log("AuthContext hasPermission: user is admin, returning true.");
      return true; 
    }
    const permission = user.permissions.find((p: Permission) => p.page === pageId);
    const result = permission ? permission[permissionType] : false;
    // console.log("AuthContext hasPermission: found permission object:", permission, "Result:", result);
    return result;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}> {/* hasPermission 추가 */}
      {children}
    </AuthContext.Provider>
  );
}