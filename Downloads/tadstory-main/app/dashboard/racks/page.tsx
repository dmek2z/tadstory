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
import { useStorage, Product } from "@/contexts/storage-context" // Product 타입 임포트
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

// 드래그 가능한 제품 컴포넌트 (Props 타입 명시)
interface DraggableProductProps {
  product: Product; // Product 타입 사용
  rackId: string;
}
const DraggableProduct: React.FC<DraggableProductProps> = ({ product, rackId }) => {
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


// 랙 컴포넌트 (Props 타입 명시)
interface RackComponentProps {
  rack: ReturnType<typeof useStorage>['racks'][0]; // useStorage에서 가져온 Rack 타입 사용
  onRackClick: (rack: RackComponentProps['rack']) => void;
  onProductDrop: (product: Product, sourceRackId: string, targetRackId: string) => void;
  isSelected: boolean;
  onSelectChange: (rackId: string, checked: boolean) => void;
  onCopyRack: (rack: RackComponentProps['rack']) => void;
}
const RackComponent: React.FC<RackComponentProps> = ({ rack, onRackClick, onProductDrop, isSelected, onSelectChange, onCopyRack }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.PRODUCT,
    drop: (item: { product: Product, sourceRackId: string }) => { // item 타입 명시
      onProductDrop(item.product, item.sourceRackId, rack.id)
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }))

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.RACK,
    item: { rack, type: ItemTypes.RACK }, // rack 타입 명시
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

// 라인 드롭 영역 컴포넌트 (Props 타입 명시)
interface LineDropZoneProps {
  line: string;
  children: React.ReactNode;
  className?: string;
  onRackDrop: (rackId: string, targetLine: string) => void;
  filteredRacks: ReturnType<typeof useStorage>['racks'];
  selectedRacks: Set<string>;
  onSelectLine: (line: string, checked: boolean) => void;
}

