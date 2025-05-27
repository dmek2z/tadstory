"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Grid3x3, History, Home, LogOut, Package, Settings, Users } from "lucide-react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { StorageProvider } from "@/contexts/storage-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { useStorage } from "@/contexts/storage-context"

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
  const pathname = usePathname()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const { currentUser, logout, hasPermission, isLoading: authIsLoading } = useAuth()
  const { refreshData } = useStorage()
  const router = useRouter()

  const getCurrentPageId = (): string => {
    if (pathname === "/dashboard" || pathname === "/dashboard/") return "dashboard"
    const segments = pathname.replace(/\/$/, "").split("/")
    if (segments.length >= 3 && segments[1] === "dashboard" && segments[2]) {
      return segments[2]
    }
    return ""
  }

  useEffect(() => {
    if (authIsLoading) {
      return
    }

    const pageId = getCurrentPageId()
    
    if (!currentUser) {
      const loginUrl = new URL('/login', window.location.origin)
      loginUrl.searchParams.set('from', pathname)
      router.replace(loginUrl.toString())
      return
    }

    if (pageId && pageId !== "settings" && !hasPermission(pageId, "view")) {
      router.replace("/dashboard")
    }
  }, [pathname, currentUser, router, hasPermission, authIsLoading])

  // 페이지 로드 시 데이터 새로고침
  useEffect(() => {
    if (!authIsLoading && currentUser) {
      refreshData()
    }
  }, [authIsLoading, currentUser, refreshData])

  // 접근 가능한 네비게이션 아이템 필터링
  const accessibleNavItems = navItems.filter((item) => hasPermission(item.id, "view"))

  return (
    <StorageProvider>
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
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <div className="font-medium">{currentUser?.name || "관리자"}</div>
              <DropdownMenuContent align="end">
                {hasPermission("settings", "view") && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">설정</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout}>로그아웃</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-5 w-5" />
              <span className="sr-only">로그아웃</span>
            </Button>
          </div>
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
    </StorageProvider>
  )
}
