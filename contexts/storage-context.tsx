"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  fetchProducts, fetchRacks, fetchCategories, fetchUsers, fetchProductCodes,
  addProduct as apiAddProduct, updateProduct as apiUpdateProduct, deleteProduct as apiDeleteProduct,
  addRack as apiAddRack, updateRack as apiUpdateRack, deleteRack as apiDeleteRack,
  addCategory as apiAddCategory, updateCategory as apiUpdateCategory, deleteCategory as apiDeleteCategory,
  addUser as apiAddUser, updateUser as apiUpdateUser, deleteUser as apiDeleteUser,
  addProductCode as apiAddProductCode, updateProductCode as apiUpdateProductCode, deleteProductCode as apiDeleteProductCode
} from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

// Types
export interface Product {
  id: string
  code: string
  inbound_at: string // 변경: inboundDate -> inbound_at
  outbound_at: string | null // 변경: outboundDate -> outbound_at
  weight: number
  manufacturer: string
  floor?: number
}

export interface Rack {
  id: string
  name: string
  products: Product[]
  capacity: number
  line: string
}

export interface ProductCode {
  id: string
  code: string
  name: string
  description: string
  category: string // 카테고리 ID 또는 이름 (데이터베이스 스키마에 따라 결정)
  storage_temp: number // 변경: storageTemp -> storage_temp (스키마 이미지 확인 필요, product_codes 테이블에 storage_temp_min, storage_temp_max는 있지만 storage_temp는 없음. products 테이블의 storage_temp와 혼동 주의)
                       // products 테이블의 storage_temp를 참조한다면 ProductCode에 있을 필요 없음.
                       // product_codes 테이블의 storage_temp_min, storage_temp_max를 사용한다면 그에 맞게 수정.
                       // 여기서는 일단 스키마 이미지의 products.storage_temp와 동일하게 맞춘다고 가정.
  created_at: string // 변경: createdAt -> created_at
  updated_at: string // 변경: updatedAt -> updated_at
}

export interface Category {
  id: string
  name: string
  created_at: string // 변경: createdAt -> created_at
}

export interface User { // users 테이블 스키마와 일치시킴
  id: string; // uuid, primary key
  // userId: string; // users 테이블에는 userId 컬럼이 없음. email이 ID 역할을 할 수 있음.
  email: string; // text
  name: string; // text
  role: string; // text
  password?: string // 로컬 전용, DB 저장 안함
  status: "active" | "inactive" // DB에는 status 컬럼이 없으므로, 로컬에서 관리하거나 DB에 추가 필요
  permissions: { page: string; view: boolean; edit: boolean }[] // jsonb
}


export interface StockMovement { // activity_logs 테이블을 참조한다고 가정
  id: string; // uuid
  user_id: string; // uuid (users.id 참조)
  product_id: string; // products.id 또는 product_codes.id 참조 (스키마에 따라 명확히 해야 함)
  rack_id?: string; // racks.id 참조 (선택적)
  type: "IN" | "OUT" | "MOVE" | string; // action 컬럼을 기반으로 (e.g., "입고", "출고", "이동")
  quantity: number; // DB 스키마에 quantity 컬럼이 없음. details에서 파싱하거나 추가 필요.
  moved_at: string; // created_at 컬럼 사용
  details?: string; // action 컬럼을 details로 사용할 수 있음
}

interface StorageContextType {
  // Products
  products: Product[]
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product | undefined>
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>

  // Racks
  racks: Rack[]
  addRack: (rack: Omit<Rack, 'id'>) => Promise<Rack | undefined>
  updateRack: (id: string, updates: Partial<Rack>) => Promise<void>
  deleteRack: (id: string) => Promise<void>

  // Product Codes
  productCodes: ProductCode[]
  setProductCodes: React.Dispatch<React.SetStateAction<ProductCode[]>> // 추가: ProductCodesPage에서 직접 상태를 업데이트하기 위함
  addProductCode: (productCode: Omit<ProductCode, 'id'>) => Promise<ProductCode | undefined>
  updateProductCode: (id: string, updates: Partial<ProductCode>) => Promise<void>
  deleteProductCode: (id: string) => Promise<void>

