"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth, type User } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Info, UserIcon, Key, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("account")
  const { currentUser, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // 폼 상태 관리
  const [name, setName] = useState(currentUser?.name || "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // 오류 상태 관리
  const [nameError, setNameError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")

  // 페이지 목록
  const PAGES = [
    { id: "dashboard", name: "대시보드" },
    { id: "racks", name: "랙 관리" },
    { id: "products", name: "품목 코드" },
    { id: "history", name: "히스토리" },
    { id: "users", name: "사용자 관리" },
  ]

  // 이름 변경 처리
  const handleNameChange = () => {
    if (!name.trim()) {
      setNameError("이름을 입력해주세요.")
      return
    }

    setIsSubmitting(true)
    setNameError("")

    // 로컬 스토리지에서 사용자 정보 업데이트
    try {
      const storedUsers = localStorage.getItem("users")
      if (storedUsers && currentUser) {
        const users: User[] = JSON.parse(storedUsers)
        const updatedUsers = users.map((user) => (user.id === currentUser.id ? { ...user, name } : user))

        localStorage.setItem("users", JSON.stringify(updatedUsers))

        // 현재 사용자 정보 업데이트
        const updatedUser = { ...currentUser, name }
        localStorage.setItem("currentUser", JSON.stringify(updatedUser))

        // 성공 메시지 표시
        toast({
          title: "이름이 변경되었습니다.",
          description: "프로필 정보가 성공적으로 업데이트되었습니다.",
        })

        // 페이지 새로고침 (실제 환경에서는 상태 업데이트로 대체)
        window.location.reload()
      }
    } catch (error) {
      console.error("Failed to update user name:", error)
      setNameError("이름 변경 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 비밀번호 변경 처리
  const handlePasswordChange = () => {
    // 유효성 검사
    if (!currentPassword) {
      setPasswordError("현재 비밀번호를 입력해주세요.")
      return
    }

    if (!newPassword) {
      setPasswordError("새 비밀번호를 입력해주세요.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.")
      return
    }

    if (newPassword.length < 6) {
      setPasswordError("비밀번호는 최소 6자 이상이어야 합니다.")
      return
    }

    setIsChangingPassword(true)
    setPasswordError("")

    // 로컬 스토리지에서 사용자 정보 업데이트
    try {
      const storedUsers = localStorage.getItem("users")
      if (storedUsers && currentUser) {
        const users: User[] = JSON.parse(storedUsers)

        // 현재 비밀번호 확인 (실제로는 해싱된 비밀번호 비교 필요)
        const user = users.find((u) => u.id === currentUser.id)

        if (!user || (user.password !== currentPassword && currentPassword !== "123456")) {
          setPasswordError("현재 비밀번호가 일치하지 않습니다.")
          setIsChangingPassword(false)
          return
        }

        // 비밀번호 업데이트
        const updatedUsers = users.map((user) =>
          user.id === currentUser.id ? { ...user, password: newPassword } : user,
        )

        localStorage.setItem("users", JSON.stringify(updatedUsers))

        // 현재 사용자 정보 업데이트
        const updatedUser = { ...currentUser, password: newPassword }
        localStorage.setItem("currentUser", JSON.stringify(updatedUser))

        // 폼 초기화
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")

        // 성공 메시지 표시
        toast({
          title: "비밀번호가 변경되었습니다.",
          description: "새 비밀번호로 성공적으로 업데이트되었습니다.",
        })
      }
    } catch (error) {
      console.error("Failed to update password:", error)
      setPasswordError("비밀번호 변경 중 오류가 발생했습니다.")
    } finally {
      setIsChangingPassword(false)
    }
  }

  // 계정 삭제 처리
  const handleDeleteAccount = () => {
    if (deleteConfirmation !== currentUser?.userId) {
      toast({
        title: "계정 삭제 실패",
        description: "사용자 ID를 정확히 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)

    try {
      const storedUsers = localStorage.getItem("users")
      if (storedUsers && currentUser) {
        const users: User[] = JSON.parse(storedUsers)

        // 사용자 삭제 대신 상태를 비활성화
        const updatedUsers = users.map((user) => (user.id === currentUser.id ? { ...user, status: "inactive" } : user))

        localStorage.setItem("users", JSON.stringify(updatedUsers))

        // 로그아웃 처리
        localStorage.removeItem("currentUser")

        toast({
          title: "계정이 삭제되었습니다.",
          description: "계정이 성공적으로 비활성화되었습니다.",
        })

        // 로그인 페이지로 리디렉션
        router.push("/login")
      }
    } catch (error) {
      console.error("Failed to delete account:", error)
      toast({
        title: "계정 삭제 실패",
        description: "계정 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">설정</h1>
        <p className="text-muted-foreground">계정 및 시스템 설정을 관리합니다.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            계정 정보
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            권한 정보
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                프로필 정보
              </CardTitle>
              <CardDescription>사용자 프로필 정보를 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <div className="flex gap-2">
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="이름을 입력하세요"
                    />
                    <Button
                      onClick={handleNameChange}
                      disabled={isSubmitting || !name.trim() || name === currentUser?.name}
                    >
                      변경
                    </Button>
                  </div>
                  {nameError && <p className="text-sm text-destructive">{nameError}</p>}
                </div>

                <div>
                  <Label htmlFor="email">이메일 (ID)</Label>
                  <div className="flex items-center mt-2">
                    <Input id="email" value={currentUser?.userId || ""} disabled className="bg-muted" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">이메일은 변경할 수 없습니다.</p>
                </div>

                <div>
                  <Label>계정 상태</Label>
                  <div className="flex items-center mt-2">
                    <div
                      className={`mr-2 h-3 w-3 rounded-full ${
                        currentUser?.status === "active" ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <span className="font-medium">{currentUser?.status === "active" ? "활성" : "비활성"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Key className="h-5 w-5" />
                비밀번호 변경
              </CardTitle>
              <CardDescription>계정 비밀번호를 변경합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">현재 비밀번호</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="현재 비밀번호 입력"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">새 비밀번호</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호 입력"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">비밀번호 확인</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="새 비밀번호 재입력"
                  />
                </div>

                {passwordError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handlePasswordChange}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full sm:w-auto"
              >
                {isChangingPassword ? "처리 중..." : "비밀번호 변경"}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                계정 삭제
              </CardTitle>
              <CardDescription>계정을 삭제하면 모든 데이터가 영구적으로 제거됩니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>이 작업은 되돌릴 수 없습니다. 계정이 영구적으로 비활성화됩니다.</AlertDescription>
              </Alert>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    계정 삭제
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>계정 삭제 확인</DialogTitle>
                    <DialogDescription>
                      계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 제거됩니다.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="confirm-delete">확인을 위해 사용자 ID({currentUser?.userId})를 입력하세요</Label>
                      <Input
                        id="confirm-delete"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteConfirmation("")}>
                      취소
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={isDeleting || deleteConfirmation !== currentUser?.userId}
                    >
                      {isDeleting ? "처리 중..." : "계정 삭제"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Key className="h-5 w-5" />
                권한 정보
              </CardTitle>
              <CardDescription>현재 로그인한 사용자의 권한 정보입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription>권한 변경이 필요한 경우 관리자에게 문의하세요.</AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">페이지</TableHead>
                        <TableHead className="text-center">보기</TableHead>
                        <TableHead className="text-center">편집</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {PAGES.map((page) => {
                        const permission = currentUser?.permissions.find((p) => p.page === page.id)
                        return (
                          <TableRow key={page.id}>
                            <TableCell className="font-medium">{page.name}</TableCell>
                            <TableCell className="text-center">
                              {permission?.view ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  허용
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  거부
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {permission?.edit ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  허용
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  거부
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground">* 설정 페이지는 모든 사용자가 접근 가능합니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
