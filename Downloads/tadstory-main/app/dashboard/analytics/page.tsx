"use client"

import { useState } from "react"
import { Calendar, ChevronDown, Download, Filter, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Mock data for daily usage
const dailyUsageData = [
  {
    date: "2025-05-15",
    totalItems: 1245,
    inbound: 120,
    outbound: 85,
    avgTemperature: -18.2,
    capacityUsage: 78,
    alerts: 0,
  },
  {
    date: "2025-05-14",
    totalItems: 1210,
    inbound: 95,
    outbound: 130,
    avgTemperature: -18.3,
    capacityUsage: 76,
    alerts: 1,
  },
  {
    date: "2025-05-13",
    totalItems: 1245,
    inbound: 150,
    outbound: 75,
    avgTemperature: -18.1,
    capacityUsage: 79,
    alerts: 0,
  },
  {
    date: "2025-05-12",
    totalItems: 1170,
    inbound: 85,
    outbound: 110,
    avgTemperature: -18.0,
    capacityUsage: 74,
    alerts: 2,
  },
  {
    date: "2025-05-11",
    totalItems: 1195,
    inbound: 105,
    outbound: 90,
    avgTemperature: -18.2,
    capacityUsage: 75,
    alerts: 0,
  },
  {
    date: "2025-05-10",
    totalItems: 1180,
    inbound: 70,
    outbound: 65,
    avgTemperature: -18.3,
    capacityUsage: 74,
    alerts: 0,
  },
  {
    date: "2025-05-09",
    totalItems: 1175,
    inbound: 90,
    outbound: 85,
    avgTemperature: -18.4,
    capacityUsage: 73,
    alerts: 1,
  },
]

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("week")

  // Format date to Korean format (YYYY년 MM월 DD일)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  // Get status badge for temperature
  const getTemperatureBadge = (temp: number) => {
    if (temp > -18.0) return <Badge variant="destructive">주의</Badge>
    if (temp < -18.5) return <Badge variant="warning">낮음</Badge>
    return <Badge variant="outline">정상</Badge>
  }

  // Get status badge for capacity
  const getCapacityBadge = (usage: number) => {
    if (usage > 90) return <Badge variant="destructive">포화</Badge>
    if (usage > 80) return <Badge variant="warning">높음</Badge>
    if (usage < 50) return <Badge variant="secondary">낮음</Badge>
    return <Badge variant="outline">정상</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">분석</h1>
        <p className="text-muted-foreground">창고 성능 지표 및 인사이트</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Select defaultValue={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="기간 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">지난 주</SelectItem>
            <SelectItem value="month">지난 달</SelectItem>
            <SelectItem value="quarter">지난 분기</SelectItem>
            <SelectItem value="year">지난 해</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            날짜 범위
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            필터
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                내보내기
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem>Export as PDF</DropdownMenuItem>
              <DropdownMenuItem>Export as Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Daily Usage of Cold Storage Section */}
      <Card>
        <CardHeader>
          <CardTitle>일일 냉장 창고 사용량</CardTitle>
          <CardDescription>일별 창고 사용 현황 및 주요 지표</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>총 품목 수</TableHead>
                  <TableHead>입고량</TableHead>
                  <TableHead>출고량</TableHead>
                  <TableHead>평균 온도 (°C)</TableHead>
                  <TableHead>용량 사용률 (%)</TableHead>
                  <TableHead>알림</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyUsageData.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="font-medium">{formatDate(day.date)}</TableCell>
                    <TableCell>{day.totalItems}</TableCell>
                    <TableCell className="text-green-600">+{day.inbound}</TableCell>
                    <TableCell className="text-red-600">-{day.outbound}</TableCell>
                    <TableCell>
                      {day.avgTemperature} {getTemperatureBadge(day.avgTemperature)}
                    </TableCell>
                    <TableCell>
                      {day.capacityUsage}% {getCapacityBadge(day.capacityUsage)}
                    </TableCell>
                    <TableCell>
                      {day.alerts > 0 ? (
                        <Badge variant="destructive">{day.alerts}</Badge>
                      ) : (
                        <Badge variant="outline">0</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            데이터 새로고침
          </Button>
          <p className="text-sm text-muted-foreground">마지막 업데이트: 오늘 09:45 AM</p>
        </CardFooter>
      </Card>

      {/* Daily Revenue Section (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>일일 매출</CardTitle>
          <CardDescription>향후 구현 예정인 일별 매출 데이터</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">이 섹션은 향후 디자인 계획에 따라 구현될 예정입니다.</p>
            <p className="text-sm text-muted-foreground">추가 요구사항이 제공되면 구현될 예정입니다.</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <p className="text-sm text-muted-foreground">구현 예정</p>
        </CardFooter>
      </Card>
    </div>
  )
}
