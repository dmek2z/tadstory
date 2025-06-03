"use client"

import { useState, useEffect } from "react"
import { Pencil, Search, Shield, Trash2, User, UserPlus, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { showToast } from "@/utils/toast-utils"

// Types
interface Permission {
  page: string
  view: boolean
  edit: boolean
}

interface UserType {
  id: string
  userId: string
  name: string
  password?: string
  status: "active" | "inactive"
  permissions: Permission[]
}

// 페이지 목록
const PAGES = [
  { id: "dashboard", name: "대시보드" },
  { id: "racks", name: "랙 관리" },
  { id: "products", name: "품목 코드" },
  { id: "history", name: "히스토리" },
  { id: "users", name: "사용자 관리" },
]

// 권한 템플릿
const PERMISSION_TEMPLATES = [
  {
    id: "admin",
    name: "관리자",
    permissions: PAGES.map((page) => ({
      page: page.id,
      view: true,
      edit: true,
    })),
  },
  {
    id: "manager",
    name: "매니저",
    permissions: PAGES.map((page) => ({
      page: page.id,
      view: true,
      edit: page.id !== "users",
    })),
  },
  {
    id: "viewer",
    name: "뷰어",
    permissions: PAGES.map((page) => ({
      page: page.id,
      view: true,
      edit: false,
    })),
  },
]

// Mock data
const generateMockUsers = (): UserType[] => {
  const users: UserType[] = [
    {
      id: "user-1",
      userId: "admin",
      name: "홍길동",
      status: "active",
      permissions: PAGES.map((page) => ({
        page: page.id,
        view: true,
        edit: true,
      })),
    },
    // QA 테스트용 계정 추가
    {
      id: "user-test",
      userId: "test@test.com",
      name: "테스트 계정",
      password: "123456", // 실제 서비스에서는 해싱 필요
      status: "active",
      permissions: PAGES.map((page) => ({
        page: page.id,
        view: true,
        edit: true,
      })),
    },
  ]

  // Generate additional users
  const firstNames = ["김", "이", "박", "최", "정", "강", "조", "윤", "장"]
  const lastNames = ["민준", "서연", "예준", "지우", "도윤", "하은", "지호", "서현", "준서"]

  for (let i = 2; i <= 10; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const fullName = firstName + lastName

    const status = Math.random() > 0.2 ? "active" : "inactive"
    const userId = `user${i}`

    // Generate random permissions
    const permissions = PAGES.map((page) => ({
      page: page.id,
      view: Math.random() > 0.2,
      edit: Math.random() > 0.6,
    }))

    users.push({
      id: `user-${i}`,
      userId,
      name: fullName,
      status,
      permissions,
    })
  }

  return users
}

export default function UsersPage() {
  // 사용자 목록 상태
  const [userList, setUserList] = useState<UserType[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // 다이얼로그 상태
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // 현재 선택된 사용자
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)

  // 폼 상태
  const [activeTab, setActiveTab] = useState("basic")
  const [formName, setFormName] = useState("")
  const [formUserId, setFormUserId] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formStatus, setFormStatus] = useState(true)
  const [formPermissions, setFormPermissions] = useState<Permission[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState("")

  // 폼 오류
  const [formErrors, setFormErrors] = useState<{
    name?: string
    userId?: string
    password?: string
  }>({})

  // 폼 제출 시도 여부
  const [formSubmitAttempted, setFormSubmitAttempted] = useState(false)

  // 초기 데이터 로드
  useEffect(() => {
    const initialUsers = generateMockUsers()
    setUserList(initialUsers)

    // 클라이언트 측에서만 실행
    if (typeof window !== "undefined") {
      // 로컬 스토리지에 사용자 정보 저장 (로그인 시스템 연동용)
      localStorage.setItem("users", JSON.stringify(initialUsers))
    }
  }, [])

  // 사용자 목록 변경 시 로컬 스토리지 업데이트
  useEffect(() => {
    if (userList.length > 0 && typeof window !== "undefined") {
      localStorage.setItem("users", JSON.stringify(userList))
    }
  }, [userList])

  // 폼 초기화
  const resetForm = () => {
    setFormName("")
    setFormUserId("")
    setFormPassword("")
    setFormStatus(true)
    setFormPermissions(
      PAGES.map((page) => ({
        page: page.id,
        view: false,
        edit: false,
      })),
    )
    setSelectedTemplate("")
    setFormErrors({})
    setFormSubmitAttempted(false)
    setActiveTab("basic")
  }

  // 사용자 추가 다이얼로그 열기
  const handleOpenAddDialog = () => {
    resetForm()
    setAddDialogOpen(true)
  }

  // 사용자 수정 다이얼로그 열기
  const handleOpenEditDialog = (user: UserType) => {
    setCurrentUser(user)

    // 폼 데이터 설정
    setFormName(user.name)
    setFormUserId(user.userId)
    setFormPassword("")
    setFormStatus(user.status === "active")

    // 권한 데이터 깊은 복사 및 현재 페이지 목록에 맞게 필터링
    const permissionsCopy = user.permissions
      .filter((p) => PAGES.some((page) => page.id === p.page))
      .map((p) => ({ ...p }))

    // 누락된 페이지 권한 추가
    PAGES.forEach((page) => {
      if (!permissionsCopy.some((p) => p.page === page.id)) {
        permissionsCopy.push({
          page: page.id,
          view: false,
          edit: false,
        })
      }
    })

    setFormPermissions(permissionsCopy)

    // 권한 템플릿 확인
    checkPermissionTemplate(permissionsCopy)

    setFormErrors({})
    setFormSubmitAttempted(false)
    setActiveTab("basic")
    setEditDialogOpen(true)
  }

  // 권한 수정 다이얼로그 열기
  const handleOpenPermissionsDialog = (user: UserType) => {
    setCurrentUser(user)

    // 권한 데이터 깊은 복사 및 현재 페이지 목록에 맞게 필터링
    const permissionsCopy = user.permissions
      .filter((p) => PAGES.some((page) => page.id === p.page))
      .map((p) => ({ ...p }))

    // 누락된 페이지 권한 추가
    PAGES.forEach((page) => {
      if (!permissionsCopy.some((p) => p.page === page.id)) {
        permissionsCopy.push({
          page: page.id,
          view: false,
          edit: false,
        })
      }
    })

    setFormPermissions(permissionsCopy)

    // 권한 템플릿 확인
    checkPermissionTemplate(permissionsCopy)

    setPermissionsDialogOpen(true)
  }

  // 삭제 다이얼로그 열기
  const handleOpenDeleteDialog = (user: UserType) => {
    setCurrentUser(user)
    setDeleteDialogOpen(true)
  }

  // 권한 템플릿 확인
  const checkPermissionTemplate = (permissions: Permission[]) => {
    for (const template of PERMISSION_TEMPLATES) {
      let isMatch = true

      for (const tp of template.permissions) {
        const up = permissions.find((p) => p.page === tp.page)
        if (!up || up.view !== tp.view || up.edit !== tp.edit) {
          isMatch = false
          break
        }
      }

      if (isMatch) {
        setSelectedTemplate(template.id)
        return
      }
    }

    setSelectedTemplate("")
  }

  // 폼 유효성 검사
  const validateForm = (isEdit = false) => {
    const errors: {
      name?: string
      userId?: string
      password?: string
    } = {}

    if (!formName.trim()) {
      errors.name = "이름을 입력해주세요"
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formUserId.trim()) {
      errors.userId = "이메일을 입력해주세요"
    } else if (!emailRegex.test(formUserId)) {
      errors.userId = "유효한 이메일 형식이 아닙니다"
    } else {
      // 아이디 중복 검사 (수정 시 자기 자신은 제외)
      const isDuplicate = userList.some(
        (user) => user.userId === formUserId && (!isEdit || user.id !== currentUser?.id),
      )
      if (isDuplicate) {
        errors.userId = "이미 사용 중인 이메일입니다"
      }
    }

    // 새 사용자 추가 시에만 비밀번호 필수
    if (!isEdit && !formPassword.trim()) {
      errors.password = "비밀번호를 입력해주세요"
    } else if (formPassword.trim() && formPassword.length < 6) {
      errors.password = "비밀번호는 6자 이상이어야 합니다"
    }

    setFormErrors(errors)
    setFormSubmitAttempted(true)
    return Object.keys(errors).length === 0
  }

  // 권한 업데이트
  const handlePermissionChange = (pageId: string, field: "view" | "edit", value: boolean) => {
    const updatedPermissions = formPermissions.map((perm) => {
      if (perm.page === pageId) {
        // 보기 권한을 끄면 편집 권한도 끔
        if (field === "view" && !value) {
          return { ...perm, view: false, edit: false }
        }
        // 편집 권한을 켜면 보기 권한도 켬
        if (field === "edit" && value) {
          return { ...perm, view: true, edit: true }
        }
        return { ...perm, [field]: value }
      }
      return perm
    })

    setFormPermissions(updatedPermissions)
    checkPermissionTemplate(updatedPermissions)
  }

  // 권한 템플릿 적용
  const handleApplyTemplate = (templateId: string) => {
    const template = PERMISSION_TEMPLATES.find((t) => t.id === templateId)
    if (template) {
      // 깊은 복사를 통해 템플릿 권한 복사
      const permissionsCopy = template.permissions.map((p) => ({ ...p }))
      setFormPermissions(permissionsCopy)
      setSelectedTemplate(templateId)
    }
  }

  // 사용자 추가
  const handleAddUser = () => {
    if (!validateForm()) return

    const newUser: UserType = {
      id: `user-${Date.now()}`,
      userId: formUserId,
      name: formName,
      password: formPassword,
      status: formStatus ? "active" : "inactive",
      permissions: formPermissions,
    }

    setUserList((prev) => [...prev, newUser])
    showToast(`${newUser.name} 사용자가 추가되었습니다.`, "success")
    resetForm()
    setAddDialogOpen(false)
  }

  // 사용자 수정
  const handleUpdateUser = () => {
    if (!validateForm(true) || !currentUser) return

    // Create a deep copy of the permissions to ensure they're properly saved
    const permissionsCopy = [...formPermissions.map((p) => ({ ...p }))]

    const updatedUsers = userList.map((user) => {
      if (user.id === currentUser.id) {
        return {
          ...user,
          name: formName,
          userId: formUserId,
          ...(formPassword ? { password: formPassword } : {}),
          status: formStatus ? "active" : "inactive",
          permissions: permissionsCopy,
        }
      }
      return user
    })

    setUserList(updatedUsers)
    showToast(`${formName} 사용자 정보가 수정되었습니다.`, "success")
    resetForm()
    setCurrentUser(null)
    setEditDialogOpen(false)
  }

  // 권한 수정
  const handleUpdatePermissions = () => {
    if (!currentUser) return

    const updatedUsers = userList.map((user) => {
      if (user.id === currentUser.id) {
        // 기존 권한 중 현재 페이지 목록에 없는 것들 유지
        const existingPermissions = user.permissions.filter((p) => !PAGES.some((page) => page.id === p.page))

        // 새 권한과 병합
        const mergedPermissions = [...existingPermissions, ...formPermissions]

        return {
          ...user,
          permissions: mergedPermissions,
        }
      }
      return user
    })

    setUserList(updatedUsers)
    showToast(`${currentUser.name} 사용자의 권한이 수정되었습니다.`, "success")
    setCurrentUser(null)
    setPermissionsDialogOpen(false)
  }

  // 사용자 삭제
  const handleDeleteUser = () => {
    if (!currentUser) return

    const updatedUsers = userList.filter((user) => user.id !== currentUser.id)
    setUserList(updatedUsers)
    showToast(`${currentUser.name} 사용자가 삭제되었습니다.`, "error")
    setCurrentUser(null)
    setDeleteDialogOpen(false)
  }

  // 사용자 상태 토글
  const handleToggleStatus = (user: UserType) => {
    const updatedUsers = userList.map((u) => {
      if (u.id === user.id) {
        const newStatus = u.status === "active" ? "inactive" : "active"
        return {
          ...u,
          status: newStatus,
        }
      }
      return u
    })

    setUserList(updatedUsers)

    const updatedUser = updatedUsers.find((u) => u.id === user.id)

    showToast(
      `${updatedUser?.name} 사용자가 ${updatedUser?.status === "active" ? "활성화" : "비활성화"} 되었습니다.`,
      "info",
    )
  }

  // 권한 요약 정보
  const getPermissionSummary = (user: UserType) => {
    // 현재 페이지 목록에 있는 권한만 필터링
    const currentPagePermissions = user.permissions.filter((p) => PAGES.some((page) => page.id === p.page))

    const viewCount = currentPagePermissions.filter((p) => p.view).length
    const editCount = currentPagePermissions.filter((p) => p.edit).length

    return (
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="bg-blue-50">
          보기: {viewCount}/{PAGES.length}
        </Badge>
        <Badge variant="outline" className="bg-green-50">
          편집: {editCount}/{PAGES.length}
        </Badge>
      </div>
    )
  }

  // 검색 필터링된 사용자 목록
  const filteredUsers = userList.filter((user) => {
    return (
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.userId.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // 폼 오류 요약 메시지
  const getFormErrorSummary = () => {
    if (!formSubmitAttempted || Object.keys(formErrors).length === 0) return null

    return (
      <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
        <AlertCircle className="h-5 w-5" />
        <p>입력 정보에 오류가 있습니다. 위의 내용을 확인해주세요.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">사용자 관리</h1>
        <p className="text-muted-foreground">사용자 계정 및 권한 관리</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="사용자 검색..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Button onClick={handleOpenAddDialog}>
          <UserPlus className="mr-2 h-4 w-4" /> 사용자 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>사용자</CardTitle>
          <CardDescription>사용자 계정 및 권한 관리</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>사용자</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>권한</TableHead>
                <TableHead className="w-[180px]">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                    </TableCell>
                    <TableCell>{user.userId}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div
                          className={`mr-2 h-2 w-2 rounded-full ${user.status === "active" ? "bg-green-500" : "bg-gray-300"}`}
                        />
                        {user.status === "active" ? "활성" : "비활성"}
                      </div>
                    </TableCell>
                    <TableCell>{getPermissionSummary(user)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(user)}>
                          <Pencil className="h-4 w-4 mr-1" />
                          수정
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenPermissionsDialog(user)}>
                          <Shield className="h-4 w-4 mr-1" />
                          권한
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleOpenDeleteDialog(user)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          삭제
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    <div className="flex flex-col items-center justify-center">
                      <User className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">사용자를 찾을 수 없습니다</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 사용자 추가 다이얼로그 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 사용자 추가</DialogTitle>
            <DialogDescription>적절한 권한을 가진 새 사용자 계정 생성</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">기본 정보</TabsTrigger>
              <TabsTrigger value="permissions">권한 설정</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="name">이름</Label>
                    <Input
                      id="name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="사용자 이름"
                      className={formErrors.name ? "border-red-500" : ""}
                    />
                    {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userId">이메일</Label>
                    <Input
                      id="userId"
                      value={formUserId}
                      onChange={(e) => setFormUserId(e.target.value)}
                      placeholder="이메일 주소"
                      className={formErrors.userId ? "border-red-500" : ""}
                    />
                    {formErrors.userId && <p className="text-sm text-red-500">{formErrors.userId}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">비밀번호</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="비밀번호"
                      className={formErrors.password ? "border-red-500" : ""}
                    />
                    {formErrors.password && <p className="text-sm text-red-500">{formErrors.password}</p>}
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Switch id="status" checked={formStatus} onCheckedChange={setFormStatus} />
                    <Label htmlFor="status">계정 활성화</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base">권한 템플릿</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PERMISSION_TEMPLATES.map((template) => (
                      <Button
                        key={template.id}
                        type="button"
                        variant={selectedTemplate === template.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleApplyTemplate(template.id)}
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <Label className="text-base mb-2 block">페이지별 권한</Label>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>페이지</TableHead>
                          <TableHead className="text-center">보기</TableHead>
                          <TableHead className="text-center">편집</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {PAGES.map((page) => {
                          const permission = formPermissions.find((p) => p.page === page.id)
                          return (
                            <TableRow key={page.id}>
                              <TableCell>{page.name}</TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={permission?.view || false}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(page.id, "view", checked === true)
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={permission?.edit || false}
                                  disabled={!(permission?.view || false)}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(page.id, "edit", checked === true)
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">* 편집 권한을 부여하려면 보기 권한이 필요합니다</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {getFormErrorSummary()}

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                setAddDialogOpen(false)
              }}
            >
              취소
            </Button>
            <Button onClick={handleAddUser}>사용자 추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 사용자 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>사용자 정보 수정</DialogTitle>
            <DialogDescription>사용자 정보 및 권한을 수정합니다</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">기본 정보</TabsTrigger>
              <TabsTrigger value="permissions">권한 설정</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">이름</Label>
                    <Input
                      id="edit-name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="사용자 이름"
                      className={formErrors.name ? "border-red-500" : ""}
                    />
                    {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-userId">이메일</Label>
                    <Input
                      id="edit-userId"
                      value={formUserId}
                      onChange={(e) => setFormUserId(e.target.value)}
                      placeholder="이메일 주소"
                      className={formErrors.userId ? "border-red-500" : ""}
                    />
                    {formErrors.userId && <p className="text-sm text-red-500">{formErrors.userId}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-password">비밀번호 (변경 시에만 입력)</Label>
                    <Input
                      id="edit-password"
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="비밀번호를 변경하려면 입력하세요"
                      className={formErrors.password ? "border-red-500" : ""}
                    />
                    {formErrors.password && <p className="text-sm text-red-500">{formErrors.password}</p>}
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Switch id="edit-status" checked={formStatus} onCheckedChange={setFormStatus} />
                    <Label htmlFor="edit-status">계정 활성화</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base">권한 템플릿</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PERMISSION_TEMPLATES.map((template) => (
                      <Button
                        key={template.id}
                        type="button"
                        variant={selectedTemplate === template.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleApplyTemplate(template.id)}
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <Label className="text-base mb-2 block">페이지별 권한</Label>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>페이지</TableHead>
                          <TableHead className="text-center">보기</TableHead>
                          <TableHead className="text-center">편집</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {PAGES.map((page) => {
                          const permission = formPermissions.find((p) => p.page === page.id)
                          return (
                            <TableRow key={page.id}>
                              <TableCell>{page.name}</TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={permission?.view || false}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(page.id, "view", checked === true)
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={permission?.edit || false}
                                  disabled={!(permission?.view || false)}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(page.id, "edit", checked === true)
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">* 편집 권한을 부여하려면 보기 권한이 필요합니다</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {getFormErrorSummary()}

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                setCurrentUser(null)
                setEditDialogOpen(false)
              }}
            >
              취소
            </Button>
            <Button onClick={handleUpdateUser}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 권한 수정 다이얼로그 */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>사용자 권한 수정</DialogTitle>
            <DialogDescription>{currentUser?.name}의 페이지별 권한을 설정합니다</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-base">권한 템플릿</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PERMISSION_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    type="button"
                    variant={selectedTemplate === template.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleApplyTemplate(template.id)}
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="my-4" />

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>페이지</TableHead>
                    <TableHead className="text-center">보기</TableHead>
                    <TableHead className="text-center">편집</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PAGES.map((page) => {
                    const permission = formPermissions.find((p) => p.page === page.id)
                    return (
                      <TableRow key={page.id}>
                        <TableCell>{page.name}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={permission?.view || false}
                            onCheckedChange={(checked) => handlePermissionChange(page.id, "view", checked === true)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={permission?.edit || false}
                            disabled={!(permission?.view || false)}
                            onCheckedChange={(checked) => handlePermissionChange(page.id, "edit", checked === true)}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground">* 편집 권한을 부여하려면 보기 권한이 필요합니다</p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                setCurrentUser(null)
                setPermissionsDialogOpen(false)
              }}
            >
              취소
            </Button>
            <Button onClick={handleUpdatePermissions}>권한 저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 사용자 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>사용자 삭제</DialogTitle>
            <DialogDescription>
              사용자 "{currentUser?.name}"을(를) 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setCurrentUser(null)
                setDeleteDialogOpen(false)
              }}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
