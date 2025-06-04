"use client"

import type React from "react"
import { useState, useEffect } from "react" // useEffect 추가 (필요시)
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation" // useRouter 추가
import { Grid3x3, History, Home, LogOut, Package, Settings, Users, Menu as MenuIcon } from "lucide-react" // MenuIcon 추가
import Image from "next/image"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { StorageProvider } from "@/contexts/storage-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu" // DropdownMenuTrigger 추가
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
  { title: "대시보드", href: "/dashboard", icon: Home, id: "dashboard" },
  { title: "랙 보기", href: "/dashboard/racks", icon: Grid3x3, id: "racks" },
  { title: "품목 코드", href: "/dashboard/products", icon: Package, id: "products" },
  { title: "히스토리", href: "/dashboard/history", icon: History, id: "history" },
  { title: "사용자 관리", href: "/dashboard/users", icon: Users, id: "users" },
  { title: "설정", href: "/dashboard/settings", icon: Settings, id: "settings" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter(); // DashboardLayout에서도 router 사용 가능하도록 추가
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { user, logout, isLoading: authIsLoading, hasPermission } = useAuth();


  const accessibleNavItems = navItems.filter((item) => {
    // settings 페이지는 user가 있으면 항상 접근 가능, 그 외에는 hasPermission 사용
    if (item.id === "settings") return !!user; 
    return hasPermission(item.id, "view");
  });

  // 최우선: AuthProvider가 로딩 중이면 무조건 로딩 화면 표시
  if (authIsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading application...</p>
      </div>
    );
  }
  
  // AuthProvider 로딩이 끝났으나 사용자가 없는 경우 (DashboardLogic이 리디렉션 처리)
  // 이 경우 DashboardLogic이 /login으로 보낼 것이므로, 여기서 null을 반환하여 렌더링을 막거나,
  // DashboardLogic이 children을 렌더링하지 않도록 처리해야 함.
  // DashboardLogic에서 이미 처리하고 있으므로, 여기서는 DashboardLogic을 신뢰하고 진행.

  return (
    <StorageProvider>
      <DashboardLogic> {/* DashboardLogic이 인증 및 권한에 따른 리디렉션 처리 */}
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" aria-label="메뉴 열기">
                  <MenuIcon className="h-5 w-5" /> {/* 아이콘 변경 */}
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
            {user && (
              <div className="flex items-center gap-4">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-auto justify-start gap-2">
                            {user?.name || user?.email || "사용자"} 
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    {hasPermission("settings", "view") && ( // settings는 view 권한만 체크 (또는 user 존재 여부만)
                        <DropdownMenuItem asChild>
                        <Link href="/dashboard/settings">설정</Link>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={async () => {
                        await logout();
                        // 로그아웃 후 /login으로의 리디렉션은 AuthProvider의 onAuthStateChange에서 처리
                    }}>로그아웃</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                {/* 중복 로그아웃 버튼 제거 가능
                <Button variant="ghost" size="icon" onClick={logout} aria-label="로그아웃">
                  <LogOut className="h-5 w-5" />
                </Button>
                */}
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
