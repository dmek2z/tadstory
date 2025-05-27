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

// 인증 프로바이더 컴포넌트
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log("AuthProvider: useEffect triggered, calling initializeAuth");
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    console.log("initializeAuth: function called");
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("initializeAuth: getSession response", { session, sessionError });

      if (sessionError) {
        console.error("initializeAuth: Error getting session:", sessionError);
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
          //setUser(null); // Optionally clear user if fetch fails
          //localStorage.removeItem('user');
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
          console.log("initializeAuth: User state set and saved to localStorage:", userToSet);
        } else {
          console.warn("initializeAuth: No user data found in 'users' table for ID:", session.user.id);
          setUser(null); // 명시적으로 사용자 정보 없음을 설정
          localStorage.removeItem('user');
        }
      } else {
        console.log("initializeAuth: No active session found.");
        setUser(null);
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Auth initialization error (overall catch):', error);
      setUser(null);
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
      console.log("initializeAuth: finished, isLoading set to false. Current user state:", user);
    }
  };

  const login = async (email: string, password: string) => {
    console.log("login: function called with email:", email);
    try {
      setIsLoading(true);
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      console.log("login: signInWithPassword response", { session, signInError });

      if (signInError) {
        console.error("login: Error signing in:", signInError);
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
          //setUser(null); // Optionally clear user
          //localStorage.removeItem('user');
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
          console.log("login: User state set and saved to localStorage. Navigating to /dashboard.", userToSet);
          router.push('/dashboard');
        } else {
          console.warn("login: No user data found in 'users' table for ID after sign-in:", session.user.id);
          // It's crucial to handle this case. Maybe the user exists in auth.users but not public.users
          // For now, we won't set the user, which might prevent login.
          setUser(null); 
          localStorage.removeItem('user');
          // Consider throwing an error or showing a message to the user.
          throw new Error("User profile not found in our records after login.");
        }
      } else {
        // This case should ideally not be reached if signInError is not thrown,
        // but as a safeguard:
        console.error("login: No session or user found after successful sign-in call without error. This is unexpected.");
        setUser(null);
        localStorage.removeItem('user');
        throw new Error("Login failed: No user session created.");
      }
    } catch (error) {
      console.error('Login error (overall catch):', error);
      setIsLoading(false); // Ensure isLoading is reset on error
      setUser(null);
      localStorage.removeItem('user');
      throw error; // Re-throw to be caught by UI
    } finally {
      // setIsLoading(false) should be here if login doesn't always navigate or throw
      // If login always navigates or throws, isLoading might be reset by initializeAuth on page load
      // For safety, ensure isLoading is managed if the login flow can complete without navigation or error here.
      // However, successful login *should* navigate.
      // If we reach here after a successful login that *should* have navigated,
      // isLoading might still be true, which could be an issue.
      // Let's ensure isLoading is false if an error didn't occur that re-threw.
      // The main place isLoading is set to false is in initializeAuth.
      // If login is successful, initializeAuth will run on the new page.
      // If login fails and throws, it's handled.
      // The tricky case is if login *succeeds* but doesn't navigate, and no error is thrown *here*.
      // The current code *does* navigate on success.
       console.log("login: finished. Current user state:", user, "isLoading:", isLoading);
    }
  };

  const logout = async () => {
    console.log("logout: function called");
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      console.log("logout: signOut response", { error });
      if (error) {
        console.error("logout: Error signing out:", error);
        throw error;
      }
      
      setUser(null);
      localStorage.removeItem('user');
      console.log("logout: User state cleared, navigating to /");
      router.push('/');
    } catch (error) {
      console.error('Logout error (overall catch):', error);
      // We still want to clear user state on logout error if possible
      setUser(null);
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
      console.log("logout: finished, isLoading set to false. Current user state:", user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
