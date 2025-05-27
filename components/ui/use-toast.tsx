"use client"

import * as React from "react"
import { ToastActionElement, type ToastProps } from "@/components/ui/toast"
import * as ToastPrimitives from "@radix-ui/react-toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

type Toast = Omit<ToasterToast, "id">

const ToastContext = React.createContext<{
  toasts: ToasterToast[]
  addToast: (toast: Toast) => void
  removeToast: (id: string) => void
}>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([])

  const addToast = React.useCallback((toast: Toast) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }].slice(0, TOAST_LIMIT))
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {toasts.map((toast) => (
        <ToastPrimitives.Root
          key={toast.id}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setTimeout(() => removeToast(toast.id), TOAST_REMOVE_DELAY)
            }
          }}
        >
          <ToastPrimitives.Title>{toast.title}</ToastPrimitives.Title>
          <ToastPrimitives.Description>{toast.description}</ToastPrimitives.Description>
          {toast.action}
        </ToastPrimitives.Root>
      ))}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export const toast = (props: Toast) => {
  const { addToast } = useToast()
  addToast(props)
}