  // Categories
  categories: Category[]
  setCategories: React.Dispatch<React.SetStateAction<Category[]>> // 추가: ProductCodesPage에서 직접 상태를 업데이트하기 위함
  addCategory: (category: Omit<Category, 'id'>) => Promise<Category | undefined>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>

  // Users
  users: User[]
  addUser: (user: Omit<User, 'id'>) => Promise<User | undefined>
  updateUser: (id: string, updates: Partial<User>) => Promise<void>
  deleteUser: (id: string) => Promise<void>

  stockMovements: StockMovement[]
  lastUpdated: number

  isLoading: boolean
  refreshData: () => Promise<void>
}

const StorageContext = createContext<StorageContextType | undefined>(undefined)

interface StorageProviderProps {
  children: React.ReactNode
}

export function StorageProvider({ children }: StorageProviderProps) {
  const [products, setProductsState] = useState<Product[]>([]);
  const [racks, setRacksState] = useState<Rack[]>([]);
  const [categories, setCategoriesState] = useState<Category[]>([]);
  const [users, setUsersState] = useState<User[]>([]);
  const [productCodes, setProductCodesState] = useState<ProductCode[]>([]);
  const [stockMovements, setStockMovementsState] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoadingState] = useState(true);
  const [lastRefresh, setLastRefreshState] = useState<number>(Date.now());

  const mapProductFromDb = (dbProduct: any): Product => ({
    id: dbProduct.id,
    code: dbProduct.code,
    inbound_at: dbProduct.inbound_at,
    outbound_at: dbProduct.outbound_at,
    weight: dbProduct.weight,
    manufacturer: dbProduct.manufacturer,
    floor: dbProduct.floor,
  });

  const mapProductToDb = (product: Partial<Product> | Omit<Product, 'id'>): any => {
    const dbProduct: any = { ...product };
    if ('inbound_at' in product) dbProduct.inbound_at = product.inbound_at;
    if ('outbound_at' in product) dbProduct.outbound_at = product.outbound_at;
    // camelCase 필드가 있다면 여기서 snake_case로 변환
    return dbProduct;
  };


  const refreshData = async () => {
    try {
      setIsLoadingState(true);
      const [productsDataDb, racksDataDb, categoriesDataDb, usersDataDb, productCodesDataDb, activityLogsDataDb] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('racks').select('*, rack_products(product_id, floor, inbound_date, outbound_date)'), // rack_products를 통해 제품 정보 결합
        supabase.from('categories').select('*'),
        supabase.from('users').select('*'), // DB의 users 테이블에서 직접 가져옴
        supabase.from('product_codes').select('*'),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50) // 예시: 최근 50개 활동 로그
      ]);

      if (productsDataDb.error) throw productsDataDb.error;
      if (racksDataDb.error) throw racksDataDb.error;
      if (categoriesDataDb.error) throw categoriesDataDb.error;
      if (usersDataDb.error) throw usersDataDb.error;
      if (productCodesDataDb.error) throw productCodesDataDb.error;
      if (activityLogsDataDb.error) throw activityLogsDataDb.error;

      // products 테이블 직접 사용
      setProductsState((productsDataDb.data?.map(mapProductFromDb) || []) as Product[]);

      // racks 데이터와 rack_products 데이터를 조합하여 Product 타입에 맞게 매핑
       const mappedRacks = (racksDataDb.data || []).map(rack => {
        const rackProducts = (rack.rack_products || []).map((rp: any) => {
            // products 테이블에서 rp.product_id에 해당하는 상세 정보를 찾아야 함
            // 이 예제에서는 productsDataDb.data를 활용하여 찾아봄
            const productDetail = productsDataDb.data?.find(p => p.id === rp.product_id);
            return {
                id: rp.product_id, // rack_products의 product_id를 사용
                code: productDetail?.code || 'N/A', // products 테이블에서 가져온 code
                inbound_at: rp.inbound_date, // rack_products의 inbound_date 사용
                outbound_at: rp.outbound_date, // rack_products의 outbound_date 사용
                weight: productDetail?.weight || 0, // products 테이블에서 가져온 weight
                manufacturer: productDetail?.manufacturer || 'N/A', // products 테이블에서 가져온 manufacturer
                floor: rp.floor
            };
        });
        return {
            id: rack.id,
            name: rack.name,
            products: rackProducts as Product[], // 형변환
            capacity: rack.capacity || 4, // 기본값 또는 DB값
            line: rack.line,
        };
      });
      setRacksState(mappedRacks as Rack[]);


      setCategoriesState((categoriesDataDb.data || []).map(c => ({
        id: c.id,
        name: c.name,
        created_at: c.created_at,
      })) as Category[]);

      setUsersState((usersDataDb.data || []).map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        permissions: u.permissions || [], // DB에 jsonb로 저장된 permissions
        status: 'active', // DB에 status가 없다면 기본값 또는 다른 로직으로 처리
      })) as User[]);

      setProductCodesState((productCodesDataDb.data || []).map(pc => ({
        id: pc.id,
        code: pc.code,
        name: pc.name,
        description: pc.description,
        category: pc.category_id, // categories.id 참조
        storage_temp: -18, // 예시 값, 필요시 DB 값으로 대체
        created_at: pc.created_at,
        updated_at: pc.updated_at,
      })) as ProductCode[]);

      setStockMovementsState((activityLogsDataDb.data || []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        product_id: log.product_id || 'N/A', // activity_logs에 product_id가 없다면 수정 필요
        rack_id: log.rack_id, // activity_logs에 rack_id가 있다면 사용
        type: log.action, // DB의 action 컬럼을 사용
        quantity: parseInt(log.action.match(/\d+/)?.[0] || "0"), // action 문자열에서 숫자 파싱 (예: "품목 10개 입고됨")
        moved_at: log.created_at,
        details: log.action,
      })) as StockMovement[]);


      setLastRefreshState(Date.now());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoadingState(false);
    }
  };

  useEffect(() => {
    refreshData();

    const changes = supabase
      .channel('public-schema-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('Change received!', payload);
        refreshData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(changes);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now - lastRefresh >= 5 * 60 * 1000) { // 5분
        refreshData();
      }
    }, 60 * 1000); // 1분마다 체크

    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRefresh]);

  // Products
  const addProductToStorage = async (product: Omit<Product, 'id'>): Promise<Product | undefined> => {
    try {
      const dbProduct = mapProductToDb(product);
      const result = await apiAddProduct(dbProduct as Omit<Product, 'id'>); // apiAddProduct가 Product[]를 반환하므로 첫 번째 요소 사용
      if (result && result.length > 0) {
        const newProduct = mapProductFromDb(result[0]);
        setProductsState(prev => [...prev, newProduct]);
        return newProduct;
      }
      throw new Error('Failed to add product: No data returned');
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateProductInStorage = async (id: string, updates: Partial<Product>) => {
    try {
      const dbUpdates = mapProductToDb(updates);
      await apiUpdateProduct(id, dbUpdates as Partial<Product>);
      // refreshData(); // 상태를 직접 업데이트하는 대신 데이터 새로고침
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProductFromStorage = async (id: string) => {
    try {
      await apiDeleteProduct(id);
      // refreshData();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  // Racks
  const addRackToStorage = async (rack: Omit<Rack, 'id'>): Promise<Rack | undefined> => {
    try {
      const result = await apiAddRack(rack);
      if (result && result.length > 0) {
        // refreshData();
        return result[0]; // Supabase는 배열로 반환하므로
      }
      throw new Error('Failed to add rack: No data returned');
    } catch (error) {
      console.error('Error adding rack:', error);
      throw error;
    }
  };

  const updateRackInStorage = async (id: string, updates: Partial<Rack>) => {
    try {
      await apiUpdateRack(id, updates);
      // refreshData();
    } catch (error) {
      console.error('Error updating rack:', error);
      throw error;
    }
  };

  const deleteRackFromStorage = async (id: string) => {
    try {
      await apiDeleteRack(id);
      // refreshData();
    } catch (error) {
      console.error('Error deleting rack:', error);
      throw error;
    }
  };

  // Product Codes
  const addProductCodeToStorage = async (productCode: Omit<ProductCode, 'id'>): Promise<ProductCode | undefined> => {
    try {
      // DB 스키마에 맞게 category_id 등으로 변환 필요 시 여기서 처리
      const dbProductCode = {
        ...productCode,
        category_id: productCode.category, // category 필드가 category_id를 의미한다고 가정
      };
      // delete dbProductCode.category;

      const result = await apiAddProductCode(dbProductCode as Omit<ProductCode, 'id'>);
      if (result && result.length > 0) {
        // refreshData();
        return result[0];
      }
      throw new Error('Failed to add product code: No data returned');
    } catch (error) {
      console.error('Error adding product code:', error);
      throw error;
    }
  };

  const updateProductCodeInStorage = async (id: string, updates: Partial<ProductCode>) => {
    try {
      const dbUpdates: Partial<any> = { ...updates };
      if ('category' in updates) {
        dbUpdates.category_id = updates.category;
        delete dbUpdates.category;
      }
      await apiUpdateProductCode(id, dbUpdates as Partial<ProductCode>);
      // refreshData();
    } catch (error) {
      console.error('Error updating product code:', error);
      throw error;
    }
  };

  const deleteProductCodeFromStorage = async (id: string) => {
    try {
      await apiDeleteProductCode(id);
      // refreshData();
    } catch (error) {
      console.error('Error deleting product code:', error);
      throw error;
    }
  };

  // Categories
  const addCategoryToStorage = async (category: Omit<Category, 'id'>): Promise<Category | undefined> => {
    try {
      const result = await apiAddCategory(category);
      if (result && result.length > 0) {
        // refreshData();
        return result[0];
      }
       throw new Error('Failed to add category: No data returned');
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  };

  const updateCategoryInStorage = async (id: string, updates: Partial<Category>) => {
    try {
      await apiUpdateCategory(id, updates);
      // refreshData();
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategoryFromStorage = async (id: string) => {
    try {
      await apiDeleteCategory(id);
      // refreshData();
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  // Users
  const addUserToStorage = async (user: Omit<User, 'id'>): Promise<User | undefined> => {
    try {
      const result = await apiAddUser(user);
       if (result && result.length > 0) {
        // refreshData();
        return result[0];
      }
      throw new Error('Failed to add user: No data returned');
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  };

  const updateUserInStorage = async (id: string, updates: Partial<User>) => {
    try {
      await apiUpdateUser(id, updates);
      // refreshData();
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const deleteUserFromStorage = async (id: string) => {
    try {
      await apiDeleteUser(id);
      // refreshData();
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };


  return (
    <StorageContext.Provider value={{
      products,
      addProduct: addProductToStorage,
      updateProduct: updateProductInStorage,
      deleteProduct: deleteProductFromStorage,

      racks,
      addRack: addRackToStorage,
      updateRack: updateRackInStorage,
      deleteRack: deleteRackFromStorage,

      productCodes,
      setProductCodes: setProductCodesState, // 추가
      addProductCode: addProductCodeToStorage,
      updateProductCode: updateProductCodeInStorage,
      deleteProductCode: deleteProductCodeFromStorage,

      categories,
      setCategories: setCategoriesState, // 추가
      addCategory: addCategoryToStorage,
      updateCategory: updateCategoryInStorage,
      deleteCategory: deleteCategoryFromStorage,

      users,
      addUser: addUserToStorage,
      updateUser: updateUserInStorage,
      deleteUser: deleteUserFromStorage,

      stockMovements,
      lastUpdated: lastRefresh,

      isLoading,
      refreshData
    }}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage() {
  const context = useContext(StorageContext)
  if (context === undefined) {
    throw new Error("useStorage must be used within a StorageProvider")
  }
  return context
}
