"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { CheckCircle, Grid3x3, Package, ShoppingBag, XCircle } from "lucide-react"
import nextDynamic from "next/dynamic"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "@/components/ui/chart"
import { useStorage } from "@/contexts/storage-context"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from '@/lib/supabaseClient'

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"]
const ChartPieClient = nextDynamic(() => import("@/components/ChartPieClient"), { ssr: false })

export default function DashboardPage() {
  const { products, racks, categories, users, isLoading, productCodes } = useStorage()
  const [storageDistributionData, setStorageDistributionData] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    if (isLoading) return

    // Generate rack distribution data by category
    const categoryFloorCount: Record<string, number> = {}

    // 카테고리 초기화 (모든 카테고리가 표시되도록)
    categories.forEach((category) => {
      categoryFloorCount[category.name] = 0
    })

    // 제품 코드를 카테고리에 매핑하는 맵 생성 (productCodes 사용)
    const productCodeToCategoryMap: Record<string, string> = {}
    if (Array.isArray(productCodes)) {
      productCodes.forEach((pc) => {
        productCodeToCategoryMap[pc.code] = pc.category
      })
    }

    // 코드 접두사를 카테고리에 매핑하는 맵 생성 (fallback용)
    const prefixToCategoryMap: Record<string, string> = {}
    if (Array.isArray(productCodes)) {
      productCodes.forEach((pc) => {
        const prefix = pc.code.split("-")[0]
        prefixToCategoryMap[prefix] = pc.category
      })
    }

    // 각 랙에서 제품 카테고리별 층 수 계산
    racks.forEach((rack) => {
      if (!rack.products || rack.products.length === 0) return // 빈 랙은 건너뛰기

      rack.products.forEach((product) => {
        // 1. 정확한 제품 코드로 카테고리 찾기
        let category = productCodeToCategoryMap[product.code]

        // 2. 정확한 매칭이 없으면 접두사로 카테고리 찾기
        if (!category) {
          const codePrefix = product.code.split("-")[0]
          category = prefixToCategoryMap[codePrefix]
        }

        // 3. 여전히 카테고리가 없으면 기본값 사용
        if (!category && categories.length > 0) {
          // 코드 접두사에 따라 카테고리 추정
          const codePrefix = product.code.split("-")[0].toLowerCase()

          if (codePrefix.includes("유제품") || codePrefix.includes("우유") || codePrefix.includes("치즈")) {
            category = "유제품"
          } else if (codePrefix.includes("육") || codePrefix.includes("고기") || codePrefix.includes("돼지")) {
            category = "육류"
          } else if (codePrefix.includes("채소") || codePrefix.includes("야채")) {
            category = "채소"
          } else if (codePrefix.includes("과일")) {
            category = "과일"
          } else if (codePrefix.includes("수산") || codePrefix.includes("생선") || codePrefix.includes("해산물")) {
            category = "수산물"
          } else {
            // 기본값으로 첫 번째 카테고리 사용
            category = categories[0].name
          }
        }

        if (category) {
          // 해당 카테고리의 층 수 증가 (floor가 없으면 기본값 1 사용)
          categoryFloorCount[category] = (categoryFloorCount[category] || 0) + (product.floor || 1)
        }
      })
    })

    console.log("Category Floor Count:", categoryFloorCount)

    // 카테고리별 층 수를 차트 데이터로 변환
    const distributionData = Object.entries(categoryFloorCount)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({
        name,
        value,
      }))

    // 데이터가 없는 경우 기본 데이터 제공
    if (distributionData.length === 0) {
      // 기본 카테고리 데이터 추가
      const defaultCategories = ["유제품", "육류", "채소", "과일", "수산물"]
      defaultCategories.forEach((category, index) => {
        distributionData.push({
          name: category,
          value: Math.floor(Math.random() * 5) + 1, // 1-5 사이의 랜덤 값
        })
      })
    }

    console.log("Distribution Data:", distributionData)

    // 디버깅용 로그 추가
    console.log("categories", categories)
    console.log("racks", racks)
    console.log("products", products)
    console.log("categoryFloorCount", categoryFloorCount)
    console.log("distributionData", distributionData)

    // 차트가 보이는지 확인을 위해 더미 데이터 강제 삽입 (임시)
    // setStorageDistributionData([
    //   { name: "유제품", value: 3 },
    //   { name: "육류", value: 2 },
    //   { name: "채소", value: 4 },
    // ])
    // 실제 데이터 반영은 아래 코드 주석 해제 후 사용
    setStorageDistributionData(distributionData)

    // Generate recent activity based on actual data
    const activities = []

    // Get 5 random products from racks
    const allProductsWithRack = racks.flatMap((rack) =>
      rack.products.map((product) => ({
        ...product,
        rackName: rack.name,
        rackLine: rack.line,
      })),
    )

    if (allProductsWithRack.length > 0) {
      // Sort by inbound date (newest first)
      allProductsWithRack.sort((a, b) => new Date(b.inboundDate).getTime() - new Date(a.inboundDate).getTime())

      // Take up to 5 recent products
      const recentProducts = allProductsWithRack.slice(0, 5)

      // Create activity entries
      recentProducts.forEach((product, index) => {
        const timeAgo = ["10분 전", "25분 전", "1시간 전", "2시간 전", "3시간 전"][index]
        activities.push({
          id: index + 1,
          action: `제품 ${product.code}가 랙 ${product.rackName}로 이동됨`,
          time: timeAgo,
        })
      })
    }

    // If we don't have enough products, add some generic activities
    if (activities.length < 5) {
      const genericActivities = [
        { action: "시스템 백업 완료", time: "2시간 전" },
        { action: "사용자 '관리자1' 로그인", time: "3시간 전" },
        { action: "재고 확인 완료", time: "4시간 전" },
        { action: "새 품목 코드 5개 추가됨", time: "5시간 전" },
        { action: "창고 재고 확인 완료", time: "6시간 전" },
      ]

      for (let i = activities.length; i < 5; i++) {
        activities.push({
          id: i + 1,
          ...genericActivities[i],
        })
      }
    }

    setRecentActivity(activities)
  }, [racks, products, categories, isLoading, productCodes])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  // Calculate statistics
  const totalRacks = racks.length
  const usedRacks = racks.filter((rack) => rack.products.length > 0).length
  const emptyRacks = totalRacks - usedRacks
  // 고유 품목 카테고리 계산 (productCodes 기준)
  const uniqueCategories = Array.isArray(productCodes) ? new Set(productCodes.map((p) => p.category)).size : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <p className="text-muted-foreground">냉동 창고 관리 시스템 개요</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 랙</CardTitle>
            <Grid3x3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRacks}</div>
            <p className="text-xs text-muted-foreground">총 보관 용량</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">사용 중인 랙</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usedRacks}</div>
            <p className="text-xs text-muted-foreground">전체 용량의 {((usedRacks / totalRacks) * 100).toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">빈 랙</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emptyRacks}</div>
            <p className="text-xs text-muted-foreground">{((emptyRacks / totalRacks) * 100).toFixed(1)}% 사용 가능</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">품목 유형</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCategories}</div>
            <p className="text-xs text-muted-foreground">고유 품목 카테고리</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>보관 분포</CardTitle>
            <CardDescription>카테고리별 사용 중인 랙</CardDescription>
          </CardHeader>
          {/* 보관 분포 카드 대체: Card, CardHeader, CardContent 제거 */}
          <div style={{ border: '2px solid red', padding: 24, margin: 24 }}>
            <h2>보관 분포 (최소 테스트)</h2>
            <div style={{ color: 'blue', fontWeight: 'bold' }}>
              이 텍스트가 보이면, 커스텀 Card/CardContent 컴포넌트의 문제입니다.
            </div>
            <div className="h-[250px] flex flex-col justify-center items-center">
              <div className="mb-4 text-red-500">[디버그] storageDistributionData:</div>
              <pre className="text-xs bg-gray-100 p-2 rounded mb-4 w-full max-w-md overflow-x-auto">{JSON.stringify(storageDistributionData, null, 2)}</pre>
              <div className="mb-4 text-blue-500">[동기 하드코딩 리스트]</div>
              <ul className="text-lg space-y-2 mb-4">
                {[
                  { name: "유제품", value: 10 },
                  { name: "육류", value: 5 },
                  { name: "채소", value: 8 },
                ].map((item) => (
                  <li key={item.name}>
                    <span className="font-semibold">{item.name}</span>: {item.value}개
                  </li>
                ))}
              </ul>
              <div className="mb-4 text-green-500">[실제 데이터 리스트]</div>
              {storageDistributionData.length > 0 ? (
                <ul className="text-lg space-y-2">
                  {storageDistributionData.map((item) => (
                    <li key={item.name}>
                      <span className="font-semibold">{item.name}</span>: {item.value}개
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">사용 중인 랙이 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>최신 창고 작업</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <p className="text-muted-foreground">냉동 창고 관리 시스템 개요</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
