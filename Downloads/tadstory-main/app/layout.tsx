// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css" //
import { ThemeProvider } from "@/components/theme-provider" //
import { AuthProvider } from "@/contexts/auth-context" //

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TAD STORY",
  description: "냉동창고 관리 시스템",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider> {/* AuthProvider가 ThemeProvider 내부에 위치 */}
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
