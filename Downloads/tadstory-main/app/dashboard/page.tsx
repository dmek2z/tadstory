"use client"

// console.log("--- DashboardPage: Script loaded (top level) ---"); // Debug log

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { CheckCircle, Grid3x3, Package, ShoppingBag, XCircle } from "lucide-react"
import nextDynamic from "next/dynamic"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "@/components/ui/chart"
import { useStorage, type Product, type StockMovement } from "@/contexts/storage-context"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"]
const ChartPieClient = nextDynamic(() => import("@/components/ChartPieClient"), { ssr: false })

export default function DashboardPage() {
  // console.log("--- DashboardPage: Component rendering ---"); // Debug log
  const { user, isLoading: authIsLoading } = useAuth();

  // console.log("--- DashboardPage: Auth state ---", { user, authIsLoading }); // Debug log

  const { products, racks, categories, users: storageUsers, isLoading: storageIsLoading, productCodes, stockMovements, lastUpdated, refreshData } = useStorage()
  const [storageDistributionData, setStorageDistributionData] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [totalStockByProduct, setTotalStockByProduct] = useState<any[]>([])

  useEffect(() => {
    if (storageIsLoading) return;

    // Calculate total stock by product
    const stockMap: { [productId: string]: any } = {}; 
    if (Array.isArray(stockMovements) && Array.isArray(productCodes) && Array.isArray(categories)) {
      stockMovements.forEach(movement => {
        // Find the product code (master info) for the product_id in the movement
        const productMaster = productCodes.find(pc => pc.id === movement.product_id); // Assuming movement.product_id corresponds to ProductCode.id
        
        if (!stockMap[movement.product_id]) {
          const category = categories.find(c => c.id === productMaster?.category); // Assuming ProductCode.category is an ID linking to Category.id
          stockMap[movement.product_id] = {
            product_id: movement.product_id,
            product_name: productMaster?.name || "Unknown Product",
            category_name: category?.name || productMaster?.category || "Unknown Category", // Use category name from fetched categories, fallback to name in productCode
            total_quantity: 0,
            unit: productMaster?.description || "pcs", // Assuming unit might be in description or a dedicated field in ProductCode
          };
        }
        stockMap[movement.product_id].total_quantity += (movement.type === "IN" ? movement.quantity : -movement.quantity);
      });
    }
    setTotalStockByProduct(Object.values(stockMap).filter(item => item.total_quantity > 0));

    // Generate rack distribution data by category
    const categoryFloorCount: Record<string, number> = {};
    if (Array.isArray(categories)) {
        categories.forEach((category) => {
            if(category.name) categoryFloorCount[category.name] = 0;
        });
    }

    const productCodeToCategoryNameMap: Record<string, string> = {};
    if (Array.isArray(productCodes) && Array.isArray(categories)) {
      productCodes.forEach((pc) => {
        const category = categories.find(c => c.id === pc.category); // Assuming pc.category is category_id
        if(pc.code && category?.name) productCodeToCategoryNameMap[pc.code] = category.name;
      });
    }

    // Fallback: map prefix to category name
    const prefixToCategoryNameMap: Record<string, string> = {};
    if (Array.isArray(productCodes) && Array.isArray(categories)) {
      productCodes.forEach((pc) => {
        const category = categories.find(c => c.id === pc.category);
        if(pc.code && category?.name) {
            const prefix = pc.code.split("-")[0];
            prefixToCategoryNameMap[prefix] = category.name;
        }
      });
    }
    
    if (Array.isArray(racks) && Array.isArray(products)){
        racks.forEach((rack) => {
          if (!rack.products || rack.products.length === 0) return;
    
          rack.products.forEach((productInRack: Product) => { // productInRack is of type Product
            // Find the master ProductCode for this productInRack.code
            const productMaster = productCodes.find(pc => pc.code === productInRack.code);
            let categoryName = productMaster ? productCodeToCategoryNameMap[productMaster.code] : undefined;

            if (!categoryName && productMaster) {
              const codePrefix = productMaster.code.split("-")[0];
              categoryName = prefixToCategoryNameMap[codePrefix];
            }
            
            if (!categoryName && categories && categories.length > 0 && categories[0].name) {
                categoryName = categories[0].name; 
            }
    
            if (categoryName) {
              categoryFloorCount[categoryName] = (categoryFloorCount[categoryName] || 0) + (productInRack.floor || 1);
            }
          });
        });
    }
    
    const distributionData = Object.entries(categoryFloorCount)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));
    
    if (distributionData.length === 0 && Array.isArray(categories) && categories.length > 0) { 
        const defaultCategories = ["유제품", "육류", "채소", "과일", "수산물"];
        defaultCategories.forEach((catName) => {
            if (categories.some(c => c.name === catName)) {
                 distributionData.push({ name: catName, value: 0 }); 
            }
        });
        if (distributionData.length === 0 && categories[0]?.name) {
            distributionData.push({ name: categories[0].name, value: 0 });
        }
    }
    setStorageDistributionData(distributionData);

    // Generate recent activity
    const activities: any[] = []; 
    if (Array.isArray(stockMovements) && Array.isArray(productCodes)) {
        const recentMovements = [...stockMovements]
            .sort((a, b) => new Date(b.moved_at).getTime() - new Date(a.moved_at).getTime())
            .slice(0, 5);
        
        recentMovements.forEach(movement => {
            const productMaster = productCodes.find(pc => pc.id === movement.product_id); // Assuming movement.product_id links to ProductCode.id
            activities.push({
                id: movement.id,
                action: `${productMaster?.name || '품목'} ${movement.quantity}${productMaster?.description?.substring(0,10) || '개'} ${movement.type === "IN" ? "입고됨" : "출고됨"}`,
                time: new Date(movement.moved_at).toLocaleString(), 
            });
        });
    }
    setRecentActivity(activities);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageIsLoading, racks, products, categories, productCodes, stockMovements]); 

  if (authIsLoading) {
    // console.log("--- DashboardPage: Auth is loading (from useAuth), rendering auth loading state ---") // Debug log
    return <DashboardSkeleton /> // Show skeleton during auth loading as well
  }

  if (!user) {
    // console.log("--- DashboardPage: No user, rendering login prompt (should be handled by layout/DashboardLogic) ---") // Debug log
    // This part might be redundant if DashboardLogic correctly redirects.
    // router.replace('/login') // Avoid direct navigation here, let higher components handle
    return <p>사용자 인증이 필요합니다. 로그인 페이지로 이동합니다...</p> // Fallback message
  }

  // console.log("--- DashboardPage: Rendering main content for user:", user.email) // Debug log

  if (storageIsLoading) {
    // console.log("--- DashboardPage: Storage is loading, rendering skeleton ---") // Debug log
    return <DashboardSkeleton />
  }
  
  // Calculate statistics 
  const totalRacks = Array.isArray(racks) ? racks.length : 0;
  const usedRacks = Array.isArray(racks) ? racks.filter((rack) => rack.products && rack.products.length > 0).length : 0;
  const emptyRacks = totalRacks - usedRacks;
  // For uniqueCategoriesCount, we should count unique category *names* from productCodes that are actually in use or defined.
  const uniqueCategoryNames = new Set<string>();
  if (Array.isArray(productCodes) && Array.isArray(categories)) {
    productCodes.forEach(pc => {
        const category = categories.find(c => c.id === pc.category); // pc.category is likely category_id
        if (category?.name) {
            uniqueCategoryNames.add(category.name);
        }
    });
  }
  const uniqueCategoriesCount = uniqueCategoryNames.size;
  const totalStockQuantity = totalStockByProduct.reduce((sum, item) => sum + item.total_quantity, 0);

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
            <p className="text-xs text-muted-foreground">
              {totalRacks > 0 ? ((usedRacks / totalRacks) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">빈 랙</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emptyRacks}</div>
            <p className="text-xs text-muted-foreground">
              {totalRacks > 0 ? ((emptyRacks / totalRacks) * 100).toFixed(1) : 0}% 사용 가능
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">품목 유형</CardTitle> {/* This title seems to refer to category count */} 
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCategoriesCount}</div>
            <p className="text-xs text-muted-foreground">고유 품목 카테고리 수</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>보관 분포</CardTitle>
            <CardDescription>카테고리별 사용 중인 랙의 층 수</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {storageDistributionData.length > 0 ? (
                <ChartPieClient data={storageDistributionData} />
            ) : (
                <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">랙 데이터가 없거나 사용 중인 랙이 없습니다.</p>
                </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>최근 5개 입출고 내역</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              )) : <p className="text-muted-foreground">최근 활동 내역이 없습니다.</p>}
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
