"use client"

import { useEffect, useState } from "react"

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // 초기 설정
    setIsMobile(window.innerWidth < 768)

    // 리사이즈 이벤트 리스너
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // 이벤트 리스너 등록
    window.addEventListener("resize", handleResize)

    // 클린업 함수
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return isMobile
}

// useMobile 별칭 추가
export const useMobile = useIsMobile
