"use client"

console.log("--- DashboardLayout: Script loaded (top level) ---");

import type React from "react"
// import { useState } from "react" // Temporarily unused
// import Link from "next/link" // Temporarily unused
// import { usePathname } from "next/navigation" // Temporarily unused
// import { Grid3x3, History, Home, LogOut, Package, Settings, Users } from "lucide-react" // Temporarily unused
// import Image from "next/image" // Temporarily unused

// import { cn } from "@/lib/utils" // Temporarily unused
// import { Button } from "@/components/ui/button" // Temporarily unused
// import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet" // Temporarily unused
// import { StorageProvider } from "@/contexts/storage-context" // Temporarily REMOVED
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu" // Temporarily unused
import { useAuth } from "@/contexts/auth-context"
// import DashboardLogic from "@/components/DashboardLogic" // Temporarily REMOVED
// import type { Permission } from "@/contexts/auth-context" // Temporarily unused

// interface NavItem { // Temporarily unused
//   title: string
//   href: string
//   icon: React.ElementType
//   id: string
// }

// const navItems: NavItem[] = [ // Temporarily unused
//   {
//     title: "대시보드",
//     href: "/dashboard",
//     icon: Home,
//     id: "dashboard",
//   },
//   // ... other nav items
// ]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log("--- DashboardLayout: Component rendering ---");
  // const pathname = usePathname() // Temporarily unused
  // const [isMobileNavOpen, setIsMobileNavOpen] = useState(false) // Temporarily unused
  const { user, logout, isLoading: authIsLoading } = useAuth()

  console.log("--- DashboardLayout: Auth state ---", { user, authIsLoading });

  // const hasPermission = (pageId: string, permissionType: "view" | "edit"): boolean => { // Temporarily unused
  //   console.log("DashboardLayout hasPermission called for:", { pageId, permissionType, userRole: user?.role, authIsLoading });
  //   if (authIsLoading || !user) {
  //     console.log("DashboardLayout hasPermission: auth loading or no user, returning false.");
  //     return false;
  //   }
  //   if (user.role === "admin") {
  //     console.log("DashboardLayout hasPermission: user is admin, returning true.");
  //     return true;
  //   }
  //   const permission = user.permissions.find((p: Permission) => p.page === pageId);
  //   const result = permission ? permission[permissionType] : false;
  //   console.log("DashboardLayout hasPermission: found permission object:", permission, "Result:", result);
  //   return result;
  // }

  // console.log("DashboardLayout: Calculating accessibleNavItems. Current user:", user, "Auth loading:", authIsLoading);
  // const accessibleNavItems = navItems.filter((item) => { // Temporarily unused
  //   const canAccess = hasPermission(item.id, "view");
  //   console.log(`DashboardLayout: Checking nav item '${item.id}', canAccess (view):`, canAccess);
  //   return canAccess;
  // });
  // console.log("DashboardLayout: Calculated accessibleNavItems:", accessibleNavItems);

  if (authIsLoading) {
    console.log("--- DashboardLayout: Auth is loading, rendering loading state ---");
    return (
      <div>
        <h1>Auth Loading...</h1>
        <p>Please wait.</p>
      </div>
    );
  }

  // Simplified structure, removing StorageProvider and DashboardLogic temporarily
  return (
    // <StorageProvider> // Temporarily REMOVED
    //   <DashboardLogic> // Temporarily REMOVED
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        {/* Simplified Header */}
        <div>TAD STORY - Simplified Layout</div>
        <div style={{ marginLeft: 'auto' }}>
          {user ? (
            <>
              <span>User: {user.email} (Role: {user.role})</span>
              <button onClick={logout} style={{ marginLeft: '10px' }}>Logout</button>
            </>
          ) : (
            <span>User not logged in.</span>
          )}
        </div>
      </header>
      <div className="flex flex-1">
        {/* Simplified Sidebar (optional, can be removed too) */}
        <aside className="hidden w-64 border-r bg-muted/40 md:block">
          <nav className="grid gap-2 p-4">
            <p>Simplified Nav</p>
          </nav>
        </aside>
        <main className="flex-1 p-4 md:p-6">
          {user ? children : <h1>Please log in to see dashboard content.</h1>}
        </main>
      </div>
      {/* </DashboardLogic> // Temporarily REMOVED */}
    {/* </StorageProvider> // Temporarily REMOVED */}
    </div>
  )
}