const LineDropZone: React.FC<LineDropZoneProps> = ({ line, children, className = "", onRackDrop, filteredRacks, selectedRacks, onSelectLine }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.RACK,
    drop: (item: { rack: { id: string, line: string } }) => { // item 타입 명시
      if (item.rack.line !== line) {
        onRackDrop(item.rack.id, line)
      }
    },
    canDrop: (item: { rack: { line: string } }) => item.rack.line !== line, // item 타입 명시
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
  const { racks, addRack: storageAddRack, updateRack: storageUpdateRack, deleteRack: storageDeleteRack, productCodes, isLoading } = useStorage()
  const { hasPermission } = useAuth()
  const { toast } = useToast()

  // 상태 관리
  const [selectedRack, setSelectedRack] = useState<ReturnType<typeof useStorage>['racks'][0] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [isMoveItemsDialogOpen, setIsMoveItemsDialogOpen] = useState(false)
  const [isExcelUploadDialogOpen, setIsExcelUploadDialogOpen] = useState(false)
  const [uploadResult, setUploadResult] = useState({ success: 0, errors: [] as string[] }) // errors 타입 명시
  const fileInputRef = useRef<HTMLInputElement>(null) // 타입 명시

  // 검색 및 필터링 상태
  const [searchQuery, setSearchQuery] = useState("")
  const [activeLine, setActiveLine] = useState("all")
  const [selectedRacks, setSelectedRacks] = useState<Set<string>>(new Set()) // 타입 명시
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set()) // 타입 명시
  const [selectAll, setSelectAll] = useState(false)
  const [selectAllItems, setSelectAllItems] = useState(false)

  // 품목 관련 상태
  const [searchProductQuery, setSearchProductQuery] = useState("")
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set()) // 타입 명시
  const [selectAllSearchProducts, setSelectAllSearchProducts] = useState(false)
  const [selectedFloor, setSelectedFloor] = useState(1)

  // 기타 상태
  const [targetRackForMove, setTargetRackForMove] = useState("")
  const [isEditingRackName, setIsEditingRackName] = useState(false)
  const [editedRackName, setEditedRackName] = useState("")
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false)
  const [isRackDeleteConfirmDialogOpen, setIsRackDeleteConfirmDialogOpen] = useState(false) // 사용 안 함, 삭제 가능
  const [isItemsDeleteConfirmDialogOpen, setIsItemsDeleteConfirmDialogOpen] = useState(false)
  const [formName, setFormName] = useState("")
  const [formLine, setFormLine] = useState("A")
  const [lineSelections, setLineSelections] = useState<Record<string, boolean>>({}) // 타입 명시
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false)
  const [bulkTargetLine, setBulkTargetLine] = useState("A")

  // 엑셀 업로드 관련 상태
  const [previewData, setPreviewData] = useState<any[]>([]) // 타입 명시
  const [uploadErrors, setUploadErrorsState] = useState<string[]>([]) // setUploadErrors와 구분하기 위해 이름 변경
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [validRowCount, setValidRowCount] = useState(0)
  const [selectedFileName, setSelectedFileName] = useState("")

  // 검색어에 따라 필터링된 품목 목록
  const filteredProductCodes = productCodes.filter(
    (product) =>
      searchProductQuery === "" ||
      product.code.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchProductQuery.toLowerCase())) || // null 체크 추가
      (product.category && product.category.toLowerCase().includes(searchProductQuery.toLowerCase())) // null 체크 추가
  );


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
  }, {} as Record<string, ReturnType<typeof useStorage>['racks']>) // 타입 명시

  // 품목 선택 핸들러
  const handleSelectProduct = (productId: string, isSelected: boolean) => { // 타입 명시
    const newSelectedProductIds = new Set(selectedProductIds)

    if (isSelected) {
      newSelectedProductIds.add(productId)
    } else {
      newSelectedProductIds.delete(productId)
    }

    setSelectedProductIds(newSelectedProductIds)
    setSelectAllSearchProducts(newSelectedProductIds.size === filteredProductCodes.length && filteredProductCodes.length > 0) // filteredProductCodes.length > 0 조건 추가
  }


  // 검색 결과 전체 선택 핸들러
  const handleSelectAllSearchProducts = (checked: boolean) => { // 타입 명시
    setSelectAllSearchProducts(checked)

    if (checked) {
      const newSelectedProductIds = new Set<string>() // 타입 명시
      filteredProductCodes.forEach((product) => newSelectedProductIds.add(product.id))
      setSelectedProductIds(newSelectedProductIds)
    } else {
      setSelectedProductIds(new Set())
    }
  }

  // 품목 추가 핸들러
  const handleAddSelectedItems = async () => {
    if (!selectedRack) return;

    const itemsToAdd: Omit<Product, 'id'>[] = productCodes // Product 타입에 맞게 Omit 사용
      .filter((product) => selectedProductIds.has(product.id))
      .map((product) => ({
        code: product.code,
        inbound_at: new Date().toISOString(), // 변경: inboundDate -> inbound_at, ISO 문자열 전체 사용
        outbound_at: null, // 변경: outboundDate -> outbound_at
        weight: Math.floor(Math.random() * 50) + 10, // 예시 데이터, 실제 값으로 대체 필요
        manufacturer: ["냉동식품", "얼음식품", "극지방제품", "북극신선", "콜드요리"][Math.floor(Math.random() * 5)], // 예시 데이터
        floor: selectedFloor,
      }));

    if (itemsToAdd.length === 0) return;

    const updatedProducts = [...selectedRack.products];
    for (const item of itemsToAdd) {
        // storageAddProduct를 직접 호출하지 않고, rack의 products 배열을 직접 업데이트합니다.
        // 실제 DB 업데이트는 storageUpdateRack을 통해 이루어져야 합니다.
        const newProductEntry: Product = {
            ...item,
            id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // 임시 ID
        };
        updatedProducts.push(newProductEntry);
    }

    try {
        await storageUpdateRack(selectedRack.id, { products: updatedProducts });
        setSelectedRack(prev => prev ? { ...prev, products: updatedProducts } : null);
        toast({ title: "품목 추가 완료", description: `${itemsToAdd.length}개의 품목이 랙에 추가되었습니다.` });
    } catch (error) {
        console.error("Error adding items to rack:", error);
        toast({ title: "품목 추가 실패", description: "품목을 랙에 추가하는 중 오류가 발생했습니다.", variant: "destructive" });
    }


    setSearchProductQuery("")
    setSelectedProductIds(new Set())
    setSelectAllSearchProducts(false)
    setSelectedFloor(1)
    setIsAddItemDialogOpen(false)
  }


  // 랙 복사 핸들러
  const handleCopyRack = async (rackToCopy: RackComponentProps['rack']) => { // 타입 명시
    if (!hasPermission("racks", "edit")) return

    const baseName = rackToCopy.name.replace(/\(\d+\)$/, "").trim(); // 숫자 접미사 제거

    const similarRacks = racks.filter(
      (rack) => rack.name === baseName || rack.name.startsWith(`${baseName} (`)
    );

    let maxNum = 0;
    similarRacks.forEach((rack) => {
      if (rack.name === baseName && maxNum < 1) { // 원본 이름과 같으면 다음 번호는 (2)
          maxNum = 1;
      } else {
          const match = rack.name.match(/\((\d+)\)$/);
          if (match) {
            const num = Number.parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
      }
    });


    const newRackName = `${baseName} (${maxNum + 1})`;

    const newRackData: Omit<ReturnType<typeof useStorage>['racks'][0], 'id'> = { // 타입 명시
      name: newRackName,
      products: rackToCopy.products.map((product) => ({
        ...product, // 기존 product 속성 복사
        id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, // 새 ID 생성
      })),
      capacity: rackToCopy.capacity,
      line: rackToCopy.line,
    }

    try {
      await storageAddRack(newRackData)
      toast({ title: "랙 복사 완료", description: `랙 "${newRackName}"이(가) 복사되었습니다.` })
    } catch (error) {
      console.error('Error copying rack:', error)
      toast({ title: "랙 복사 실패", description: "랙을 복사하는 중 오류가 발생했습니다.", variant: "destructive" })
    }
  }


  // 엑셀 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { // 타입 명시
    if (!hasPermission("racks", "edit")) return

    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFileName(file.name)

    const reader = new FileReader()
    reader.onload = (ev) => { // ev 타입 변경
      const data = ev.target?.result
      if (!data) return

      try {
        const workbook = read(data, { type: "binary" })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const rows: any[] = utils.sheet_to_json(worksheet) // rows 타입 any[]로 명시

        // 데이터 검증
        const currentUploadErrors: string[] = [] // 지역 변수로 변경
        const validRows: any[] = [] // 타입 명시
        const existingLines = new Set(racks.map((rack) => rack.line))
        const existingProductCodesSet = new Set(productCodes.map((product) => product.code)) // Set으로 변경하여 성능 향상

        rows.forEach((row, index) => {
          const line = row.라인
          const rackName = row.랙이름
          const productCodeValue = row.품목코드 // productCodeValue로 변경
          const floor = row.층

          // 유효성 검사
          if (!line || !rackName || !productCodeValue) {
            currentUploadErrors.push(`행 ${index + 2}: 필수 필드(라인, 랙이름, 품목코드)가 비어 있습니다.`)
            return
          }

          if (!existingLines.has(line)) {
            currentUploadErrors.push(`행 ${index + 2}: 존재하지 않는 라인 "${line}"입니다.`)
            return
          }

          if (!existingProductCodesSet.has(productCodeValue)) {
            currentUploadErrors.push(`행 ${index + 2}: 존재하지 않는 품목코드 "${productCodeValue}"입니다.`)
            return
          }

          if (floor && (Number(floor) < 1 || Number(floor) > 4 || !Number.isInteger(Number(floor)))) { // 숫자 및 범위 검사 강화
            currentUploadErrors.push(`행 ${index + 2}: 층은 1부터 4까지의 정수여야 합니다. (입력값: ${floor})`)
            return
          }


          validRows.push(row)
        })

        setPreviewData(validRows)
        setUploadErrorsState(currentUploadErrors) // 상태 업데이트 함수 사용
        setValidRowCount(validRows.length)
        setIsPreviewDialogOpen(true)

        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      } catch (error) {
        console.error("엑셀 파일 처리 중 오류:", error)
        setUploadErrorsState(["엑셀 파일 처리 중 오류가 발생했습니다."]) // 상태 업데이트 함수 사용
        setPreviewData([])
        setValidRowCount(0)
        setIsPreviewDialogOpen(true)
      }
    }

    reader.readAsBinaryString(file)
  }


  // 엑셀 데이터 처리 핸들러
  const processExcelData = async () => {
    if (!hasPermission("racks", "edit") || previewData.length === 0) return;

    const currentUploadErrors: string[] = [];
    let successCount = 0;
    const racksToUpdate: { [key: string]: ReturnType<typeof useStorage>['racks'][0] } = {}; // 업데이트할 랙들을 임시 저장
    const racksToAdd: Omit<ReturnType<typeof useStorage>['racks'][0], 'id'>[] = []; // 새로 추가할 랙들

    previewData.forEach((row) => {
        const line = row.라인 as string;
        const rackName = row.랙이름 as string;
        const productCodeValue = row.품목코드 as string; // productCodeValue로 변경

        let targetRack = racks.find((rack) => rack.name === rackName && rack.line === line);

        if (!targetRack && !racksToAdd.find(r => r.name === rackName && r.line === line) && !racksToUpdate[`${line}-${rackName}`]) {
            const newRackData: Omit<ReturnType<typeof useStorage>['racks'][0], 'id'> = {
                name: rackName,
                products: [],
                capacity: 4, // 기본값
                line,
            };
            racksToAdd.push(newRackData);
            // 임시로 racksToUpdate에 추가하여 다음 품목 처리 시 참조할 수 있도록 함
            racksToUpdate[`${line}-${rackName}`] = { ...newRackData, id: `temp-${Date.now()}-${Math.random()}` };
            targetRack = racksToUpdate[`${line}-${rackName}`];
        } else if (targetRack && !racksToUpdate[targetRack.id]) {
             racksToUpdate[targetRack.id] = JSON.parse(JSON.stringify(targetRack)); // 기존 랙 복사
             targetRack = racksToUpdate[targetRack.id];
        } else if (!targetRack && racksToUpdate[`${line}-${rackName}`]) {
            targetRack = racksToUpdate[`${line}-${rackName}`];
        }


        if (targetRack) {
            const newProduct: Product = { // Product 타입 사용
                id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                code: productCodeValue,
                inbound_at: new Date().toISOString(), // 변경
                outbound_at: null, // 변경
                weight: Math.floor(Math.random() * 50) + 10,
                manufacturer: ["냉동식품", "얼음식품", "극지방제품", "북극신선", "콜드요리"][Math.floor(Math.random() * 5)],
                floor: Number(row.층) || 1,
            };
            targetRack.products.push(newProduct);
            successCount++;
        } else {
            currentUploadErrors.push(`랙 ${line}-${rackName}을(를) 찾거나 생성할 수 없습니다.`);
        }
    });

    try {
        // 새 랙 추가
        for (const newRackData of racksToAdd) {
            await storageAddRack(newRackData);
        }
        // 기존 랙 업데이트
        for (const rackId in racksToUpdate) {
            const rackToSave = racksToUpdate[rackId];
            if (!rackId.startsWith('temp-')) { // 임시 ID가 아닌 실제 ID를 가진 랙만 업데이트
                 await storageUpdateRack(rackId, { products: rackToSave.products, line: rackToSave.line, name: rackToSave.name, capacity: rackToSave.capacity });
            }
        }
        toast({ title: "엑셀 데이터 처리 완료", description: `${successCount}개의 품목이 처리되었습니다.` });
    } catch (error) {
        console.error("Error processing excel data:", error);
        toast({ title: "엑셀 데이터 처리 실패", description: "데이터를 저장하는 중 오류가 발생했습니다.", variant: "destructive" });
        currentUploadErrors.push("데이터베이스 저장 중 오류 발생");
    }


    setUploadResult({
        success: successCount,
        errors: currentUploadErrors,
    });
    setIsExcelUploadDialogOpen(true); // 결과를 보여주기 위해 다른 다이얼로그를 열거나, 현재 다이얼로그 내용을 업데이트
    setIsPreviewDialogOpen(false); // 미리보기 다이얼로그는 닫음
};


  // 랙 클릭 핸들러
  const handleRackClick = (rack: RackComponentProps['rack']) => { // 타입 명시
    setSelectedRack(rack)
    setSelectedItems(new Set())
    setSelectAllItems(false)
    setIsDialogOpen(true)
  }

  // 제품 드롭 핸들러
  const handleProductDrop = async (product: Product, sourceRackId: string, targetRackId: string) => { // product 타입 명시
    if (sourceRackId === targetRackId || !hasPermission("racks", "edit")) return

    const sourceRack = racks.find(r => r.id === sourceRackId);
    const targetRack = racks.find(r => r.id === targetRackId);

    if (!sourceRack || !targetRack) return;

    const updatedSourceProducts = sourceRack.products.filter((p) => p.id !== product.id);
    const updatedTargetProducts = [...targetRack.products, product];

    try {
      await storageUpdateRack(sourceRackId, { products: updatedSourceProducts });
      await storageUpdateRack(targetRackId, { products: updatedTargetProducts });
      toast({ title: "품목 이동 완료", description: `품목이 ${sourceRack.name}에서 ${targetRack.name}(으)로 이동되었습니다.` });
    } catch (error) {
      console.error('Error moving product:', error);
      toast({ title: "품목 이동 실패", description: "품목을 이동하는 중 오류가 발생했습니다.", variant: "destructive" });
    }
  }


  // 랙 선택 핸들러
  const handleSelectRack = (rackId: string, isSelected: boolean) => { // 타입 명시
    const newSelectedRacks = new Set(selectedRacks)

    if (isSelected) {
      newSelectedRacks.add(rackId)
    } else {
      newSelectedRacks.delete(rackId)
    }

    setSelectedRacks(newSelectedRacks)
    setSelectAll(newSelectedRacks.size === filteredRacks.length && filteredRacks.length > 0) // filteredRacks.length > 0 조건 추가
  }


  // 전체 선택 핸들러
  const handleSelectAll = (checked: boolean) => { // 타입 명시
    setSelectAll(checked)

    if (checked) {
      const newSelectedRacks = new Set<string>() // 타입 명시
      filteredRacks.forEach((rack) => newSelectedRacks.add(rack.id))
      setSelectedRacks(newSelectedRacks)
    } else {
      setSelectedRacks(new Set())
    }
  }

  // 품목 선택 핸들러
  const handleSelectItem = (itemId: string, isSelected: boolean) => { // 타입 명시
    const newSelectedItems = new Set(selectedItems)

    if (isSelected) {
      newSelectedItems.add(itemId)
    } else {
      newSelectedItems.delete(itemId)
    }

    setSelectedItems(newSelectedItems)

    if (selectedRack) {
      setSelectAllItems(newSelectedItems.size === selectedRack.products.length && selectedRack.products.length > 0) // selectedRack.products.length > 0 조건 추가
    }

  }


  // 품목 전체 선택 핸들러
  const handleSelectAllItems = (checked: boolean) => { // 타입 명시
    setSelectAllItems(checked)

    if (checked && selectedRack) {
      const newSelectedItems = new Set<string>() // 타입 명시
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
        await storageDeleteRack(rackId as string) // 타입 단언
      }
      toast({
        title: "랙 삭제 완료",
        description: "선택한 랙이 삭제되었습니다.",
      })
      setSelectedRacks(new Set())
      setSelectAll(false); // 전체 선택 해제
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
  const handleDeleteSelectedItems = async () => {
    if (!selectedRack || selectedItems.size === 0 || !hasPermission("racks", "edit")) return

    const selectedItemIds = Array.from(selectedItems)
    const updatedProducts = selectedRack.products.filter((product) => !selectedItemIds.includes(product.id))

    try {
      await storageUpdateRack(selectedRack.id, { products: updatedProducts });
      setSelectedRack((prev) => prev ? { ...prev, products: updatedProducts } : null);
      setSelectedItems(new Set());
      setSelectAllItems(false);
      toast({ title: "품목 삭제 완료", description: `${selectedItemIds.length}개의 품목이 삭제되었습니다.` });
    } catch (error) {
      console.error("Error deleting selected items from rack:", error);
      toast({ title: "품목 삭제 실패", description: "품목을 삭제하는 중 오류가 발생했습니다.", variant: "destructive" });
    }
  }


  // 선택된 품목 이동 핸들러
  const handleMoveSelectedItems = async () => {
    if (!selectedRack || !targetRackForMove || selectedItems.size === 0 || !hasPermission("racks", "edit")) return;

    const targetRack = racks.find((r) => r.id === targetRackForMove);
    if (!targetRack) {
        toast({ title: "오류", description: "대상 랙을 찾을 수 없습니다.", variant: "destructive" });
        return;
    }

    const itemsToMove = selectedRack.products.filter((product) => selectedItems.has(product.id));
    const remainingSourceProducts = selectedRack.products.filter((product) => !selectedItems.has(product.id));
    const updatedTargetProducts = [...targetRack.products, ...itemsToMove];

    try {
        await storageUpdateRack(selectedRack.id, { products: remainingSourceProducts });
        await storageUpdateRack(targetRack.id, { products: updatedTargetProducts });

        setSelectedRack((prev) => prev ? { ...prev, products: remainingSourceProducts } : null);
        setSelectedItems(new Set());
        setSelectAllItems(false);
        setIsMoveItemsDialogOpen(false);
        setTargetRackForMove(""); // 대상 랙 선택 초기화
        toast({ title: "품목 이동 완료", description: `${itemsToMove.length}개의 품목이 ${targetRack.name}(으)로 이동되었습니다.` });
    } catch (error) {
        console.error("Error moving items:", error);
        toast({ title: "품목 이동 실패", description: "품목을 이동하는 중 오류가 발생했습니다.", variant: "destructive" });
    }
};


  // 랙 추가 핸들러
  const handleAddRack = async () => {
    if (!formName.trim() || !hasPermission("racks", "edit")) return

    try {
      const newRackData: Omit<ReturnType<typeof useStorage>['racks'][0], 'id'> = { // 타입 명시
        name: formName,
        products: [],
        capacity: 100, // 기본값 또는 사용자 입력값
        line: formLine
      }
      await storageAddRack(newRackData)
      toast({
        title: "랙 추가 완료",
        description: "새로운 랙이 추가되었습니다.",
      })
      setIsAddDialogOpen(false)
      localResetForm() // resetForm을 localResetForm으로 변경
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
      await storageUpdateRack(selectedRack.id, {
        name: formName,
        line: formLine
      })
      toast({
        title: "랙 수정 완료",
        description: "랙 정보가 수정되었습니다.",
      })
      setIsEditDialogOpen(false)
      localResetForm() // resetForm을 localResetForm으로 변경
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
  const handleEditRackName = async () => {
    if (!selectedRack || !editedRackName.trim() || !hasPermission("racks", "edit")) return;

    try {
        await storageUpdateRack(selectedRack.id, { name: editedRackName });
        setSelectedRack(prev => prev ? { ...prev, name: editedRackName } : null);
        setIsEditingRackName(false);
        toast({ title: "랙 이름 수정 완료", description: `랙 이름이 "${editedRackName}"(으)로 변경되었습니다.` });
    } catch (error) {
        console.error("Error editing rack name:", error);
        toast({ title: "랙 이름 수정 실패", description: "랙 이름을 수정하는 중 오류가 발생했습니다.", variant: "destructive" });
    }
};


  // 랙 수정 시작 핸들러
  const startEditRack = (rack: RackComponentProps['rack']) => { // 타입 명시
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

  // 폼 초기화 (이름 변경)
  const localResetForm = () => { // resetForm을 localResetForm으로 변경
    setFormName("")
    setFormLine("A")
  }

  // 랙 이동 핸들러 (DND)
  const handleRackDrop = async (rackId: string, targetLine: string) => { // 타입 명시
    if (!hasPermission("racks", "edit")) return

    try {
      await storageUpdateRack(rackId, { line: targetLine })
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
  const handleSelectLine = (line: string, checked: boolean) => { // 타입 명시
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
    setSelectAll(newSelectedRacks.size === filteredRacks.length && filteredRacks.length > 0); // 전체 선택 상태 업데이트
  }


  // 일괄 수정 핸들러
  const handleBulkMoveRacks = async () => {
    if (selectedRacks.size === 0 || !hasPermission("racks", "edit")) return;

    const updates = Array.from(selectedRacks).map(rackId =>
        storageUpdateRack(rackId, { line: bulkTargetLine })
    );

    try {
        await Promise.all(updates);
        toast({ title: "일괄 이동 완료", description: `${selectedRacks.size}개의 랙이 ${bulkTargetLine} 라인으로 이동되었습니다.` });
        setSelectedRacks(new Set()); // 선택 해제
        setSelectAll(false); // 전체 선택 해제
        setIsBulkEditDialogOpen(false);
    } catch (error) {
        console.error("Error bulk moving racks:", error);
        toast({ title: "일괄 이동 실패", description: "랙을 이동하는 중 오류가 발생했습니다.", variant: "destructive" });
    }
};

  if (isLoading) {
    return <RackViewSkeleton />
  }
// 중략... (나머지 UI 코드 동일)
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
          <div className="flex overflow-x-auto pb-4 space-x-4"> {/* 가로 스크롤 및 간격 추가 */}
            {Object.entries(racksByLine).sort(([lineA], [lineB]) => lineA.localeCompare(lineB)).map(([line, racksInLine]) => (
                <LineDropZone
                    key={line}
                    line={line}
                    className="min-w-[150px]" // 각 라인 최소 너비 설정
                    onRackDrop={handleRackDrop}
                    filteredRacks={filteredRacks}
                    selectedRacks={selectedRacks}
                    onSelectLine={handleSelectLine}
                >
                    {racksInLine.length > 0 ? racksInLine.map((rack) => (
                    <RackComponent
                        key={rack.id}
                        rack={rack}
                        onRackClick={handleRackClick}
                        onProductDrop={handleProductDrop}
                        isSelected={selectedRacks.has(rack.id)}
                        onSelectChange={handleSelectRack}
                        onCopyRack={handleCopyRack}
                    />
                    )) : (
                        <div className="p-3 rounded-lg border-2 w-28 h-28 flex flex-col items-center justify-center bg-gray-100 border-gray-200">
                        <p className="text-xs text-gray-500">비어 있음</p>
                        </div>
                    )}
                </LineDropZone>
            ))}
            {Object.keys(racksByLine).length === 0 && (
                 <div className="flex items-center justify-center w-full h-40 text-muted-foreground">
                    표시할 랙이 없습니다.
                 </div>
            )}
          </div>
        </div>


        {/* 엑셀 미리보기 다이얼로그 */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>엑셀 일괄 업로드 미리보기</DialogTitle>
              <DialogDescription>
                아래는 업로드될 데이터의 미리보기입니다. 오류가 있다면 수정 후 다시 시도해주세요.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
               {selectedFileName && (
                 <p className="text-sm text-muted-foreground">선택된 파일: {selectedFileName}</p>
               )}
              {uploadErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 max-h-40 overflow-y-auto">
                  <h3 className="text-red-600 font-medium mb-2">오류 발생 ({uploadErrors.length}개)</h3>
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
                  <p className="text-sm font-medium mb-2">유효한 데이터 미리보기 ({validRowCount}개 항목):</p>
                  <ScrollArea className="h-[200px] border rounded-md">
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
                        {previewData.slice(0, 10).map((row, index) => ( // 최대 10개 항목 미리보기
                          <TableRow key={index}>
                            <TableCell>{row.라인}</TableCell>
                            <TableCell>{row.랙이름}</TableCell>
                            <TableCell>{row.품목코드}</TableCell>
                            <TableCell>{row.층 || 1}</TableCell>
                          </TableRow>
                        ))}
                        {previewData.length > 10 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              ... 외 {previewData.length - 10}개 항목 더 보기
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}
               {previewData.length === 0 && uploadErrors.length === 0 && (
                    <p className="text-sm text-muted-foreground">업로드할 유효한 데이터가 없습니다.</p>
                )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {setIsPreviewDialogOpen(false); if(fileInputRef.current) fileInputRef.current.value = ""; setSelectedFileName("")}}>
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
                      {hasPermission("racks", "edit") && selectedRack && ( // selectedRack null 체크 추가
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
                              const productDetails = productCodes.find((p) => p.code === product.code) || { name: '', description: '', category: '' }; // 기본값 설정

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
              <Button variant="outline" onClick={() => {setIsAddDialogOpen(false); localResetForm();}}>
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
        <Dialog open={isExcelUploadDialogOpen && uploadResult.errors.length > 0} onOpenChange={setIsExcelUploadDialogOpen}>
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
                <div className="bg-red-50 border border-red-200 rounded-md p-4 max-h-60 overflow-y-auto">
                  <h3 className="text-red-600 font-medium mb-2">오류 발생 ({uploadResult.errors.length}개)</h3>
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
              <Button onClick={() => {
                setIsExcelUploadDialogOpen(false);
                setUploadResult({ success: 0, errors: [] }); // 결과 초기화
                if(fileInputRef.current) fileInputRef.current.value = ""; // 파일 입력 초기화
                setSelectedFileName(""); // 파일 이름 초기화
              }}>확인</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  )
}
