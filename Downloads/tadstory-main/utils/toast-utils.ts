// 간단한 토스트 메시지 표시 유틸리티
export function showToast(message: string, type: "success" | "error" | "info" = "info") {
  // 기존 토스트 요소가 있으면 제거
  const existingToast = document.getElementById("simple-toast")
  if (existingToast) {
    document.body.removeChild(existingToast)
  }

  // 새 토스트 요소 생성
  const toast = document.createElement("div")
  toast.id = "simple-toast"
  toast.style.position = "fixed"
  toast.style.bottom = "20px"
  toast.style.right = "20px"
  toast.style.padding = "12px 20px"
  toast.style.borderRadius = "4px"
  toast.style.zIndex = "9999"
  toast.style.minWidth = "250px"
  toast.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)"
  toast.style.transition = "all 0.3s ease"
  toast.style.opacity = "0"
  toast.style.transform = "translateY(20px)"

  // 타입에 따른 스타일 설정
  if (type === "success") {
    toast.style.backgroundColor = "#10B981"
    toast.style.color = "white"
  } else if (type === "error") {
    toast.style.backgroundColor = "#EF4444"
    toast.style.color = "white"
  } else {
    toast.style.backgroundColor = "#3B82F6"
    toast.style.color = "white"
  }

  toast.textContent = message
  document.body.appendChild(toast)

  // 애니메이션 효과
  setTimeout(() => {
    toast.style.opacity = "1"
    toast.style.transform = "translateY(0)"
  }, 10)

  // 3초 후 제거
  setTimeout(() => {
    toast.style.opacity = "0"
    toast.style.transform = "translateY(20px)"

    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast)
      }
    }, 300)
  }, 3000)
}
