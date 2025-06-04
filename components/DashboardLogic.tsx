"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useStorage } from "@/contexts/storage-context";
import { usePathname, useRouter } from "next/navigation";
import type { Permission } from "@/contexts/auth-context";

export default function DashboardLogic({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading: authIsLoading, hasPermission } = useAuth();
  const { refreshData, isLoading: storageIsLoading } = useStorage();
  const router = useRouter();

  const getCurrentPageId = (): string => {
    if (pathname === "/dashboard" || pathname === "/dashboard/") return "dashboard";
    const segments = pathname.replace(/\/$/, "").split("/");
    if (segments.length >= 3 && segments[1] === "dashboard" && segments[2]) {
      return segments[2];
    }
    return "";
  };

  useEffect(() => {
    // console.log("DashboardLogic (Auth & Permission Check) useEffect: triggered", { authIsLoading, user, pathname });

    // AuthProvider가 로딩 중이면 아무것도 하지 않음
    if (authIsLoading) {
      // console.log("DashboardLogic: Auth is still loading, returning.");
      return;
    }

    // AuthProvider 로딩이 끝났는데 사용자가 없으면 로그인 페이지로 리디렉션
    if (!user) {
      // console.error("DashboardLogic: No user after auth loading. Redirecting to login. Pathname:", pathname);
      const loginUrl = new URL('/login', window.location.origin);
      if (pathname !== "/login" && !pathname.startsWith("/_next/")) {
          loginUrl.searchParams.set('from', pathname);
      }
      router.replace(loginUrl.toString());
      return;
    }

    // 사용자가 있고, 인증 로딩이 완료된 경우 권한 확인
    const pageId = getCurrentPageId();
    // console.log("DashboardLogic: User found. Checking permissions for pageId:", pageId);
    
    if (pageId && pageId !== "settings" && !hasPermission(pageId, "view")) {
      // console.error("DashboardLogic: No view permission for pageId:", pageId, ". Redirecting to /dashboard.");
      router.replace("/dashboard"); 
    } else {
      // console.log("DashboardLogic: Has view permission or page is settings/root dashboard.");
    }
  }, [pathname, user, authIsLoading, router, hasPermission]);


  // 데이터 로딩 useEffect (StorageProvider의 초기 로딩과 중복되지 않도록 주의)
  useEffect(() => {
    // console.log("DashboardLogic (Data Refresh) useEffect: triggered", { authIsLoading, user, storageIsLoading });
    if (!authIsLoading && user) { // 사용자가 있고, 인증 로딩이 끝났을 때만 데이터 로드
      // console.log("DashboardLogic (Data Refresh): Conditions met, calling refreshData().");
      refreshData();
    }
  }, [authIsLoading, user, refreshData]); // user 객체 참조 변경 시 refreshData 호출

  return <>{children}</>;
}
