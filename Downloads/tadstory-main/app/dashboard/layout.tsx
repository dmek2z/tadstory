"use client"

// console.log("--- DashboardLayout: Script loaded (top level) ---"); // Debug log, can be removed

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Grid3x3, History, Home, LogOut, Package, Settings, Users } from "lucide-react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { StorageProvider } from "@/contexts/storage-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu" // Corrected: DropdownMenuItem was missing
import { useAuth } from "@/contexts/auth-context"
import DashboardLogic from "@/components/DashboardLogic"
import type { Permission } from "@/contexts/auth-context"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  id: string
}

const navItems: NavItem[] = [
  {
    title: "대시보드",
    href: "/dashboard",
    icon: Home,
    id: "dashboard",
  },
  {
    title: "랙 보기",
    href: "/dashboard/racks",
    icon: Grid3x3,
    id: "racks",
  },
  {
    title: "품목 코드",
    href: "/dashboard/products",
    icon: Package,
    id: "products",
  },
  {
    title: "히스토리",
    href: "/dashboard/history",
    icon: History,
    id: "history",
  },
  {
    title: "사용자 관리",
    href: "/dashboard/users",
    icon: Users,
    id: "users",
  },
  {
    title: "설정",
    href: "/dashboard/settings",
    icon: Settings,
    id: "settings",
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // console.log("--- DashboardLayout: Component rendering ---"); // Debug log
  const pathname = usePathname()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const { user, logout, isLoading: authIsLoading } = useAuth()

  // console.log("--- DashboardLayout: Auth state ---", { user, authIsLoading }); // Debug log

  // Permission check logic - re-enabled
  const hasPermission = (pageId: string, permissionType: "view" | "edit"): boolean => {
    // console.log("DashboardLayout hasPermission called for:", { pageId, permissionType, userRole: user?.role, authIsLoading }); // Debug log
    if (authIsLoading || !user) {
      // console.log("DashboardLayout hasPermission: auth loading or no user, returning false."); // Debug log
      return false;
    }
    if (user.role && user.role.trim() === "admin") { // Added trim() for safety
      // console.log("DashboardLayout hasPermission: user is admin, returning true."); // Debug log
      return true;
    }
    const permission = user.permissions.find((p: Permission) => p.page === pageId);
    const result = permission ? permission[permissionType] : false;
    // console.log("DashboardLayout hasPermission: found permission object:", permission, "Result:", result); // Debug log
    return result;
  }

  // console.log("DashboardLayout: Calculating accessibleNavItems. Current user:", user, "Auth loading:", authIsLoading); // Debug log
  const accessibleNavItems = navItems.filter((item) => {
    const canAccess = hasPermission(item.id, "view");
    // console.log(`DashboardLayout: Checking nav item \'${item.id}\', canAccess (view):`, canAccess); // Debug log
    return canAccess;
  });
  // console.log("DashboardLayout: Calculated accessibleNavItems:", accessibleNavItems); // Debug log

  if (authIsLoading && !user) { // Show loading only if user is not yet available
    // console.log("--- DashboardLayout: Auth is loading, rendering loading state (user not yet available) ---"); // Debug log
    return (
      <div className="flex h-screen items-center justify-center">
        {/* Replace with a proper loading spinner/component if available */}
        <p>Loading application...</p>
      </div>
    );
  }
  
  // If auth is done, and still no user, redirect to login (should be handled by DashboardLogic or middleware primarily)
  // This is a fallback.
  if (!authIsLoading && !user) {
      // console.error("--- DashboardLayout: No user after loading, redirecting to login (fallback) ---"); // Debug log
      // This redirection might conflict with middleware or DashboardLogic.
      // Consider if this is truly needed here or if middleware/DashboardLogic is sufficient.
      // For now, let DashboardLogic handle redirection if user is null.
      // router.replace(\'/login\'); // Potentially problematic, let DashboardLogic handle it.
      // return <p>Redirecting to login...</p>; // Show a message while redirecting
  }


  return (
    <StorageProvider>
      <DashboardLogic> {/* DashboardLogic will handle redirects if user is null or lacks permission */}
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" aria-label="메뉴 열기">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b pb-4">
                    <Image
                      src="/images/tad-story-logo.png"
                      alt="TAD STORY"
                      width={150}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  <nav className="grid gap-2">
                    {accessibleNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileNavOpen(false)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                          pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.title}
                      </Link>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <Image
                src="/images/tad-story-logo.png"
                alt="TAD STORY"
                width={150}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="flex-1" />
            {user && ( // Show user-related elements only if user exists
              <div className="flex items-center gap-4">
                 <DropdownMenu>
                    {/* Ensure DropdownMenuTrigger is used if needed, or that parent element can trigger */}
                    <Button variant="ghost" className="relative h-8 w-auto justify-start gap-2">
                        {user?.name || user?.email || "사용자"} 
                    </Button>
                    <DropdownMenuContent align="end">
                    {hasPermission("settings", "view") && (
                        <DropdownMenuItem asChild>
                        <Link href="/dashboard/settings">설정</Link>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={logout}>로그아웃</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" onClick={logout} aria-label="로그아웃">
                  <LogOut className="h-5 w-5" />
                  {/* <span className="sr-only">로그아웃</span> */}
                </Button>
              </div>
            )}
          </header>
          <div className="flex flex-1">
            <aside className="hidden w-64 border-r bg-muted/40 md:block">
              <nav className="grid gap-2 p-4">
                {accessibleNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.title}
                  </Link>
                ))}
              </nav>
            </aside>
            <main className="flex-1 p-4 md:p-6">{children}</main>
          </div>
        </div>
      </DashboardLogic>
    </StorageProvider>
  )
}
