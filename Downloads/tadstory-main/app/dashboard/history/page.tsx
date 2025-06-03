"use client"

import { useState, useEffect } from "react"
import { RotateCcw, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useStorage } from "@/contexts/storage-context"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// 히스토리 로그 타입 정의
interface HistoryLog {
  id: string
  timestamp: string
  action: string
  target: string
  details: string
  user: string
  type: "rack" | "product" | "category" | "user" | "system"
}

// 페이지당 로그 수
const LOGS_PER_PAGE = 10

export default function HistoryPage() {
  const { racks, productCodes, categories, isLoading } = useStorage()
  const [filterType, setFilterType] = useState("all")
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([])
  const [isRestoringData, setIsRestoringData] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)

  // 복원 확인 대화상자 상태
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)

  // 히스토리 로그 생성 (실제로는 API에서 가져올 데이터)
  const generateHistoryLogs = () => {
    if (isLoading) return []

    // 현재 날짜 기준으로 최근 7일 동안의 로그 생성
    const now = new Date()
    const logs: HistoryLog[] = []

    // 랙 관련 로그
    racks.forEach((rack, index) => {
      if (index < 5) {
        const date = new Date(now)
        date.setDate(date.getDate() - Math.floor(Math.random() * 7))

        logs.push({
          id: `rack-add-${Date.now()}-${index}`,
          timestamp: date.toISOString(),
          action: "랙 추가",
          target: rack.name,
          details: `라인 ${rack.line}에 랙 ${rack.name} 추가됨`,
          user: "관리자",
          type: "rack",
        })
      }

      if (index < 3) {
        const date = new Date(now)
        date.setDate(date.getDate() - Math.floor(Math.random() * 7))

        logs.push({
          id: `rack-edit-${Date.now()}-${index}`,
          timestamp: date.toISOString(),
          action: "랙 수정",
          target: rack.name,
          details: `랙 ${rack.name}의 정보가 수정됨`,
          user: "관리자",
          type: "rack",
        })
      }

      if (index < 2) {
        const date = new Date(now)
        date.setDate(date.getDate() - Math.floor(Math.random() * 7))

        logs.push({
          id: `rack-delete-${Date.now()}-${index}`,
          timestamp: date.toISOString(),
          action: "랙 삭제",
          target: `A${index + 10}`,
          details: `라인 A에서 랙 A${index + 10} 삭제됨`,
          user: "관리자",
          type: "rack",
        })
      }
    })

    // 품목 관련 로그
    productCodes.forEach((product, index) => {
      if (index < 5) {
        const date = new Date(now)
        date.setDate(date.getDate() - Math.floor(Math.random() * 7))

        logs.push({
          id: `product-add-${Date.now()}-${index}`,
          timestamp: date.toISOString(),
          action: "품목 추가",
          target: product.code,
          details: `새 품목 ${product.code} (${product.name}) 추가됨`,
          user: "관리자",
          type: "product",
        })
      }

      if (index < 3) {
        const date = new Date(now)
        date.setDate(date.getDate() - Math.floor(Math.random() * 7))

        logs.push({
          id: `product-edit-${Date.now()}-${index}`,
          timestamp: date.toISOString(),
          action: "품목 수정",
          target: product.code,
          details: `품목 ${product.code}의 정보가 수정됨`,
          user: "관리자",
          type: "product",
        })
      }

      if (index < 2) {
        const date = new Date(now)
        date.setDate(date.getDate() - Math.floor(Math.random() * 7))

        logs.push({
          id: `product-delete-${Date.now()}-${index}`,
          timestamp: date.toISOString(),
          action: "품목 삭제",
          target: `PROD-${index + 100}`,
          details: `품목 PROD-${index + 100} 삭제됨`,
          user: "관리자",
          type: "product",
        })
      }
    })

    // 카테고리 관련 로그
    categories.forEach((category, index) => {
      if (index < 3) {
        const date = new Date(now)
        date.setDate(date.getDate() - Math.floor(Math.random() * 7))

        logs.push({
          id: `category-add-${Date.now()}-${index}`,
          timestamp: date.toISOString(),
          action: "카테고리 추가",
          target: category.name,
          details: `새 카테고리 "${category.name}" 추가됨`,
          user: "관리자",
          type: "category",
        })
      }

      if (index < 2) {
        const date = new Date(now)
        date.setDate(date.getDate() - Math.floor(Math.random() * 7))

        logs.push({
          id: `category-edit-${Date.now()}-${index}`,
          timestamp: date.toISOString(),
          action: "카테고리 수정",
          target: category.name,
          details: `카테고리 "${category.name}"의 이름이 변경됨`,
          user: "관리자",
          type: "category",
        })
      }

      if (index < 1) {
        const date = new Date(now)
        date.setDate(date.getDate() - Math.floor(Math.random() * 7))

        logs.push({
          id: `category-delete-${Date.now()}-${index}`,
          timestamp: date.toISOString(),
          action: "카테고리 삭제",
          target: "삭제된 카테고리",
          details: `카테고리 "삭제된 카테고리" 삭제됨`,
          user: "관리자",
          type: "category",
        })
      }
    })

    // 날짜순으로 정렬 (최신순)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return logs
  }

  useEffect(() => {
    const logs = generateHistoryLogs()
    setHistoryLogs(logs)
  }, [racks, productCodes, categories, isLoading])

  // 새로고침 핸들러
  const handleRefresh = () => {
    setIsRefreshing(true)

    // 데이터 새로고침 효과
    setTimeout(() => {
      const refreshedLogs = generateHistoryLogs()
      setHistoryLogs(refreshedLogs)
      setIsRefreshing(false)
      toast.success("히스토리 로그를 새로고침했습니다.")
    }, 500)
  }

  // 필터링된 로그 가져오기
  const getFilteredLogs = () => {
    let filtered = historyLogs

    // 유형 필터링
    if (filterType !== "all") {
      filtered = filtered.filter((log) => log.type === filterType)
    }

    return filtered
  }

  // 페이지네이션된 로그 가져오기
  const getPaginatedLogs = () => {
    const filteredLogs = getFilteredLogs()
    const startIndex = (currentPage - 1) * LOGS_PER_PAGE
    return filteredLogs.slice(startIndex, startIndex + LOGS_PER_PAGE)
  }

  // 총 페이지 수 계산
  const totalPages = Math.ceil(getFilteredLogs().length / LOGS_PER_PAGE)

  // 페이지 변경 함수
  const changePage = (page: number) => {
    setCurrentPage(page)
  }

  // 이전 페이지로 이동
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // 다음 페이지로 이동
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // 필터 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1)
  }, [filterType])

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
  }

  // 로그 타입에 따른 배지 색상
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "rack":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
            랙
          </Badge>
        )
      case "product":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">
            품목
          </Badge>
        )
      case "category":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-100">
            카테고리
          </Badge>
        )
      case "user":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 hover:bg-purple-100">
            사용자
          </Badge>
        )
      case "system":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-100">
            시스템
          </Badge>
        )
      default:
        return <Badge variant="outline">기타</Badge>
    }
  }

  // 복원 확인 대화상자 열기
  const openRestoreDialog = (logId: string) => {
    setSelectedLogId(logId)
    setRestoreDialogOpen(true)
  }

  // 복원 실행 함수
  const executeRestore = () => {
    setIsRestoringData(true)

    // 선택한 로그 찾기
    const selectedLog = historyLogs.find((log) => log.id === selectedLogId)

    // 복원 시뮬레이션 (실제로는 API 호출)
    setTimeout(() => {
      setIsRestoringData(false)

      if (selectedLog) {
        toast.success(`${selectedLog.action} 이전 상태로 복원되었습니다.`, {
          description: `${formatDate(selectedLog.timestamp)}의 변경사항이 취소되었습니다.`,
        })
      }
    }, 1500)
  }

  if (isLoading) {
    return <HistorySkeleton />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">히스토리</h1>
        <p className="text-muted-foreground">시스템 변경 이력 및 활동 로그</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Select defaultValue={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="유형 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 유형</SelectItem>
              <SelectItem value="rack">랙</SelectItem>
              <SelectItem value="product">품목</SelectItem>
              <SelectItem value="category">카테고리</SelectItem>
              <SelectItem value="user">사용자</SelectItem>
              <SelectItem value="system">시스템</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 히스토리 로그 테이블 */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>시스템 활동 로그</CardTitle>
            <CardDescription>랙, 품목, 카테고리 관련 모든 변경 사항</CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="rounded-full h-8 w-8"
            title="새로고침"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            <span className="sr-only">새로고침</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시간</TableHead>
                  <TableHead>작업</TableHead>
                  <TableHead>대상</TableHead>
                  <TableHead>상세 내용</TableHead>
                  <TableHead>사용자</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead className="text-right">복원</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getPaginatedLogs().map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{formatDate(log.timestamp)}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.target}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                    <TableCell>{log.user}</TableCell>
                    <TableCell>{getTypeBadge(log.type)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRestoreDialog(log.id)}
                        disabled={isRestoringData}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {getPaginatedLogs().length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      표시할 로그가 없습니다
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <p className="text-sm text-muted-foreground">총 {getFilteredLogs().length}개의 로그가 표시됨</p>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" onClick={goToPreviousPage} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">이전 페이지</span>
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => changePage(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button variant="outline" size="icon" onClick={goToNextPage} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">다음 페이지</span>
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* 복원 확인 대화상자 */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>복원 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedLogId
                ? `이 작업 이전 상태로 시스템을 복원하시겠습니까? 이 작업 이후의 모든 변경사항이 취소됩니다.`
                : "시스템을 복원하시겠습니까?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                executeRestore()
                setRestoreDialogOpen(false)
              }}
            >
              복원
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">히스토리</h1>
        <p className="text-muted-foreground">시스템 변경 이력 및 활동 로그</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[180px]" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="p-4">
              <div className="flex items-center space-x-4 py-4">
                <Skeleton className="h-4 w-[15%]" />
                <Skeleton className="h-4 w-[10%]" />
                <Skeleton className="h-4 w-[10%]" />
                <Skeleton className="h-4 w-[30%]" />
                <Skeleton className="h-4 w-[10%]" />
                <Skeleton className="h-4 w-[10%]" />
                <Skeleton className="h-4 w-[10%]" />
              </div>
              {Array(5)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 py-4">
                    <Skeleton className="h-4 w-[15%]" />
                    <Skeleton className="h-4 w-[10%]" />
                    <Skeleton className="h-4 w-[10%]" />
                    <Skeleton className="h-4 w-[30%]" />
                    <Skeleton className="h-4 w-[10%]" />
                    <Skeleton className="h-4 w-[10%]" />
                    <Skeleton className="h-4 w-[10%]" />
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-8 w-[200px]" />
        </CardFooter>
      </Card>
    </div>
  )
}
