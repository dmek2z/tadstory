"use client"

import type React from "react"

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
import { showToast } from "@/utils/toast-utils"; // 또는 shadcn/ui useToast 사용

export default function LoginPage() {
  const router = useRouter()
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false); // handleLogin 내부의 로딩 상태
  const { login, currentUser, isLoading: authIsLoading } = useAuth()

  const [saveId, setSaveId] = useState(false)
  const [autoLogin, setAutoLogin] = useState(false)


  // 1. 이미 로그인된 경우 또는 currentUser 상태 변경 시 대시보드로 리다이렉트
  useEffect(() => {
    // authLoading이 false이고 currentUser가 있으면 대시보드로 이동
    if (!authIsLoading && currentUser) {
      console.log("LoginPage: User already logged in or session restored, redirecting to dashboard.");
      router.push("/dashboard")
    }
  }, [currentUser, authIsLoading, router])

  // 2. 컴포넌트 마운트 시 저장된 아이디 및 자동 로그인 상태 로드
  useEffect(() => {
    const savedUserId = localStorage.getItem("savedUserId")
    const attemptAutoLogin = localStorage.getItem("autoLogin") === "true"

    if (savedUserId) {
      setUserId(savedUserId)
      setSaveId(true)
    }

    if (attemptAutoLogin && savedUserId) { // savedUserId도 확인
      setAutoLogin(true)
      if (!currentUser && !authIsLoading) { // 아직 인증 로딩 중이 아니고, 유저도 없을 때만 자동 로그인 시도
        console.log("LoginPage: Attempting auto login for", savedUserId);
        handleAutoLoginAttempt(savedUserId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // authIsLoading, currentUser 의존성 제거하여 마운트 시 한 번만 실행되도록 함


  // 3. 자동 로그인 시도 함수
  const handleAutoLoginAttempt = async (savedId: string | null) => {
    const savedPassword = localStorage.getItem("savedPassword")

    if (savedId && savedPassword) {
      setIsSubmitting(true)
      try {
        const success = await login(savedId, savedPassword);
        if (success) {
          // 성공 시 AuthProvider의 onAuthStateChange가 currentUser를 업데이트하고
          // 위의 useEffect가 /dashboard로 리다이렉션할 것입니다.
          // 여기서 router.push를 명시적으로 호출할 필요는 없습니다.
          console.log("LoginPage: Auto login successful for", savedId);
        } else {
          localStorage.removeItem("savedPassword");
          console.warn("LoginPage: Auto login failed for", savedId);
          // 자동 로그인은 실패해도 사용자에게 직접적인 알림은 생략할 수 있음
          setIsSubmitting(false);
        }
      } catch (error: any) {
        console.error("LoginPage: Auto login error -", error.message);
        localStorage.removeItem("savedPassword");
        setIsSubmitting(false);
      }
      // 성공 시에는 페이지 이동이 발생하므로 isSubmitting을 false로 설정할 필요가 없을 수 있음
      // 하지만 명시적으로 실패/에러 시에만 false로 설정
    }
  };

  // 4. 일반 로그인 처리 함수
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (userId !== "admin" && !emailRegex.test(userId)) {
      alert("유효한 이메일 주소를 입력해주세요.");
      return
    }

    setIsSubmitting(true) // UI 로딩 시작

    if (saveId) {
      localStorage.setItem("savedUserId", userId)
    } else {
      localStorage.removeItem("savedUserId")
    }

    if (autoLogin) {
      localStorage.setItem("autoLogin", "true")
      localStorage.setItem("savedPassword", password) // 보안상 매우 위험!
    } else {
      localStorage.removeItem("autoLogin")
      localStorage.removeItem("savedPassword")
    }

    try {
      const success = await login(userId, password); // login 함수는 Promise<boolean> 반환 가정

      if (success) {
        // 로그인 성공 시 AuthProvider가 currentUser를 업데이트하고,
        // 페이지 상단의 useEffect가 /dashboard로 리디렉션합니다.
        // 여기서 명시적으로 router.push('/dashboard')를 호출하지 않아도 됩니다.
        // setIsLoading(false)도 페이지 이동으로 인해 필요 없을 수 있습니다.
        console.log("LoginPage: Manual login successful for", userId);
        // 성공 토스트는 여기서 보여주거나, 대시보드에서 "환영합니다" 등으로 표시 가능
        // showToast("로그인 성공!", "success"); // 이 시점에는 이미 대시보드로 리다이렉션 중일 수 있음
      } else {
        // login 함수가 false를 반환한 경우 (예: 잘못된 자격 증명)
        alert("아이디 또는 비밀번호가 올바르지 않습니다.");
        setIsSubmitting(false);
      }
    } catch (error: any) {
      // login 함수가 에러를 throw한 경우 (예: 네트워크 오류)
      console.error("LoginPage: Login failed with error -", error.message);
      alert(error.message || "로그인 중 오류가 발생했습니다.");
      setIsSubmitting(false);
    }
  }

  // 5. AuthProvider가 초기 인증 상태를 로드 중일 때 로딩 UI 표시
  // currentUser가 없고 authLoading 중일 때만 전체 페이지 로더 표시
  // (currentUser가 이미 있다면, 위의 useEffect에 의해 대시보드로 리디렉션될 것임)
  if (authIsLoading && !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <p className="text-sm text-gray-500">세션 확인 중...</p>
        </div>
      </div>
    )
  }

  // 6. 로그인 폼 UI (currentUser가 있더라도 authLoading이 false가 될 때까지 대기 후 리디렉션)
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
                disabled={isSubmitting || authIsLoading}
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
                  disabled={isSubmitting || authIsLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting || authIsLoading}
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
                  disabled={isSubmitting || authIsLoading}
                />
                <Label htmlFor="saveId" className="text-sm">아이디 저장</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoLogin"
                  checked={autoLogin}
                  onCheckedChange={(checked) => setAutoLogin(checked === true)}
                  disabled={isSubmitting || authIsLoading}
                />
                <Label htmlFor="autoLogin" className="text-sm">자동 로그인</Label>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isSubmitting || authIsLoading}>
              {isSubmitting || authIsLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                  처리 중...
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
