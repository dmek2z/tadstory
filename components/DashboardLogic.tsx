"use client";

import { useEffect } from "react";
import { Home, Grid3x3, Package, History, Users, Settings } from "lucide-react"; // 아이콘 임포트 추가
import { useAuth } from "@/contexts/auth-context";
import { useStorage } from "@/contexts/storage-context";
import { usePathname, useRouter } from "next/navigation";
import type { Permission } from "@/contexts/auth-context"; // Permission 타입 임포트

// NavItem 인터페이스는 DashboardLayout에도 있지만, 여기서도 페이지 ID 로직에 필요할 수 있어 일단 포함합니다.
// 필요 없다면 제거해도 됩니다.
// interface NavItem {
//   title: string;
//   href: string;
//   icon: React.ElementType;
//   id: string;
// }

// navItems는 DashboardLayout에서 필터링되므로 여기서는 직접 사용하지 않습니다.
// 하지만 getCurrentPageId 로직이 특정 id를 참조한다면 필요할 수 있습니다.
// 현재 getCurrentPageId는 특정 문자열 ("dashboard", "settings")을 직접 비교하므로 여기서는 불필요해 보입니다.

export default function DashboardLogic({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading: authIsLoading } = useAuth();
  const { refreshData } = useStorage();
  const router = useRouter();

  // hasPermission 로직 추가
  const hasPermission = (pageId: string, permissionType: "view" | "edit"): boolean => {
    if (authIsLoading || !user) {
      return false; // 로딩 중이거나 사용자가 없으면 권한 없음
    }
    if (user.role === "admin") {
      return true; // 관리자는 모든 권한 가짐
    }
    const permission = user.permissions.find((p: Permission) => p.page === pageId);
    return permission ? permission[permissionType] : false;
  };

  const getCurrentPageId = (): string => {
    if (pathname === "/dashboard" || pathname === "/dashboard/") return "dashboard";
    const segments = pathname.replace(/\/$/, "").split("/");
    if (segments.length >= 3 && segments[1] === "dashboard" && segments[2]) {
      return segments[2];
    }
    return "";
  };

  useEffect(() => {
    if (authIsLoading) {
      return;
    }

    const pageId = getCurrentPageId();
    
    if (!user) {
      const loginUrl = new URL('/login', window.location.origin);
      loginUrl.searchParams.set('from', pathname);
      router.replace(loginUrl.toString());
      return;
    }

    // "settings" 페이지는 권한 검사를 건너뛰도록 조건 추가
    if (pageId && pageId !== "settings" && !hasPermission(pageId, "view")) {
      router.replace("/dashboard");
    }
  }, [pathname, user, router, hasPermission, authIsLoading]);

  useEffect(() => {
    if (!authIsLoading && user) {
      refreshData();
    }
  }, [authIsLoading, user, refreshData]);

  return <>{children}</>;
} 