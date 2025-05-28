// tadstory-main/app/page.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/login")
  }, []) // 컴포넌트 마운트 시 한 번만 실행하도록 의존성 배열을 비워둡니다.

  return null // 리디렉션 중에는 아무것도 렌더링하지 않음 (또는 로딩 스피너 등을 표시할 수 있습니다)
}
