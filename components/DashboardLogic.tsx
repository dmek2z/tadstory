"use client";

import { useEffect, useRef } from "react"; // useRef 추가
import { useAuth } from "@/contexts/auth-context";
import { useStorage } from "@/contexts/storage-context";
import { usePathname, useRouter } from "next/navigation";
import type { Permission } from "@/contexts/auth-context";

export default function DashboardLogic({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading: authIsLoading, hasPermission } = useAuth(); // AuthContext에서 hasPermission 직접 사용
  const { refreshData, isLoading: storageIsLoading } = useStorage(); // Storage 로딩 상태도 가져오기
  const router = useRouter();

  // 이전 user 상태를 기억하기 위한 ref
  const prevUserRef = useRef(user);
  const prevAuthIsLoadingRef = useRef(authIsLoading);

  const getCurrentPageId = (): string => {
    if (pathname === "/dashboard" || pathname === "/dashboard/") return "dashboard";
    const segments = pathname.replace(/\/$/, "").split("/"); // 마지막 슬래시 제거
    if (segments.length >= 3 && segments[1] === "dashboard" && segments[2]) {
      return segments[2];
    }
    return ""; // dashboard 하위가 아닌 경우 빈 문자열 반환 또는 기본 페이지 ID 반환
  };

  // 인증 및 권한 확인 useEffect
  useEffect(() => {
    console.log("DashboardLogic (Auth & Permission Check) useEffect: triggered", { authIsLoading, user, pathname });

    if (authIsLoading) {
      console.log("DashboardLogic (Auth & Permission Check): auth is loading, returning.");
      return;
    }

    // authIsLoading이 false가 된 시점에 user 상태를 기준으로 판단
    if (!user) {
      console.error("DashboardLogic (Auth & Permission Check): No user found AFTER authIsLoading is false. Redirecting to login. Pathname:", pathname);
      const loginUrl = new URL('/login', window.location.origin);
      if (pathname !== "/login" && !pathname.startsWith("/_next/")) {
          loginUrl.searchParams.set('from', pathname);
      }
      router.replace(loginUrl.toString());
      return;
    }

    // 사용자가 있고, 인증 로딩이 완료된 경우
    const pageId = getCurrentPageId();
    console.log("DashboardLogic (Auth & Permission Check): User found. Checking permissions for pageId:", pageId);
    
    // settings 페이지는 모든 인증된 사용자가 접근 가능하다고 가정, 그 외 페이지는 권한 확인
    if (pageId && pageId !== "settings" && !hasPermission(pageId, "view")) {
      console.error("DashboardLogic (Auth & Permission Check): No view permission for pageId:", pageId, "Redirecting to /dashboard. User role:", user.role);
      router.replace("/dashboard"); 
    } else {
      console.log("DashboardLogic (Auth & Permission Check): Has view permission or page is settings/root dashboard.");
    }
  }, [pathname, user, authIsLoading, router, hasPermission]); // hasPermission을 의존성에 추가 (useAuth에서 useCallback으로 감싸져 있어야 함)


  // 데이터 로딩 useEffect (StorageProvider의 초기 로딩과 중복되지 않도록 주의)
  useEffect(() => {
    console.log("DashboardLogic (Data Refresh) useEffect: triggered", { authIsLoading, user, storageIsLoading });
    // AuthProvider의 로딩이 끝나고, 사용자 객체가 존재하며, StorageProvider의 데이터가 아직 로딩 중일 때만 refreshData 호출
    // 또는, user 객체가 이전과 달라졌을 때 (예: 로그인/로그아웃 직후) 호출 고려
    if (!authIsLoading && user && (storageIsLoading || prevUserRef.current?.id !== user.id || prevAuthIsLoadingRef.current !== authIsLoading) ) {
      console.log("DashboardLogic (Data Refresh): Conditions met, calling refreshData(). Previous user ID:", prevUserRef.current?.id, "Current user ID:", user.id);
      refreshData();
    }
    // 이전 상태 업데이트
    prevUserRef.current = user;
    prevAuthIsLoadingRef.current = authIsLoading;

  }, [authIsLoading, user, storageIsLoading, refreshData]);

  return <>{children}</>;
}
