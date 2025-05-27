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
    // Ensure role comparison is exact
    if (user.role && user.role.trim() === "admin") {
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

    // Check if user is undefined (context might still be initializing)
    if (user === undefined) {
        console.log("DashboardLogic useEffect (auth check): user is undefined (context initializing?), returning.");
        return;
    }

    console.log("DashboardLogic useEffect (auth check): calling getCurrentPageId for pathname:", pathname);
    const pageId = getCurrentPageId();
    console.log("DashboardLogic useEffect (auth check): pageId determined as:", pageId, "Current user object:", JSON.stringify(user)); // Log entire user object
    
    if (!user) { 
      console.error("DashboardLogic useEffect (auth check): CRITICAL - No user found AFTER authIsLoading is false. Redirecting to login. Pathname:", pathname);
      const loginUrl = new URL('/login', window.location.origin);
      // Prevent adding 'from' query param if already on login page or for _next internal routes
      if (pathname !== "/login" && !pathname.startsWith("/_next/")) {
          loginUrl.searchParams.set('from', pathname);
      }
      router.replace(loginUrl.toString());
      return;
    }

    // User is present, and auth is not loading
    console.log("DashboardLogic useEffect (auth check): User found. User role:", user.role, "Checking permissions for pageId:", pageId);
    if (pageId && pageId !== "settings" && !hasPermission(pageId, "view")) {
      console.error("DashboardLogic useEffect (auth check): CRITICAL - No view permission for pageId:", pageId, "Redirecting to /dashboard. User:", JSON.stringify(user));
      router.replace("/dashboard"); 
    } else {
      console.log("DashboardLogic useEffect (auth check): Has view permission for pageId:", pageId, "or page is settings/root dashboard.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user, authIsLoading, router]); // Removed hasPermission, as it's stable if not rememoized

  useEffect(() => {
    console.log("DashboardLogic useEffect (refreshData): triggered", { authIsLoading, user });
    if (!authIsLoading && user) {
      console.log("DashboardLogic useEffect (refreshData): User found and auth not loading, calling refreshData().");
      refreshData();
    }
  }, [authIsLoading, user, refreshData]);

  return <>{children}</>;
} 