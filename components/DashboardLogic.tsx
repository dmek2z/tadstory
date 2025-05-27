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

  const hasPermission = (pageId: string, permissionType: "view" | "edit"): boolean => {
    console.log("DashboardLogic hasPermission called for:", { pageId, permissionType, userRole: user?.role, authIsLoading });
    if (authIsLoading || !user) {
      console.log("DashboardLogic hasPermission: auth loading or no user, returning false.");
      return false; 
    }
    if (user.role === "admin") {
      console.log("DashboardLogic hasPermission: user is admin, returning true.");
      return true; 
    }
    const permission = user.permissions.find((p: Permission) => p.page === pageId);
    const result = permission ? permission[permissionType] : false;
    console.log("DashboardLogic hasPermission: found permission object:", permission, "Result:", result);
    return result;
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
    console.log("DashboardLogic useEffect (auth check): triggered", { authIsLoading, user, pathname });
    if (authIsLoading) {
      console.log("DashboardLogic useEffect (auth check): auth is loading, returning.");
      return;
    }

    console.log("DashboardLogic useEffect (auth check): calling getCurrentPageId for pathname:", pathname);
    const pageId = getCurrentPageId();
    console.log("DashboardLogic useEffect (auth check): pageId determined as:", pageId, "Current user:", user);
    
    if (!user) {
      console.log("DashboardLogic useEffect (auth check): No user found, redirecting to login with from:", pathname);
      const loginUrl = new URL('/login', window.location.origin);
      loginUrl.searchParams.set('from', pathname);
      router.replace(loginUrl.toString());
      return;
    }

    console.log("DashboardLogic useEffect (auth check): User found. Checking permissions for pageId:", pageId, "User role:", user.role);
    if (pageId && pageId !== "settings" && !hasPermission(pageId, "view")) {
      console.log("DashboardLogic useEffect (auth check): No view permission for pageId:", pageId, "Redirecting to /dashboard. User permissions:", user.permissions);
      router.replace("/dashboard");
    } else {
      console.log("DashboardLogic useEffect (auth check): Has view permission for pageId:", pageId, "or page is settings/root dashboard.");
    }
  }, [pathname, user, router, authIsLoading]);

  useEffect(() => {
    console.log("DashboardLogic useEffect (refreshData): triggered", { authIsLoading, user });
    if (!authIsLoading && user) {
      console.log("DashboardLogic useEffect (refreshData): User found and auth not loading, calling refreshData().");
      refreshData();
    }
  }, [authIsLoading, user, refreshData]);

  return <>{children}</>;
} 