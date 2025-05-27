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

// 기본 관리자 사용자
const adminUser: User = {
  id: "user-1",
  email: "admin@admin.com",
  name: "관리자",
  role: "admin",
  permissions: ["dashboard", "racks", "products", "history", "users"].map(page => ({
    page,
    view: true,
    edit: true
  }))
}

// 테스트 계정 정보
const testUser: User = {
  id: "user-test",
  email: "test@test.com",
  name: "테스트 계정",
  role: "user",
  permissions: ["dashboard", "racks", "products", "history", "users"].map(page => ({
    page,
    view: true,
    edit: true
  }))
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

// Helper function to set a cookie (can be moved to a utils file)
const setCookie = (name: string, value: string, days: number) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  if (typeof document !== 'undefined') { // Ensure document is defined (client-side)
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
    console.log(`Cookie set: ${name}=${value}`);
  }
};

// Helper function to get a cookie (not strictly needed for middleware, but good for consistency)
const getCookie = (name: string): string | null => {
  if (typeof document !== 'undefined') {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length,c.length);
    }
  }
  return null;
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
  console.log("AuthProvider component rendered - Test Log");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log("AuthProvider: useEffect triggered, calling initializeAuth");
    initializeAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeAuth = async () => {
    console.log("initializeAuth: function called");
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("initializeAuth: getSession response", { session, sessionError });

      if (sessionError) {
        console.error("initializeAuth: Error getting session:", sessionError);
        eraseCookie('currentUser'); // Clear cookie on error
        throw sessionError;
      }
      
      if (session?.user) {
        console.log("initializeAuth: Session found, user ID:", session.user.id);
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        console.log("initializeAuth: Fetched user data from 'users' table", { userData, userFetchError });

        if (userFetchError) {
          console.error("initializeAuth: Error fetching user data from 'users' table:", userFetchError);
          eraseCookie('currentUser'); // Clear cookie
          throw userFetchError;
        }

        if (userData) {
          console.log("initializeAuth: User data found in 'users' table:", userData);
          const userToSet = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            permissions: userData.permissions || []
          };
          setUser(userToSet);
          localStorage.setItem('user', JSON.stringify(userToSet));
          setCookie('currentUser', userToSet.id, 1); // Set cookie with user ID, expires in 1 day
          console.log("initializeAuth: User state, localStorage, and cookie set:", userToSet);
        } else {
          console.warn("initializeAuth: No user data found in 'users' table for ID:", session.user.id);
          setUser(null); 
          localStorage.removeItem('user');
          eraseCookie('currentUser'); // Clear cookie
        }
      } else {
        console.log("initializeAuth: No active session found.");
        setUser(null);
        localStorage.removeItem('user');
        eraseCookie('currentUser'); // Clear cookie
      }
    } catch (error) {
      console.error('Auth initialization error (overall catch):', error);
      setUser(null);
      localStorage.removeItem('user');
      eraseCookie('currentUser'); // Clear cookie
    } finally {
      setIsLoading(false);
      console.log("initializeAuth: finished, isLoading set to false. Current user state:", user);
    }
  };

  const login = async (email: string, password: string) => {
    console.log("login: function called with email:", email, "Current isLoading:", isLoading);
    setIsLoading(true); // Ensure isLoading is true at the beginning
    console.log("login: setIsLoading(true) called. Current isLoading:", isLoading); // This might show the stale value

    try {
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      console.log("login: signInWithPassword response", { session, signInError });

      if (signInError) {
        console.error("login: Error signing in:", signInError);
        eraseCookie('currentUser');
        setIsLoading(false); // Set loading to false on sign-in error
        throw signInError;
      }

      if (session?.user) {
        console.log("login: Sign-in successful, user ID:", session.user.id);
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        console.log("login: Fetched user data from 'users' table", { userData, userFetchError });

        if (userFetchError) {
          console.error("login: Error fetching user data from 'users' table after sign-in:", userFetchError);
          eraseCookie('currentUser');
          setIsLoading(false); // Set loading to false on user fetch error
          throw userFetchError;
        }

        if (userData) {
          console.log("login: User data found in 'users' table:", userData);
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
          console.log("login: User state, localStorage, and cookie set.", userToSet, "Current isLoading before push:", isLoading);
          
          // Short delay to ensure cookie is processed by the browser before navigation
          // This is a workaround; ideally, middleware should handle this gracefully.
          // await new Promise(resolve => setTimeout(resolve, 100)); 
          // The above delay might not be necessary if isLoading is handled correctly.

          console.log("login: Navigating to /dashboard. isLoading should remain true.");
          router.push('/dashboard');
          // DO NOT set isLoading to false here. Let initializeAuth on the new page handle it.
        } else {
          console.warn("login: No user data found in 'users' table for ID after sign-in:", session.user.id);
          setUser(null); 
          localStorage.removeItem('user');
          eraseCookie('currentUser');
          setIsLoading(false); 
          throw new Error("User profile not found in our records after login.");
        }
      } else {
        console.error("login: No session or user found after successful sign-in call without error. This is unexpected.");
        setUser(null);
        localStorage.removeItem('user');
        eraseCookie('currentUser');
        setIsLoading(false); 
        throw new Error("Login failed: No user session created.");
      }
    } catch (error) {
      console.error('Login error (overall catch):', error);
      setUser(null);
      localStorage.removeItem('user');
      eraseCookie('currentUser');
      setIsLoading(false); 
      throw error;
    } finally {
      // isLoading should NOT be set to false here in the success path.
      // It's set to false in error paths within the try-catch block.
      // For the success path, initializeAuth on the destination page will set it.
      console.log("login: finally block. Current isLoading:", isLoading, "User state (closure):", user);
    }
  };

  const logout = async () => {
    console.log("logout: function called");
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("logout: Error signing out:", error);
        // Even if sign-out fails, attempt to clear local state and cookie
      }
      setUser(null);
      localStorage.removeItem('user');
      eraseCookie('currentUser'); // Erase the cookie on logout
      console.log("logout: User state, localStorage, and cookie cleared. Navigating to /login.");
      router.push('/login');
    } catch (error) {
      console.error('Logout error (overall catch):', error);
      // Ensure local state and cookie are cleared even on error
      setUser(null);
      localStorage.removeItem('user');
      eraseCookie('currentUser');
    } finally {
      setIsLoading(false);
      console.log("logout: finished. Current user state:", user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
