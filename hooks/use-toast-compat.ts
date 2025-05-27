"use client"

import { showToast } from "@/utils/toast-utils"

// 호환성을 위한 useToast 훅
export function useToast() {
  return {
    toast: (props: { title?: string; description?: string }) => {
      const message = props.description || props.title || ""
      showToast(message, "info")
    },
  }
}

// 직접 import할 수 있도록 re-export
export { showToast }
