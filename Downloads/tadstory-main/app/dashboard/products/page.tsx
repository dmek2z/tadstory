"use client"

export const dynamic = 'force-dynamic'

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Package, Plus, Search, Trash2, Edit, Settings, Upload, Download } from "lucide-react"
import * as XLSX from "xlsx"
import { showToast } from "@/utils/toast-utils"

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
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { useStorage } from "@/contexts/storage-context"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ProductCodesPage() {
  const { 
    productCodes = [], 
    setProductCodes, 
    categories = [], 
    setCategories, 
    isLoading,
    addProductCode,
    updateProductCode,
    deleteProductCode 
  } = useStorage()
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // 엑셀 업로드 관련 상태
  const [isExcelUploadDialogOpen, setIsExcelUploadDialogOpen] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [uploadPreview, setUploadPreview] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 삭제 관련 상태
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [isCategoryDeleteDialogOpen, setIsCategoryDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)

  // 카테고리 관리 상태
  const [editingCategory, setEditingCategory] = useState<any | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [categoryName, setCategoryName] = useState("")

  // Form states
  const [formCode, setFormCode] = useState("")
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formCategory, setFormCategory] = useState("")

  // 필터링된 품목 코드 - 안전한 필터링을 위해 기본값 설정
  const filteredProductCodes = Array.isArray(productCodes) 
    ? productCodes.filter((product) => {
        if (!product) return false;
        return (
          (product.code?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
          (product.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
          (product.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
          (product.category?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        )
      })
    : [];

  // 전체 선택 상태 업데이트
  useEffect(() => {
    if (filteredProductCodes.length > 0) {
      setSelectAll(selectedItems.size === filteredProductCodes.length)
    } else {
      setSelectAll(false)
    }
  }, [selectedItems, filteredProductCodes])

  const handleAddProduct = async () => {
    if (!formCode.trim()) return // 코드만 필수 입력

    const newProduct = {
      id: `pc-${Date.now()}`,
      code: formCode,
      name: formName || "",
      description: formDescription || "",
      category: formCategory || "",
      storageTemp: -18,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    }

    try {
      await addProductCode(newProduct)
      resetForm()
      setIsAddDialogOpen(false)
      showToast(`품목 코드 "${formCode}"가 추가되었습니다.`, "success")
    } catch (error) {
      console.error('Error adding product code:', error)
      showToast("품목 코드 추가 중 오류가 발생했습니다.", "error")
    }
  }

  const handleEditProduct = async () => {
    if (!editingProduct || !formCode.trim()) return

    const updates = {
      code: formCode,
      name: formName || "",
      description: formDescription || "",
      category: formCategory || "",
      updatedAt: new Date().toISOString().split("T")[0],
    }

    try {
      await updateProductCode(editingProduct.id, updates)
      resetForm()
      setIsEditDialogOpen(false)
      setEditingProduct(null)
      showToast(`품목 코드 "${formCode}"가 수정되었습니다.`, "success")
    } catch (error) {
      console.error('Error updating product code:', error)
      showToast("품목 코드 수정 중 오류가 발생했습니다.", "error")
    }
  }

  const handleDeleteProduct = async () => {
    if (!itemToDelete) return

    try {
      await deleteProductCode(itemToDelete)
      setItemToDelete(null)
      setIsDeleteDialogOpen(false)
      showToast("선택한 품목 코드가 삭제되었습니다.", "success")
    } catch (error) {
      console.error('Error deleting product code:', error)
      showToast("품목 코드 삭제 중 오류가 발생했습니다.", "error")
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return

    try {
      await Promise.all(Array.from(selectedItems).map(id => deleteProductCode(id)))
      setSelectedItems(new Set())
      setSelectAll(false)
      setIsBulkDeleteDialogOpen(false)
      showToast(`${selectedItems.size}개의 품목 코드가 삭제되었습니다.`, "success")
    } catch (error) {
      console.error('Error deleting selected product codes:', error)
      showToast("품목 코드 삭제 중 오류가 발생했습니다.", "error")
    }
  }

  const startEdit = (product: any) => {
    setEditingProduct(product)
    setFormCode(product.code)
    setFormName(product.name || "")
    setFormDescription(product.description || "")
    setFormCategory(product.category || "")
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormCode("")
    setFormName("")
    setFormDescription("")
    setFormCategory("")
  }

  // 체크박스 선택 핸들러
  const handleSelectItem = (itemId: string, isSelected: boolean) => {
    const newSelectedItems = new Set(selectedItems)

    if (isSelected) {
      newSelectedItems.add(itemId)
    } else {
      newSelectedItems.delete(itemId)
    }

    setSelectedItems(newSelectedItems)
  }

  // 전체 선택 핸들러
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)

    if (checked) {
      const newSelectedItems = new Set<string>()
      filteredProductCodes.forEach((product) => newSelectedItems.add(product.id))
      setSelectedItems(newSelectedItems)
    } else {
      setSelectedItems(new Set())
    }
  }

  // 카테고리 추가 핸들러
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return

    const newCategory = {
      id: `cat-${Date.now()}`,
      name: newCategoryName,
      createdAt: new Date().toISOString().split("T")[0],
    }

    setCategories((prev) => [...prev, newCategory])
    setNewCategoryName("")

    showToast(`카테고리 "${newCategoryName}"가 추가되었습니다.`, "success")
  }

  // 카테고리 수정 핸들러
  const handleEditCategory = () => {
    if (!editingCategory || !categoryName.trim()) return

    const oldCategoryName = editingCategory.name

    setCategories((prev) =>
      prev.map((category) => {
        if (category.id === editingCategory.id) {
          return {
            ...category,
            name: categoryName,
          }
        }
        return category
      }),
    )

    // 카테고리 이름이 변경되면 해당 카테고리를 사용하는 품목 코드도 업데이트
    setProductCodes((prev) =>
      prev.map((product) => {
        if (product.category === oldCategoryName) {
          return {
            ...product,
            category: categoryName,
          }
        }
        return product
      }),
    )

    setEditingCategory(null)
    setCategoryName("")

    showToast(`카테고리가 "${oldCategoryName}"에서 "${categoryName}"로 변경되었습니다.`, "success")
  }

  // 카테고리 삭제 핸들러
  const handleDeleteCategory = () => {
    if (!categoryToDelete) return

    console.log("삭제할 카테고리 ID:", categoryToDelete)

    const category = categories.find((cat) => cat.id === categoryToDelete)
    if (!category) {
      setCategoryToDelete(null)
      setIsCategoryDeleteDialogOpen(false)
      return
    }

    // 해당 카테고리를 사용하는 품목 코드의 카테고리를 빈 문자열로 설정
    setProductCodes((prev) =>
      prev.map((product) => {
        if (product.category === category.name) {
          return {
            ...product,
            category: "",
          }
        }
        return product
      }),
    )

    setCategories((prev) => prev.filter((cat) => cat.id !== categoryToDelete))
    setCategoryToDelete(null)
    setIsCategoryDeleteDialogOpen(false)

    showToast(`카테고리 "${category.name}"가 삭제되었습니다.`, "success")
  }

  const startEditCategory = (category: any) => {
    setEditingCategory(category)
    setCategoryName(category.name)
  }

  // 엑셀 양식 다운로드 핸들러
  const handleDownloadTemplate = () => {
    // 샘플 데이터 생성
    const sampleData = [
      {
        코드: "PROD-001",
        이름: "제품 예시 1",
        설명: "제품 설명 예시입니다",
        카테고리: categories.length > 0 ? categories[0].name : "",
      },
      {
        코드: "PROD-002",
        이름: "제품 예시 2",
        설명: "두 번째 제품 설명입니다",
        카테고리: categories.length > 1 ? categories[1].name : "",
      },
    ]

    // 워크시트 생성
    const ws = XLSX.utils.json_to_sheet(sampleData)

    // 워크북 생성
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "품목코드")

    // 브라우저에서 파일 다운로드 처리
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], { type: "application/octet-stream" })

    // Blob URL 생성
    const url = URL.createObjectURL(blob)

    // 다운로드 링크 생성 및 클릭
    const a = document.createElement("a")
    a.href = url
    a.download = "품목코드_양식.xlsx"
    document.body.appendChild(a)
    a.click()

    // 정리
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 0)

    showToast("품목 코드 양식 파일이 다운로드되었습니다.", "success")
  }

  // 엑셀 파일 업로드 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // FileReader를 사용하여 파일 읽기
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })

        // 첫 번째 시트 가져오기
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // 시트를 JSON으로 변환
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        // 데이터 검증
        const errors: string[] = []
        const validData: any[] = []
        const existingCategories = categories.map((cat) => cat.name)

        jsonData.forEach((row: any, index) => {
          const rowNum = index + 2 // 엑셀은 1부터 시작, 헤더가 1행이므로 +2

          // 필수 필드 확인
          if (!row["코드"]) {
            errors.push(`${rowNum}행: 코드가 비어 있습니다.`)
            return
          }

          // 카테고리 확인
          if (row["카테고리"] && !existingCategories.includes(row["카테고리"])) {
            errors.push(`${rowNum}행: 카테고리 "${row["카테고리"]}"가 존재하지 않습니다.`)
            return
          }

          // 유효한 데이터 추가
          validData.push({
            code: row["코드"],
            name: row["이름"] || "",
            description: row["설명"] || "",
            category: row["카테고리"] || "",
          })
        })

        setUploadPreview(validData)
        setUploadErrors(errors)
      } catch (error) {
        console.error("엑셀 파일 처리 중 오류 발생:", error)
        setUploadErrors(["엑셀 파일 형식이 올바르지 않습니다. 다운로드한 양식을 사용해주세요."])
        setUploadPreview([])
      }
    }

    reader.readAsArrayBuffer(file)
  }

  // 엑셀 데이터 가져오기 핸들러
  const handleImportExcel = () => {
    if (uploadPreview.length === 0) return

    const newProducts = uploadPreview.map((item) => ({
      id: `pc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      code: item.code,
      name: item.name || "",
      description: item.description || "",
      category: item.category || "",
      storageTemp: -18,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    }))

    setProductCodes((prev) => [...prev, ...newProducts])
    setIsExcelUploadDialogOpen(false)
    setUploadPreview([])
    setUploadErrors([])

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    showToast(`${newProducts.length}개의 품목 코드가 추가되었습니다.`, "success")
  }

  if (isLoading) {
    return <ProductCodesSkeleton />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">품목 코드</h1>
        <p className="text-muted-foreground">창고용 품목 코드 및 카테고리 관리</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="품목 코드 검색..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> 품목 코드 추가
          </Button>
          <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
            <Settings className="mr-2 h-4 w-4" /> 카테고리 관리
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> 양식 다운로드
            </Button>
            <Button variant="secondary" onClick={() => setIsExcelUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> 엑셀 업로드
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Checkbox id="selectAll" checked={selectAll} onCheckedChange={handleSelectAll} />
          <Label htmlFor="selectAll">전체 선택</Label>
        </div>

        <Button
          variant="destructive"
          size="sm"
          disabled={selectedItems.size === 0}
          onClick={() => setIsBulkDeleteDialogOpen(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          선택 삭제 ({selectedItems.size})
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>품목 코드</CardTitle>
          <CardDescription>모든 품목 코드 및 카테고리</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>코드</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProductCodes.length > 0 ? (
                  filteredProductCodes.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(product.id)}
                          onCheckedChange={(checked: boolean | "indeterminate") => handleSelectItem(product.id, checked === true)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{product.code}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.description}</TableCell>
                      <TableCell>{product.category && <Badge variant="outline">{product.category}</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(product)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">수정</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setItemToDelete(product.id)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">삭제</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      <div className="flex flex-col items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">품목 코드를 찾을 수 없습니다</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 품목 코드 추가 다이얼로그 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 품목 코드 추가</DialogTitle>
            <DialogDescription>창고 재고를 위한 새 품목 코드 생성</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                코드 *
              </Label>
              <Input
                id="code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="col-span-3"
                placeholder="예: 유제품-01"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                이름
              </Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="col-span-3"
                placeholder="품목 이름"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                설명
              </Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="col-span-3"
                placeholder="품목 설명"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                카테고리
              </Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger id="category" className="col-span-3">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                setIsAddDialogOpen(false)
              }}
            >
              취소
            </Button>
            <Button onClick={handleAddProduct} disabled={!formCode.trim()}>
              품목 추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 품목 코드 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>품목 코드 수정</DialogTitle>
            <DialogDescription>이 품목 코드의 세부 정보 업데이트</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-code" className="text-right">
                코드 *
              </Label>
              <Input
                id="edit-code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                이름
              </Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                설명
              </Label>
              <Input
                id="edit-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-category" className="text-right">
                카테고리
              </Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger id="edit-category" className="col-span-3">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                setIsEditDialogOpen(false)
                setEditingProduct(null)
              }}
            >
              취소
            </Button>
            <Button onClick={handleEditProduct} disabled={!formCode.trim()}>
              변경사항 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 카테고리 관리 다이얼로그 */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>카테고리 관리</DialogTitle>
            <DialogDescription>품목 코드에 사용할 카테고리를 관리합니다</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="새 카테고리 이름"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                추가
              </Button>
            </div>

            <div className="border rounded-md">
              <ScrollArea className="h-[300px]">
                <div className="p-4">
                  {categories.length > 0 ? (
                    <div className="space-y-4">
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center justify-between p-2 border rounded-md">
                          {editingCategory?.id === category.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                className="flex-1"
                              />
                              <Button size="sm" onClick={handleEditCategory} disabled={!categoryName.trim()}>
                                저장
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCategory(null)
                                  setCategoryName("")
                                }}
                              >
                                취소
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div>
                                <div className="font-medium">{category.name}</div>
                                <div className="text-xs text-muted-foreground">생성일: {category.createdAt}</div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => startEditCategory(category)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setCategoryToDelete(category.id)
                                    setIsCategoryDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <div className="rounded-full bg-muted p-3">
                        <Settings className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold">카테고리 없음</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        아직 등록된 카테고리가 없습니다. 위 입력창에서 새 카테고리를 추가하세요.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsCategoryDialogOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 엑셀 일괄 업로드 다이얼로그 */}
      <Dialog open={isExcelUploadDialogOpen} onOpenChange={setIsExcelUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>엑셀 일괄 업로드</DialogTitle>
            <DialogDescription>
              엑셀 파일을 업로드하여 품목 코드를 일괄 등록합니다.
              <br />
              파일은 코드, 이름, 설명, 카테고리 컬럼을 포함해야 합니다.
              <br />
              <span className="text-xs text-muted-foreground">
                양식이 필요하시면 먼저 '양식 다운로드' 버튼을 클릭하세요.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="excel-file">엑셀 파일 선택</Label>
              <Input id="excel-file" type="file" accept=".xlsx, .xls" onChange={handleFileChange} ref={fileInputRef} />
              <p className="text-xs text-muted-foreground">지원 형식: .xlsx, .xls (Excel 97-2003)</p>
            </div>

            {uploadErrors.length > 0 && (
              <div className="border border-destructive/50 rounded-md p-3 bg-destructive/10">
                <h4 className="font-medium text-destructive mb-2">오류 발생</h4>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  {uploadErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {uploadPreview.length > 0 && (
              <div className="border rounded-md">
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>코드</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>설명</TableHead>
                        <TableHead>카테고리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadPreview.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.code}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.category}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsExcelUploadDialogOpen(false)
                setUploadPreview([])
                setUploadErrors([])
                if (fileInputRef.current) {
                  fileInputRef.current.value = ""
                }
              }}
            >
              취소
            </Button>
            <Button onClick={handleImportExcel} disabled={uploadPreview.length === 0} className="gap-2">
              <Upload className="h-4 w-4" />
              가져오기 ({uploadPreview.length}개)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 품목 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>품목 코드 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 품목 코드를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 일괄 삭제 확인 다이얼로그 */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>품목 코드 일괄 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedItems.size}개의 품목 코드를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 카테고리 삭제 확인 다이얼로그 */}
      <AlertDialog open={isCategoryDeleteDialogOpen} onOpenChange={setIsCategoryDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카테고리 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 카테고리를 삭제하시겠습니까? 이 카테고리를 사용하는 품목 코드의 카테고리는 비워집니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ProductCodesSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">품목 코드</h1>
        <p className="text-muted-foreground">창고용 품목 코드 및 카테고리 관리</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Skeleton className="h-10 w-full sm:w-96" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>품목 코드</CardTitle>
          <CardDescription>모든 품목 코드 및 카테고리</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            {Array(8)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-20" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
