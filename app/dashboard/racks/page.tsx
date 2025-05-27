"use client"

import { useState, useRef, useEffect } from "react"
import { DndProvider, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { Search, Plus, Trash2, Edit, MoveRight, Check, Pencil, Copy, FileUp, Download, Package } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { read, utils, write } from "xlsx"
import { useStorage } from "@/contexts/storage-context"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"

// 아이템 타입 정의
const ItemTypes = {
  PRODUCT: "product",
  RACK: "rack",
}

// 로딩 스켈레톤 컴포넌트
const RackViewSkeleton = () => {
  return (
    <div className="animate-pulse">
      <div className="space-y-6">
        <div>
          <div className="h-8 bg-gray-300 rounded w-64"></div>
          <div className="h-4 bg-gray-300 rounded w-48 mt-2"></div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <div className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"></div>
            <div className="h-10 bg-gray-300 rounded w-full"></div>
          </div>

          <div className="flex overflow-x-auto no-scrollbar">
            <div className="flex space-x-2">
              <div className="h-8 bg-gray-300 rounded w-24"></div>
              <div className="h-8 bg-gray-300 rounded w-24"></div>
              <div className="h-8 bg-gray-300 rounded w-24"></div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="h-8 bg-gray-300 rounded w-32"></div>
          <div className="h-8 bg-gray-300 rounded w-32"></div>
          <div className="h-8 bg-gray-300 rounded w-32"></div>
        </div>

        <div className="flex flex-col space-y-4">
          <div className="flex">
            <div className="w-40 h-40 bg-gray-300 rounded-lg mr-4"></div>
            <div className="w-40 h-40 bg-gray-300 rounded-lg mr-4"></div>
            <div className="w-40 h-40 bg-gray-300 rounded-lg mr-4"></div>
            <div className="w-40 h-40 bg-gray-300 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 드래그 가능한 제품 컴포넌트
const DraggableProduct = ({ product, rackId }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PRODUCT,
    item: { product, sourceRackId: rackId },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  return (
    <div
      ref={drag}
      className={`p-1 mb-1 rounded-md border cursor-move ${isDragging ? "opacity-50" : ""}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-xs">{product.code.split("-")[0]}</span>
      </div>
    </div>
  )
}

// 랙 컴포넌트
const RackComponent = ({ rack, onRackClick, onProductDrop, isSelected, onSelectChange, onCopyRack }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.PRODUCT,
    drop: (item) => {
      onProductDrop(item.product, item.sourceRackId, rack.id)
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }))

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.RACK,
    item: { rack, type: ItemTypes.RACK },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  // 랙 상태에 따른 배경색 결정
  const getBgColor = () => {
    if (isOver) return "bg-blue-100 border-blue-400"
    if (rack.products.length === 0) return "bg-gray-200 border-gray-300"
    return "bg-green-100 border-green-200"
  }

  const { hasPermission } = useAuth()

  return (
    <div className="relative">
      <div className="absolute top-0 left-0 z-10 m-1">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectChange(rack.id, checked === true)}
          className="bg-white border-gray-300"
        />
      </div>
      <div
        ref={(node) => drag(drop(node))}
        className={`p-3 rounded-lg border-2 w-28 h-28 flex flex-col cursor-move transition-colors ${getBgColor()} ${
          isDragging ? "opacity-50" : ""
        }`}
        onClick={(e) => {
          if (!isDragging) {
            onRackClick(rack)
          }
        }}
      >
        <div className="font-bold text-sm mb-2 text-center">{rack.name}</div>
        <div className="flex-1 overflow-hidden">
          {rack.products.length > 0 ? (
            <ScrollArea className="h-full pr-1" onClick={(e) => e.stopPropagation()}>
              <div className="text-xs space-y-1.5 pb-1">
                {rack.products
                  .slice()
                  .sort((a, b) => (b.floor || 0) - (a.floor || 0))
                  .map((p) => (
                    <div
                      key={p.id}
                      className="px-1 py-0.5 bg-white bg-opacity-60 rounded truncate flex justify-between"
                    >
                      <div>
                        <span className="font-medium">{p.code.split("-")[0]}</span>
                        <span className="text-[10px] ml-1 text-gray-600">{p.code.split("-")[1] || ""}</span>
                      </div>
                      <span className="text-xs font-bold text-blue-600">{p.floor}</span>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-sm text-center opacity-70 mt-6">비어 있음</div>
          )}
        </div>
      </div>
      {hasPermission("racks", "edit") && (
        <div className="absolute bottom-0 right-0 z-10 m-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCopyRack(rack)
                  }}
                >
                  <Copy className="h-3 w-3" />
                  <span className="sr-only">복사</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>랙 복사</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}

// 라인 드롭 영역 컴포넌트
const LineDropZone = ({ line, children, className = "", onRackDrop, filteredRacks, selectedRacks, onSelectLine }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.RACK,
    drop: (item) => {
      if (item.rack.line !== line) {
        onRackDrop(item.rack.id, line)
      }
    },
    canDrop: (item) => item.rack.line !== line,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }))

  // 해당 라인의 모든 랙이 선택되었는지 확인
  const lineRacks = filteredRacks.filter((rack) => rack.line === line)
  const allLineRacksSelected = lineRacks.length > 0 && lineRacks.every((rack) => selectedRacks.has(rack.id))

  return (
    <div
      ref={drop}
      className={`${
        isOver && canDrop ? "bg-blue-50 border-blue-300" : ""
      } border-2 border-transparent rounded-lg transition-colors p-2 ${className}`}
    >
      <div className="flex items-center space-x-2 mb-2">
        <Checkbox
          id={`select-line-${line}`}
          checked={allLineRacksSelected && lineRacks.length > 0}
          onCheckedChange={(checked) => onSelectLine(line, checked === true)}
        />
        <Label htmlFor={`select-line-${line}`} className="text-sm font-medium">
          {line}라인
        </Label>
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  )
}

// 메인 페이지 컴포넌트
export default function RackViewPage() {
  const { racks, addRack, updateRack, deleteRack, productCodes, isLoading } = useStorage()
  const { hasPermission } = useAuth()
  const { toast } = useToast()

  // 상태 관리
  const [selectedRack, setSelectedRack] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [isMoveItemsDialogOpen, setIsMoveItemsDialogOpen] = useState(false)
  const [isExcelUploadDialogOpen, setIsExcelUploadDialogOpen] = useState(false)
  const [uploadResult, setUploadResult] = useState({ success: 0, errors: [] })
  const fileInputRef = useRef(null)

  // 검색 및 필터링 상태
  const [searchQuery, setSearchQuery] = useState("")
  const [activeLine, setActiveLine] = useState("all")
  const [selectedRacks, setSelectedRacks] = useState(new Set())
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [selectAllItems, setSelectAllItems] = useState(false)

  // 품목 관련 상태
  const [searchProductQuery, setSearchProductQuery] = useState("")
  const [selectedProductIds, setSelectedProductIds] = useState(new Set())
  const [selectAllSearchProducts, setSelectAllSearchProducts] = useState(false)
  const [selectedFloor, setSelectedFloor] = useState(1)

  // 기타 상태
  const [targetRackForMove, setTargetRackForMove] = useState("")
  const [isEditingRackName, setIsEditingRackName] = useState(false)
  const [editedRackName, setEditedRackName] = useState("")
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false)
  const [isRackDeleteConfirmDialogOpen, setIsRackDeleteConfirmDialogOpen] = useState(false)
  const [isItemsDeleteConfirmDialogOpen, setIsItemsDeleteConfirmDialogOpen] = useState(false)
  const [formName, setFormName] = useState("")
  const [formLine, setFormLine] = useState("A")
  const [lineSelections, setLineSelections] = useState({})
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false)
  const [bulkTargetLine, setBulkTargetLine] = useState("A")

  // 엑셀 업로드 관련 상태
  const [previewData, setPreviewData] = useState([])
  const [uploadErrors, setUploadErrors] = useState([])
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [validRowCount, setValidRowCount] = useState(0)
  const [selectedFileName, setSelectedFileName] = useState("")

  // 검색어에 따라 필터링된 품목 목록
  const filteredProductCodes = productCodes.filter(
    (product) =>
      searchProductQuery === "" ||
      product.code.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchProductQuery.toLowerCase()),
  )

  // 랙 필터링
  const filteredRacks = racks.filter((rack) => {
    const matchesSearch =
      searchQuery === "" ||
      rack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rack.products.some((p) => p.code.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesLine = activeLine === "all" || rack.line === activeLine

    return matchesSearch && matchesLine
  })

  // 라인별 랙 그룹화
  const racksByLine = filteredRacks.reduce((acc, rack) => {
    if (!acc[rack.line]) {
      acc[rack.line] = []
    }
    acc[rack.line].push(rack)
    return acc
  }, {})

  // 품목 선택 핸들러
  const handleSelectProduct = (productId, isSelected) => {
    const newSelectedProductIds = new Set(selectedProductIds)

    if (isSelected) {
      newSelectedProductIds.add(productId)
    } else {
      newSelectedProductIds.delete(productId)
    }

    setSelectedProductIds(newSelectedProductIds)
    setSelectAllSearchProducts(newSelectedProductIds.size === filteredProductCodes.length)
  }

  // 검색 결과 전체 선택 핸들러
  const handleSelectAllSearchProducts = (checked) => {
    setSelectAllSearchProducts(checked)

    if (checked) {
      const newSelectedProductIds = new Set()
      filteredProductCodes.forEach((product) => newSelectedProductIds.add(product.id))
      setSelectedProductIds(newSelectedProductIds)
    } else {
      setSelectedProductIds(new Set())
    }
  }

  // 품목 추가 핸들러
  const handleAddSelectedItems = () => {
    if (!selectedRack) return

    const itemsToAdd = productCodes
      .filter((product) => selectedProductIds.has(product.id))
      .map((product) => ({
        id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        code: product.code,
        inboundDate: new Date().toISOString().split("T")[0],
        outboundDate: null,
        weight: Math.floor(Math.random() * 50) + 10,
        manufacturer: ["냉동식품", "얼음식품", "극지방제품", "북극신선", "콜드요리"][Math.floor(Math.random() * 5)],
        floor: selectedFloor,
      }))

    addRack({
      ...selectedRack,
      products: [...selectedRack.products, ...itemsToAdd],
    })

    setSelectedRack((prev) => {
      if (!prev) return null
      return {
        ...prev,
        products: [...prev.products, ...itemsToAdd],
      }
    })

    setSearchProductQuery("")
    setSelectedProductIds(new Set())
    setSelectAllSearchProducts(false)
    setSelectedFloor(1)
    setIsAddItemDialogOpen(false)
  }

  // 랙 복사 핸들러
  const handleCopyRack = (rackToCopy) => {
    if (!hasPermission("racks", "edit")) return

    // 이름에 (2), (3)... 등을 추가하는 로직
    const baseName = rackToCopy.name.replace(/$$\d+$$$/, "")

    // 동일한 기본 이름을 가진 랙들 찾기
    const similarRacks = racks.filter(
      (rack) => rack.name === baseName || rack.name.match(new RegExp(`^${baseName}\$$\\d+\$$$`)),
    )

    // 기존 번호 중 가장 큰 번호 찾기
    let maxNum = 1
    similarRacks.forEach((rack) => {
      const match = rack.name.match(/$$(\d+)$$$/)
      if (match) {
        const num = Number.parseInt(match[1], 10)
        if (num >= maxNum) maxNum = num + 1
      } else {
        maxNum = Math.max(maxNum, 2)
      }
    })

    // 새 랙 생성
    const newRackName = `${baseName}(${maxNum})`
    const newRack = {
      ...rackToCopy,
      id: `rack-${newRackName}-${Date.now()}`,
      name: newRackName,
      products: rackToCopy.products.map((product) => ({
        ...product,
        id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      })),
    }

    addRack(newRack)
  }

  // 엑셀 파일 업로드 핸들러
  const handleFileUpload = (e) => {
    if (!hasPermission("racks", "edit")) return

    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      if (!data) return

      try {
        const workbook = read(data, { type: "binary" })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const rows = utils.sheet_to_json(worksheet)

        // 데이터 검증
        const errors = []
        const validRows = []
        const existingLines = new Set(racks.map((rack) => rack.line))
        const existingProductCodes = new Set(productCodes.map((product) => product.code))

        rows.forEach((row, index) => {
          const line = row.라인
          const rackName = row.랙이름
          const productCode = row.품목코드
          const floor = row.층

          // 유효성 검사
          if (!line || !rackName || !productCode) {
            errors.push(`행 ${index + 2}: 필수 필드가 비어 있습니다.`)
            return
          }

          if (!existingLines.has(line)) {
            errors.push(`행 ${index + 2}: 존재하지 않는 라인 "${line}"입니다.`)
            return
          }

          if (!existingProductCodes.has(productCode)) {
            errors.push(`행 ${index + 2}: 존재하지 않는 품목코드 "${productCode}"입니다.`)
            return
          }

          if (floor && (floor < 1 || floor > 4)) {
            errors.push(`행 ${index + 2}: 층은 1부터 4까지만 가능합니다.`)
            return
          }

          validRows.push(row)
        })

        setPreviewData(validRows)
        setUploadErrors(errors)
        setValidRowCount(validRows.length)
        setIsPreviewDialogOpen(true)

        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      } catch (error) {
        console.error("엑셀 파일 처리 중 오류:", error)
        setUploadErrors(["엑셀 파일 처리 중 오류가 발생했습니다."])
        setPreviewData([])
        setValidRowCount(0)
        setIsPreviewDialogOpen(true)
      }
    }

    reader.readAsBinaryString(file)
  }

  // 엑셀 데이터 처리 핸들러
  const processExcelData = () => {
    if (!hasPermission("racks", "edit") || previewData.length === 0) return

    const errors = []
    let successCount = 0
    const updatedRacks = [...racks]

    previewData.forEach((row) => {
      const line = row.라인
      const rackName = row.랙이름
      const productCode = row.품목코드

      // 랙 있는지 검사
      let targetRack = updatedRacks.find((rack) => rack.name === rackName && rack.line === line)

      // 랙이 없으면 새로 생성
      if (!targetRack) {
        const newRack = {
          id: `rack-${rackName}-${Date.now()}`,
          name: rackName,
          products: [],
          capacity: 4,
          line,
        }
        updatedRacks.push(newRack)
        targetRack = newRack
      }

      // 랙에 품목 추가
      const newProduct = {
        id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        code: productCode,
        inboundDate: new Date().toISOString().split("T")[0],
        outboundDate: null,
        weight: Math.floor(Math.random() * 50) + 10,
        manufacturer: ["냉동식품", "얼음식품", "극지방제품", "북극신선", "콜드요리"][Math.floor(Math.random() * 5)],
        floor: row.층 || 1,
      }

      const rackIndex = updatedRacks.findIndex((r) => r.id === targetRack.id)
      updatedRacks[rackIndex].products.push(newProduct)
      successCount++
    })

    addRacks(updatedRacks)
    setUploadResult({
      success: successCount,
      errors,
    })
    setIsExcelUploadDialogOpen(true)
    setIsPreviewDialogOpen(false)
  }

  // 랙 클릭 핸들러
  const handleRackClick = (rack) => {
    setSelectedRack(rack)
    setSelectedItems(new Set())
    setSelectAllItems(false)
    setIsDialogOpen(true)
  }

  // 제품 드롭 핸들러
  const handleProductDrop = (product, sourceRackId, targetRackId) => {
    if (sourceRackId === targetRackId || !hasPermission("racks", "edit")) return

    updateRacks((prevRacks) => {
      return prevRacks.map((rack) => {
        if (rack.id === sourceRackId) {
          return {
            ...rack,
            products: rack.products.filter((p) => p.id !== product.id),
          }
        }

        if (rack.id === targetRackId) {
          return {
            ...rack,
            products: [...rack.products, product],
          }
        }

        return rack
      })
    })
  }

  // 랙 선택 핸들러
  const handleSelectRack = (rackId, isSelected) => {
    const newSelectedRacks = new Set(selectedRacks)

    if (isSelected) {
      newSelectedRacks.add(rackId)
    } else {
      newSelectedRacks.delete(rackId)
    }

    setSelectedRacks(newSelectedRacks)
    setSelectAll(newSelectedRacks.size === filteredRacks.length)
  }

  // 전체 선택 핸들러
  const handleSelectAll = (checked) => {
    setSelectAll(checked)

    if (checked) {
      const newSelectedRacks = new Set()
      filteredRacks.forEach((rack) => newSelectedRacks.add(rack.id))
      setSelectedRacks(newSelectedRacks)
    } else {
      setSelectedRacks(new Set())
    }
  }

  // 품목 선택 핸들러
  const handleSelectItem = (itemId, isSelected) => {
    const newSelectedItems = new Set(selectedItems)

    if (isSelected) {
      newSelectedItems.add(itemId)
    } else {
      newSelectedItems.delete(itemId)
    }

    setSelectedItems(newSelectedItems)

    if (selectedRack) {
      setSelectAllItems(newSelectedItems.size === selectedRack.products.length)
    }
  }

  // 품목 전체 선택 핸들러
  const handleSelectAllItems = (checked) => {
    setSelectAllItems(checked)

    if (checked && selectedRack) {
      const newSelectedItems = new Set()
      selectedRack.products.forEach((product) => newSelectedItems.add(product.id))
      setSelectedItems(newSelectedItems)
    } else {
      setSelectedItems(new Set())
    }
  }

  // 선택된 랙 삭제 핸들러
  const handleDeleteSelected = async () => {
    if (selectedRacks.size === 0 || !hasPermission("racks", "edit")) return

    try {
      for (const rackId of Array.from(selectedRacks)) {
        await deleteRack(rackId)
      }
      toast({
        title: "랙 삭제 완료",
        description: "선택한 랙이 삭제되었습니다.",
      })
      setSelectedRacks(new Set())
    } catch (error) {
      console.error('Error deleting racks:', error)
      toast({
        title: "랙 삭제 실패",
        description: "랙을 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 선택된 품목 삭제 핸들러
  const handleDeleteSelectedItems = () => {
    if (!selectedRack || selectedItems.size === 0 || !hasPermission("racks", "edit")) return

    const selectedItemIds = Array.from(selectedItems)
    const updatedProducts = selectedRack.products.filter((product) => !selectedItemIds.includes(product.id))

    const updatedRack = {
      ...selectedRack,
      products: updatedProducts,
    }

    updateRacks((prevRacks) => {
      return prevRacks.map((rack) => (rack.id === selectedRack.id ? updatedRack : rack))
    })

    setSelectedRack(updatedRack)
    setSelectedItems(new Set())
    setSelectAllItems(false)
  }

  // 선택된 품목 이동 핸들러
  const handleMoveSelectedItems = () => {
    if (!selectedRack || !targetRackForMove || !hasPermission("racks", "edit")) return

    const targetRack = racks.find((r) => r.id === targetRackForMove)
    if (!targetRack) return

    const itemsToMove = selectedRack.products.filter((product) => selectedItems.has(product.id))

    updateRacks((prevRacks) => {
      return prevRacks.map((rack) => {
        if (rack.id === selectedRack.id) {
          return {
            ...rack,
            products: rack.products.filter((product) => !selectedItems.has(product.id)),
          }
        }

        if (rack.id === targetRackForMove) {
          return {
            ...rack,
            products: [...rack.products, ...itemsToMove],
          }
        }

        return rack
      })
    })

    setSelectedRack((prev) => {
      if (!prev) return null
      return {
        ...prev,
        products: prev.products.filter((product) => !selectedItems.has(product.id)),
      }
    })

    setSelectedItems(new Set())
    setSelectAllItems(false)
    setIsMoveItemsDialogOpen(false)
  }

  // 랙 추가 핸들러
  const handleAddRack = async () => {
    if (!formName.trim() || !hasPermission("racks", "edit")) return

    try {
      const newRack = {
        name: formName,
        products: [],
        capacity: 100,
        line: formLine
      }
      await addRack(newRack)
      toast({
        title: "랙 추가 완료",
        description: "새로운 랙이 추가되었습니다.",
      })
      setIsAddDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error adding rack:', error)
      toast({
        title: "랙 추가 실패",
        description: "랙을 추가하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 랙 수정 핸들러
  const handleEditRack = async () => {
    if (!selectedRack || !formName.trim() || !hasPermission("racks", "edit")) return

    try {
      await updateRack(selectedRack.id, {
        name: formName,
        line: formLine
      })
      toast({
        title: "랙 수정 완료",
        description: "랙 정보가 수정되었습니다.",
      })
      setIsEditDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error updating rack:', error)
      toast({
        title: "랙 수정 실패",
        description: "랙을 수정하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 랙 이름 수정 핸들러
  const handleEditRackName = () => {
    if (!selectedRack || !editedRackName.trim() || !hasPermission("racks", "edit")) return

    updateRacks((prevRacks) => {
      return prevRacks.map((rack) => {
        if (rack.id === selectedRack.id) {
          return {
            ...rack,
            name: editedRackName,
          }
        }
        return rack
      })
    })

    setSelectedRack({
      ...selectedRack,
      name: editedRackName,
    })
    setIsEditingRackName(false)
  }

  // 랙 수정 시작 핸들러
  const startEditRack = (rack) => {
    if (!hasPermission("racks", "edit")) return

    setSelectedRack(rack)
    setFormName(rack.name)
    setFormLine(rack.line)
    setIsEditDialogOpen(true)
  }

  // 랙 이름 수정 시작 핸들러
  const startEditRackName = () => {
    if (selectedRack && hasPermission("racks", "edit")) {
      setEditedRackName(selectedRack.name)
      setIsEditingRackName(true)
    }
  }

  // 폼 초기화
  const resetForm = () => {
    setFormName("")
    setFormLine("A")
  }

  // 랙 이동 핸들러
  const handleRackDrop = async (rackId: string, targetLine: string) => {
    if (!hasPermission("racks", "edit")) return

    try {
      await updateRack(rackId, { line: targetLine })
      toast({
        title: "랙 이동 완료",
        description: "랙이 이동되었습니다.",
      })
    } catch (error) {
      console.error('Error moving rack:', error)
      toast({
        title: "랙 이동 실패",
        description: "랙을 이동하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 엑셀 템플릿 다운로드 핸들러
  const handleDownloadExcelTemplate = () => {
    const ws = utils.json_to_sheet([
      {
        라인: "A",
        랙이름: "A01",
        품목코드: "SAMPLE-001",
        층: 1,
      },
      {
        라인: "B",
        랙이름: "B02",
        품목코드: "SAMPLE-002",
        층: 2,
      },
    ])

    ws["!cols"] = [{ wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 10 }]

    const wb = {
      Sheets: { 양식: ws },
      SheetNames: ["양식"],
    }

    const excelBuffer = write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "랙_품목_업로드_양식.xlsx"
    document.body.appendChild(link)
    link.click()

    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 100)
  }

  // 라인별 체크박스 핸들러
  const handleSelectLine = (line, checked) => {
    setLineSelections({
      ...lineSelections,
      [line]: checked,
    })

    const newSelectedRacks = new Set(selectedRacks)

    filteredRacks.forEach((rack) => {
      if (rack.line === line) {
        if (checked) {
          newSelectedRacks.add(rack.id)
        } else {
          newSelectedRacks.delete(rack.id)
        }
      }
    })

    setSelectedRacks(newSelectedRacks)
  }

  // 일괄 수정 핸들러
  const handleBulkMoveRacks = () => {
    if (selectedRacks.size === 0 || !hasPermission("racks", "edit")) return

    updateRacks((prevRacks) => {
      return prevRacks.map((rack) => {
        if (selectedRacks.has(rack.id)) {
          return {
            ...rack,
            line: bulkTargetLine,
          }
        }
        return rack
      })
    })

    setIsBulkEditDialogOpen(false)
  }

  if (isLoading) {
    return <RackViewSkeleton />
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">랙 보기</h1>
          <p className="text-muted-foreground">창고 내 제품 위치 관리 및 모니터링</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="랙 또는 제품 검색..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex overflow-x-auto no-scrollbar">
            <div className="flex space-x-2">
              <Button
                variant={activeLine === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveLine("all")}
                className="whitespace-nowrap"
              >
                모든 라인
              </Button>
              {["A", "B", "C", "D", "E", "F", "G", "H"].map((line) => (
                <Button
                  key={line}
                  variant={activeLine === line ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveLine(line)}
                  className="whitespace-nowrap"
                >
                  {line} 라인
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="selectAll" checked={selectAll} onCheckedChange={handleSelectAll} />
            <Label htmlFor="selectAll">전체 선택</Label>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadExcelTemplate}>
              <Download className="mr-2 h-4 w-4" />
              양식 다운로드
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!hasPermission("racks", "edit")}
                    >
                      <FileUp className="mr-2 h-4 w-4" />
                      엑셀 업로드
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".xlsx, .xls"
                      disabled={!hasPermission("racks", "edit")}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>라인/랙이름/품목코드/층 형식의 엑셀 파일을 업로드하세요</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
            disabled={!hasPermission("racks", "edit")}
          >
            <Plus className="mr-2 h-4 w-4" />랙 추가
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (hasPermission("racks", "edit")) {
                if (selectedRacks.size > 0) {
                  setIsBulkEditDialogOpen(true)
                } else if (selectedRack) {
                  startEditRack(selectedRack)
                }
              }
            }}
            disabled={(!selectedRack && selectedRacks.size === 0) || !hasPermission("racks", "edit")}
          >
            <Edit className="mr-2 h-4 w-4" />랙 수정
          </Button>

          <>
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedRacks.size === 0 || !hasPermission("racks", "edit")}
              onClick={() => {
                if (selectedRacks.size > 0 && hasPermission("racks", "edit")) {
                  setIsDeleteConfirmDialogOpen(true)
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              선택 삭제 ({selectedRacks.size})
            </Button>

            <Dialog open={isDeleteConfirmDialogOpen} onOpenChange={setIsDeleteConfirmDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>랙 삭제</DialogTitle>
                  <DialogDescription>
                    선택한 {selectedRacks.size}개의 랙을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteConfirmDialogOpen(false)}>
                    취소
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDeleteSelected()
                      setIsDeleteConfirmDialogOpen(false)
                    }}
                  >
                    삭제
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        </div>

        {/* 가로 레이아웃으로 변경된 랙 라인 표시 */}
        <div className="flex flex-col space-y-4">
          <div className="flex">
            {/* A 라인 */}
            <LineDropZone
              line="A"
              className="mr-10"
              onRackDrop={handleRackDrop}
              filteredRacks={filteredRacks}
              selectedRacks={selectedRacks}
              onSelectLine={handleSelectLine}
            >
              {(racksByLine["A"] || []).map((rack) => (
                <RackComponent
                  key={rack.id}
                  rack={rack}
                  onRackClick={handleRackClick}
                  onProductDrop={handleProductDrop}
                  isSelected={selectedRacks.has(rack.id)}
                  onSelectChange={handleSelectRack}
                  onCopyRack={handleCopyRack}
                />
              ))}
              {(!racksByLine["A"] || racksByLine["A"].length === 0) && (
                <div className="p-3 rounded-lg border-2 w-28 h-28 flex flex-col items-center justify-center bg-gray-100 border-gray-200">
                  <p className="text-xs text-gray-500">비어 있음</p>
                </div>
              )}
            </LineDropZone>

            {/* B와 C 라인 (가깝게 배치) */}
            <div className="flex mr-10">
              {/* B 라인 */}
              <LineDropZone
                line="B"
                onRackDrop={handleRackDrop}
                filteredRacks={filteredRacks}
                selectedRacks={selectedRacks}
                onSelectLine={handleSelectLine}
              >
                {(racksByLine["B"] || []).map((rack) => (
                  <RackComponent
                    key={rack.id}
                    rack={rack}
                    onRackClick={handleRackClick}
                    onProductDrop={handleProductDrop}
                    isSelected={selectedRacks.has(rack.id)}
                    onSelectChange={handleSelectRack}
                    onCopyRack={handleCopyRack}
                  />
                ))}
                {(!racksByLine["B"] || racksByLine["B"].length === 0) && (
                  <div className="p-3 rounded-lg border-2 w-28 h-28 flex flex-col items-center justify-center bg-gray-100 border-gray-200">
                    <p className="text-xs text-gray-500">비어 있음</p>
                  </div>
                )}
              </LineDropZone>

              {/* C 라인 */}
              <LineDropZone
                line="C"
                onRackDrop={handleRackDrop}
                filteredRacks={filteredRacks}
                selectedRacks={selectedRacks}
                onSelectLine={handleSelectLine}
              >
                {(racksByLine["C"] || []).map((rack) => (
                  <RackComponent
                    key={rack.id}
                    rack={rack}
                    onRackClick={handleRackClick}
                    onProductDrop={handleProductDrop}
                    isSelected={selectedRacks.has(rack.id)}
                    onSelectChange={handleSelectRack}
                    onCopyRack={handleCopyRack}
                  />
                ))}
                {(!racksByLine["C"] || racksByLine["C"].length === 0) && (
                  <div className="p-3 rounded-lg border-2 w-28 h-28 flex flex-col items-center justify-center bg-gray-100 border-gray-200">
                    <p className="text-xs text-gray-500">비어 있음</p>
                  </div>
                )}
              </LineDropZone>
            </div>

            {/* D와 E 라인 (가깝게 배치) */}
            <div className="flex mr-10">
              {/* D 라인 */}
              <LineDropZone
                line="D"
                onRackDrop={handleRackDrop}
                filteredRacks={filteredRacks}
                selectedRacks={selectedRacks}
                onSelectLine={handleSelectLine}
              >
                {(racksByLine["D"] || []).map((rack) => (
                  <RackComponent
                    key={rack.id}
                    rack={rack}
                    onRackClick={handleRackClick}
                    onProductDrop={handleProductDrop}
                    isSelected={selectedRacks.has(rack.id)}
                    onSelectChange={handleSelectRack}
                    onCopyRack={handleCopyRack}
                  />
                ))}
                {(!racksByLine["D"] || racksByLine["D"].length === 0) && (
                  <div className="p-3 rounded-lg border-2 w-28 h-28 flex flex-col items-center justify-center bg-gray-100 border-gray-200">
                    <p className="text-xs text-gray-500">비어 있음</p>
                  </div>
                )}
              </LineDropZone>

              {/* E 라인 */}
              <LineDropZone
                line="E"
                onRackDrop={handleRackDrop}
                filteredRacks={filteredRacks}
                selectedRacks={selectedRacks}
                onSelectLine={handleSelectLine}
              >
                {(racksByLine["E"] || []).map((rack) => (
                  <RackComponent
                    key={rack.id}
                    rack={rack}
                    onRackClick={handleRackClick}
                    onProductDrop={handleProductDrop}
                    isSelected={selectedRacks.has(rack.id)}
                    onSelectChange={handleSelectRack}
                    onCopyRack={handleCopyRack}
                  />
                ))}
                {(!racksByLine["E"] || racksByLine["E"].length === 0) && (
                  <div className="p-3 rounded-lg border-2 w-28 h-28 flex flex-col items-center justify-center bg-gray-100 border-gray-200">
                    <p className="text-xs text-gray-500">비어 있음</p>
                  </div>
                )}
              </LineDropZone>
            </div>

            {/* F와 G 라인 (가깝게 배치) */}
            <div className="flex mr-10">
              {/* F 라인 */}
              <LineDropZone
                line="F"
                onRackDrop={handleRackDrop}
                filteredRacks={filteredRacks}
                selectedRacks={selectedRacks}
                onSelectLine={handleSelectLine}
              >
                {(racksByLine["F"] || []).map((rack) => (
                  <RackComponent
                    key={rack.id}
                    rack={rack}
                    onRackClick={handleRackClick}
                    onProductDrop={handleProductDrop}
                    isSelected={selectedRacks.has(rack.id)}
                    onSelectChange={handleSelectRack}
                    onCopyRack={handleCopyRack}
                  />
                ))}
                {(!racksByLine["F"] || racksByLine["F"].length === 0) && (
                  <div className="p-3 rounded-lg border-2 w-28 h-28 flex flex-col items-center justify-center bg-gray-100 border-gray-200">
                    <p className="text-xs text-gray-500">비어 있음</p>
                  </div>
                )}
              </LineDropZone>

              {/* G 라인 */}
              <LineDropZone
                line="G"
                onRackDrop={handleRackDrop}
                filteredRacks={filteredRacks}
                selectedRacks={selectedRacks}
                onSelectLine={handleSelectLine}
              >
                {(racksByLine["G"] || []).map((rack) => (
                  <RackComponent
                    key={rack.id}
                    rack={rack}
                    onRackClick={handleRackClick}
                    onProductDrop={handleProductDrop}
                    isSelected={selectedRacks.has(rack.id)}
                    onSelectChange={handleSelectRack}
                    onCopyRack={handleCopyRack}
                  />
                ))}
                {(!racksByLine["G"] || racksByLine["G"].length === 0) && (
                  <div className="p-3 rounded-lg border-2 w-28 h-28 flex flex-col items-center justify-center bg-gray-100 border-gray-200">
                    <p className="text-xs text-gray-500">비어 있음</p>
                  </div>
                )}
              </LineDropZone>
            </div>

            {/* H 라인 */}
            <LineDropZone
              line="H"
              onRackDrop={handleRackDrop}
              filteredRacks={filteredRacks}
              selectedRacks={selectedRacks}
              onSelectLine={handleSelectLine}
            >
              {(racksByLine["H"] || []).map((rack) => (
                <RackComponent
                  key={rack.id}
                  rack={rack}
                  onRackClick={handleRackClick}
                  onProductDrop={handleProductDrop}
                  isSelected={selectedRacks.has(rack.id)}
                  onSelectChange={handleSelectRack}
                  onCopyRack={handleCopyRack}
                />
              ))}
              {(!racksByLine["H"] || racksByLine["H"].length === 0) && (
                <div className="p-3 rounded-lg border-2 w-28 h-28 flex flex-col items-center justify-center bg-gray-100 border-gray-200">
                  <p className="text-xs text-gray-500">비어 있음</p>
                </div>
              )}
            </LineDropZone>
          </div>
        </div>

        {/* 엑셀 미리보기 다이얼로그 */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>엑셀 일괄 업로드</DialogTitle>
              <DialogDescription>
                엑셀 파일을 업로드하여 랙과 품목을 일괄 등록합니다.
                <br />
                파일은 라인, 랙이름, 품목코드, 층 컬럼을 포함해야 합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">엑셀 파일 선택</p>
                <div className="border rounded-md p-3 bg-muted/50">
                  {selectedFileName ? (
                    <p className="text-sm">{selectedFileName}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">파일을 선택하세요</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">지원 형식: .xlsx, .xls (Excel 97-2003)</p>
              </div>

              {uploadErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h3 className="text-red-600 font-medium mb-2">오류 발생</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {uploadErrors.map((error, index) => (
                      <li key={index} className="text-red-600 text-sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {previewData.length > 0 && (
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>라인</TableHead>
                        <TableHead>랙이름</TableHead>
                        <TableHead>품목코드</TableHead>
                        <TableHead>층</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(0, 5).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.라인}</TableCell>
                          <TableCell>{row.랙이름}</TableCell>
                          <TableCell>{row.품목코드}</TableCell>
                          <TableCell>{row.층 || 1}</TableCell>
                        </TableRow>
                      ))}
                      {previewData.length > 5 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            외 {previewData.length - 5}개 항목
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={processExcelData} disabled={previewData.length === 0 || !hasPermission("racks", "edit")}>
                가져오기 ({validRowCount}개)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 랙 상세 정보 다이얼로그 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {isEditingRackName && hasPermission("racks", "edit") ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        value={editedRackName}
                        onChange={(e) => setEditedRackName(e.target.value)}
                        className="w-40"
                      />
                      <Button size="sm" onClick={handleEditRackName}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <DialogTitle>{selectedRack ? `랙 ${selectedRack.name} 상세 정보` : "랙 상세 정보"}</DialogTitle>
                      {hasPermission("racks", "edit") && (
                        <Button variant="ghost" size="sm" onClick={startEditRackName} className="ml-2">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {selectedRack && hasPermission("racks", "edit") && (
                  <Button variant="outline" size="sm" onClick={() => handleCopyRack(selectedRack)}>
                    <Copy className="mr-2 h-4 w-4" />랙 복사
                  </Button>
                )}
              </div>
              <DialogDescription>
                {selectedRack ? (
                  <>
                    {selectedRack.line} 라인 • {selectedRack.products.length} 항목
                  </>
                ) : (
                  ""
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedRack && (
              <>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="selectAllItems" checked={selectAllItems} onCheckedChange={handleSelectAllItems} />
                      <Label htmlFor="selectAllItems">전체 선택</Label>
                    </div>
                    <div className="flex space-x-2">
                      {hasPermission("racks", "edit") && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setIsAddItemDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            품목 추가
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsMoveItemsDialogOpen(true)}
                            disabled={selectedItems.size === 0}
                          >
                            <MoveRight className="mr-2 h-4 w-4" />
                            이동
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={selectedItems.size === 0}
                            onClick={() => {
                              if (selectedItems.size > 0) {
                                setIsItemsDeleteConfirmDialogOpen(true)
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            삭제
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedRack.products.length > 0 ? (
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>품목 코드</TableHead>
                            <TableHead>이름</TableHead>
                            <TableHead>설명</TableHead>
                            <TableHead>카테고리</TableHead>
                            <TableHead>층</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRack.products
                            .slice()
                            .sort((a, b) => (b.floor || 0) - (a.floor || 0))
                            .map((product) => {
                              const productDetails = productCodes.find((p) => p.code === product.code) || {}

                              return (
                                <TableRow key={product.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedItems.has(product.id)}
                                      onCheckedChange={(checked) => handleSelectItem(product.id, checked === true)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">{product.code}</TableCell>
                                  <TableCell>{productDetails.name || "-"}</TableCell>
                                  <TableCell className="max-w-[200px] truncate">
                                    {productDetails.description || "-"}
                                  </TableCell>
                                  <TableCell>{productDetails.category || "-"}</TableCell>
                                  <TableCell>{product.floor || "-"}</TableCell>
                                </TableRow>
                              )
                            })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <div className="rounded-full bg-muted p-3">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-sm text-muted-foreground">해당 랙에는 품목이 없습니다.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 랙 추가 다이얼로그 */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>새 랙 추가</DialogTitle>
              <DialogDescription>새로운 랙의 정보를 입력하세요. 랙 이름과 라인을 지정해야 합니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  랙 이름
                </Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="col-span-3"
                  placeholder="예: A01, B02 등"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="line" className="text-right">
                  라인
                </Label>
                <select
                  id="line"
                  value={formLine}
                  onChange={(e) => setFormLine(e.target.value)}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {["A", "B", "C", "D", "E", "F", "G", "H"].map((line) => (
                    <option key={line} value={line}>
                      {line} 라인
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleAddRack}>추가</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 랙 일괄 수정 다이얼로그 */}
        <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>랙 일괄 수정</DialogTitle>
              <DialogDescription>선택한 {selectedRacks.size}개의 랙을 일괄 수정합니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bulk-line" className="text-right">
                  이동할 라인
                </Label>
                <select
                  id="bulk-line"
                  value={bulkTargetLine}
                  onChange={(e) => setBulkTargetLine(e.target.value)}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {["A", "B", "C", "D", "E", "F", "G", "H"].map((line) => (
                    <option key={line} value={line}>
                      {line} 라인
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkEditDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleBulkMoveRacks}>이동</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 품목 추가 다이얼로그 */}
        <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>품목 추가</DialogTitle>
              <DialogDescription>랙에 추가할 품목을 선택하세요.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="품목 검색..."
                  className="pl-8"
                  value={searchProductQuery}
                  onChange={(e) => setSearchProductQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="selectAllSearchProducts"
                  checked={selectAllSearchProducts}
                  onCheckedChange={handleSelectAllSearchProducts}
                />
                <Label htmlFor="selectAllSearchProducts">전체 선택</Label>
              </div>

              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="floor" className="text-right">
                  층 선택
                </Label>
                <select
                  id="floor"
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(Number(e.target.value))}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {[1, 2, 3, 4].map((floor) => (
                    <option key={floor} value={floor}>
                      {floor}층
                    </option>
                  ))}
                </select>
              </div>

              <ScrollArea className="h-[300px] border rounded-md p-2">
                <div className="space-y-2">
                  {filteredProductCodes.length > 0 ? (
                    filteredProductCodes.map((product) => (
                      <div key={product.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md">
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={selectedProductIds.has(product.id)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id, checked === true)}
                        />
                        <Label htmlFor={`product-${product.id}`} className="flex-1 cursor-pointer">
                          <div className="font-medium">{product.code}</div>
                          <div className="text-sm text-muted-foreground">{product.description}</div>
                        </Label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-4 text-muted-foreground">검색 결과가 없습니다.</div>
                  )}
                </div>
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleAddSelectedItems} disabled={selectedProductIds.size === 0}>
                추가 ({selectedProductIds.size}개)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 품목 이동 다이얼로그 */}
        <Dialog open={isMoveItemsDialogOpen} onOpenChange={setIsMoveItemsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>품목 이동</DialogTitle>
              <DialogDescription>선택한 {selectedItems.size}개의 품목을 이동할 랙을 선택하세요.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="targetRack" className="text-right">
                  대상 랙
                </Label>
                <select
                  id="targetRack"
                  value={targetRackForMove}
                  onChange={(e) => setTargetRackForMove(e.target.value)}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">랙 선택</option>
                  {racks
                    .filter((rack) => rack.id !== selectedRack?.id)
                    .map((rack) => (
                      <option key={rack.id} value={rack.id}>
                        {rack.line} 라인 - {rack.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMoveItemsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleMoveSelectedItems} disabled={!targetRackForMove}>
                이동
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 품목 삭제 확인 다이얼로그 */}
        <Dialog open={isItemsDeleteConfirmDialogOpen} onOpenChange={setIsItemsDeleteConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>품목 삭제</DialogTitle>
              <DialogDescription>
                선택한 {selectedItems.size}개의 품목을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsItemsDeleteConfirmDialogOpen(false)}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteSelectedItems()
                  setIsItemsDeleteConfirmDialogOpen(false)
                }}
              >
                삭제
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 엑셀 업로드 결과 다이얼로그 */}
        <Dialog open={isExcelUploadDialogOpen} onOpenChange={setIsExcelUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>엑셀 업로드 결과</DialogTitle>
              <DialogDescription>엑셀 파일 업로드 결과입니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-green-600">성공적으로 {uploadResult.success}개의 항목을 업로드했습니다.</p>
              </div>
              {uploadResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h3 className="text-red-600 font-medium mb-2">오류 발생</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {uploadResult.errors.map((error, index) => (
                      <li key={index} className="text-red-600 text-sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsExcelUploadDialogOpen(false)}>확인</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  )
}
