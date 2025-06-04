"use client"

import { useAuth } from "@/contexts/auth-context"

export default function SettingsPage() {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <p>사용자 정보를 불러오는 중입니다...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">설정 (테스트)</h1>
        <p className="text-muted-foreground">현재 사용자: {currentUser.email}</p>
        <p className="text-muted-foreground">이 페이지가 보이면 기본적인 로딩은 성공한 것입니다.</p>
      </div>
    </div>
  )
}
