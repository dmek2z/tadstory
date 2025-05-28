"use client"

import type React from "react" // React 타입 명시적으로 임포트

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LogIn } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // 페이지 자체의 로딩 상태 (버튼 등)
  const [saveId, setSaveId] = useState(false)
  const [autoLogin, setAutoLogin] = useState(false)
  const { login, currentUser, isLoading: authLoading } = useAuth() // authLoading은 AuthProvider의 로딩 상태

  // 1. 이미 로그인된 경우 또는 currentUser 상태 변경 시 대시보드로 리다이렉트
  useEffect(() => {
    if (currentUser && !authLoading) {
      router.push("/dashboard")
    }
  }, [currentUser, router, authLoading])

  // 2. 컴포넌트 마운트 시 저장된 아이디 및 자동 로그인 상태 로드
  useEffect(() => {
    const savedUserId = localStorage.getItem("savedUserId")
    const attemptAutoLogin = localStorage.getItem("autoLogin") === "true"

    if (savedUserId) {
      setUserId(savedUserId)
      setSaveId(true)
    }

    if (attemptAutoLogin) {
      setAutoLogin(true)
      // 자동 로그인 시도 (비밀번호는 localStorage에서 직접 가져와 사용)
      // 이 useEffect는 의존성 배열이 비어있으므로 마운트 시 한 번만 실행됩니다.
      // currentUser가 아직 없을 때 자동 로그인을 시도합니다.
      if (!currentUser) { // 이미 로그인 세션이 있을 수 있으므로 확인
        handleAutoLoginAttempt(savedUserId) // 저장된 ID로 자동 로그인 시도
      }
    }
  }, []) // 빈 의존성 배열로 마운트 시 한 번만 실행

  // 3. 자동 로그인 시도 함수 (비밀번호는 localStorage에서 가져옴)
  const handleAutoLoginAttempt = async (savedId: string | null) => {
    const savedPassword = localStorage.getItem("savedPassword") // 보안상 위험!

    if (savedId && savedPassword) {
      setIsLoading(true) // UI 로딩 상태 활성화
      try {
        const success = await login(savedId, savedPassword)
        if (!success) {
          // 자동 로그인 실패 (잘못된 자격 증명 등) - 사용자에게 알리지 않을 수 있음
          localStorage.removeItem("savedPassword") // 실패 시 저장된 비밀번호 제거
          setIsLoading(false)
        }
        // 성공 시: AuthProvider가 currentUser를 업데이트하고,
        // 위의 useEffect가 감지하여 /dashboard로 리다이렉션합니다.
        // 여기서 setIsLoading(false)를 명시적으로 호출할 필요는 없을 수 있습니다 (페이지 이동).
      } catch (error) {
        console.error("Auto login failed:", error)
        localStorage.removeItem("savedPassword") // 에러 발생 시에도 제거
        setIsLoading(false) // UI 로딩 상태 비활성화
      }
    }
  }

  // 4. 일반 로그인 처리 함수
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (userId !== "admin" && !emailRegex.test(userId)) {
      alert("유효한 이메일 주소를 입력해주세요.")
      return
    }

    setIsLoading(true)

    if (saveId) {
      localStorage.setItem("savedUserId", userId)
    } else {
      localStorage.removeItem("savedUserId")
    }

    if (autoLogin) {
      localStorage.setItem("autoLogin", "true")
      localStorage.setItem("savedPassword", password) // 실제 환경에서는 보안상 매우 권장되지 않음!
    } else {
      localStorage.removeItem("autoLogin")
      localStorage.removeItem("savedPassword")
    }

    try {
      const success = await login(userId, password) // 비동기 login 함수 호출

      if (success) {
        // 로그인 성공: AuthProvider가 currentUser를 업데이트하고,
        // 위의 useEffect가 감지하여 /dashboard로 리다이렉션합니다.
        // 여기서 setIsLoading(false)를 호출할 필요는 없습니다 (페이지 이동).
      } else {
        // 로그인 실패 (잘못된 자격 증명 등, useAuth의 login 함수가 false 반환 시)
        alert("아이디 또는 비밀번호가 올바르지 않습니다.")
        setIsLoading(false)
      }
    } catch (error: any) {
      // 로그인 중 시스템/네트워크 오류 발생 (useAuth의 login 함수가 에러 throw 시)
      console.error("Login failed:", error)
      alert(error.message || "로그인 중 오류가 발생했습니다.")
      setIsLoading(false)
    }
  }

  // 5. AuthProvider가 초기 인증 상태를 로드 중일 때 로딩 UI 표시
  if (authLoading && !currentUser) { // currentUser가 없으면서 authLoading 중일 때만 전체 페이지 로더
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <p className="text-sm text-gray-500">세션 확인 중...</p>
        </div>
      </div>
    )
  }

  // 6. 로그인 폼 UI
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/tad-story-logo.png"
              alt="TAD STORY"
              width={180}
              height={60}
              className="object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">냉동 창고 관리 시스템</CardTitle>
          <CardDescription>창고 관리 시스템에 접속하기 위해 로그인 정보를 입력하세요</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">아이디</Label>
              <Input
                id="userId"
                type="text"
                placeholder="아이디 입력"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                disabled={isLoading} // 로딩 중 입력 방지
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading} // 로딩 중 입력 방지
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading} // 로딩 중 버튼 비활성화
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="sr-only">{showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}</span>
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="saveId"
                  checked={saveId}
                  onCheckedChange={(checked) => setSaveId(checked === true)}
                  disabled={isLoading}
                />
                <Label htmlFor="saveId" className="text-sm">아이디 저장</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoLogin"
                  checked={autoLogin}
                  onCheckedChange={(checked) => setAutoLogin(checked === true)}
                  disabled={isLoading}
                />
                <Label htmlFor="autoLogin" className="text-sm">자동 로그인</Label>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isLoading || authLoading}> {/* authLoading도 고려 */}
              {isLoading ? ( // 여기서는 페이지 자체의 isLoading 사용
                <div className="flex items-center">
                  <svg /* SVG 스피너 */ className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                  로그인 중...
                </div>
              ) : (
                <div className="flex items-center"> <LogIn className="mr-2 h-4 w-4" /> 로그인 </div>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
