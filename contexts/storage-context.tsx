"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  inbound_at: string
  outbound_at: string | null
  weight: number
  manufacturer: string
  floor?: number
}

export interface Rack {
  id: string
  name: string
  products: Product[] // 이 products 배열은 클라이언트 상태용이며, racks DB 테이블의 컬럼이 아님
  capacity: number
  line: string
}

export interface ProductCode { // DB의 product_codes 테이블과 일치하도록
  id: string          // uuid
  code: string        // text, unique
  name: string        // text
  description: string // text
  category: string    // 클라이언트 측에서는 category_id를 이 필드에 담아서 사용 (string 또는 Category['id'] 타입)
  storage_temp: number// numeric (예시, 실제 DB 컬럼에 따라 조정)
  created_at: string  // timestamptz
  updated_at: string  // timestamptz
  // category_id?: string // DB에는 이게 있고, 클라이언트 ProductCode에는 category로 통일 (선택적)
}

export interface Category {
  id: string
  name: string
  created_at: string
}

export interface User { // DB의 users 테이블 스키마와 일치
  id: string;
  email: string;
  name: string;
  role: string;
  password?: string // 로컬 전용, DB 저장 안 함
  status: "active" | "inactive" // 애플리케이션 레벨에서 관리 (DB 스키마에 없다면)
  permissions: { page: string; view: boolean; edit: boolean }[]
}

export interface StockMovement {
  id: string;
  user_id: string;
  product_id: string;
  rack_id?: string;
  type: "IN" | "OUT" | "MOVE" | string;
  quantity: number;
  moved_at: string;
  details?: string;
}

interface StorageContextType {
  products: Product[]
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product | undefined>
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>

  racks: Rack[]
  addRack: (rack: Omit<Rack, 'id' | 'products'>) => Promise<Rack | undefined> // products는 DB에 직접 저장 안 함
  updateRack: (id: string, updates: Partial<Omit<Rack, 'products'>>) => Promise<void> // products는 별도 관리
  deleteRack: (id: string) => Promise<void>

  productCodes: ProductCode[]
  setProductCodes: React.Dispatch<React.SetStateAction<ProductCode[]>>
  addProductCode: (productCode: Omit<ProductCode, 'id' | 'created_at' | 'updated_at'>) => Promise<ProductCode | undefined>
  updateProductCode: (id: string, updates: Partial<Omit<ProductCode, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>
  deleteProductCode: (id: string) => Promise<void>

  categories: Category[]
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>
  addCategory: (category: Omit<Category, 'id' | 'created_at'>) => Promise<Category | undefined>
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id' | 'created_at'>>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>

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

function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
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
    return dbProduct;
  };

  const refreshData = useCallback(async () => {
    console.log("StorageContext: refreshData called");
    setIsLoadingState(true);
    try {
      const [
        productsDataDb, 
        racksDataDb, 
        categoriesDataDb, 
        usersDataDb, 
        productCodesDataDb, 
        activityLogsDataDb
      ] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('racks').select('*, rack_products(product_id, floor, inbound_date, outbound_date)'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('users').select('*').order('name'),
        supabase.from('product_codes').select('*, category_id').order('code'), // category_id를 명시적으로 가져옴
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

      const errors = [
        productsDataDb.error, racksDataDb.error, categoriesDataDb.error, 
        usersDataDb.error, productCodesDataDb.error, activityLogsDataDb.error
      ].filter(Boolean);

      if (errors.length > 0) {
        errors.forEach(error => console.error('Error fetching data part:', error));
        throw new Error(`Failed to fetch some data parts: ${errors.map(e => e?.message).join(', ')}`);
      }
      
      setProductsState((productsDataDb.data?.map(mapProductFromDb) || []) as Product[]);

      const mappedRacks = (racksDataDb.data || []).map(rack => {
        const rackProducts = (rack.rack_products || []).map((rp: any) => {
            const productDetail = productsDataDb.data?.find(p => p.id === rp.product_id);
            return {
                id: rp.product_id, 
                code: productDetail?.code || 'N/A', 
                inbound_at: rp.inbound_date, 
                outbound_at: rp.outbound_date, 
                weight: productDetail?.weight || 0, 
                manufacturer: productDetail?.manufacturer || 'N/A', 
                floor: rp.floor
            };
        });
        return {
            id: rack.id,
            name: rack.name,
            products: rackProducts as Product[],
            capacity: rack.capacity || 4,
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
        permissions: u.permissions || [],
        status: 'active', 
      })) as User[]);
      
      setProductCodesState((productCodesDataDb.data || []).map(pc => ({
        id: pc.id,
        code: pc.code,
        name: pc.name,
        description: pc.description,
        category: pc.category_id, // DB의 category_id를 사용
        storage_temp: pc.storage_temp || -18, // DB에 storage_temp가 있다면 사용, 없다면 기본값
        created_at: pc.created_at,
        updated_at: pc.updated_at,
      })) as ProductCode[]);

      setStockMovementsState((activityLogsDataDb.data || []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        product_id: log.product_id || 'N/A', 
        rack_id: log.rack_id, 
        type: log.action, 
        quantity: parseInt(log.details?.match(/\d+/)?.[0] || log.action?.match(/\d+/)?.[0] || "0"), // details 우선, 없으면 action에서 파싱
        moved_at: log.created_at,
        details: log.details || log.action,
      })) as StockMovement[]);

      setLastRefreshState(Date.now());
      console.log("StorageContext: refreshData successful");
    } catch (error) {
      console.error('StorageContext: Error refreshing data:', error);
    } finally {
      setIsLoadingState(false);
      console.log("StorageContext: refreshData finished, isLoading:", false);
    }
  }, []); // 의존성 배열 비워서 마운트 시에만 함수 정의

  const debouncedRefreshData = useCallback(debounce(refreshData, 1000), [refreshData]);

  useEffect(() => {
    refreshData(); // 초기 데이터 로드

    const changes = supabase
      .channel('public-schema-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('StorageContext: DB Change received!', payload);
        debouncedRefreshData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(changes);
    };
  }, [refreshData, debouncedRefreshData]); // refreshData와 debouncedRefreshData를 의존성 배열에 추가

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now - lastRefresh >= 5 * 60 * 1000) { // 5분
        console.log("StorageContext: Interval refresh triggered");
        refreshData();
      }
    }, 60 * 1000); 

    return () => clearInterval(intervalId);
  }, [lastRefresh, refreshData]);

  // Products
  const addProductToStorage = async (product: Omit<Product, 'id'>): Promise<Product | undefined> => {
    try {
      const dbProduct = mapProductToDb(product);
      const result = await apiAddProduct(dbProduct);
      if (result && result.length > 0) {
        const newProduct = mapProductFromDb(result[0]);
        // debouncedRefreshData(); // 실시간 구독이 처리하도록 유도
        return newProduct;
      }
      throw new Error('Failed to add product: No data returned');
    } catch (error) {
      console.error('Error adding product:', error);
      throw error; // 에러를 다시 throw하여 호출부에서 처리할 수 있도록 함
    }
  };

  const updateProductInStorage = async (id: string, updates: Partial<Product>) => {
    try {
      const dbUpdates = mapProductToDb(updates);
      await apiUpdateProduct(id, dbUpdates);
      // debouncedRefreshData();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProductFromStorage = async (id: string) => {
    try {
      await apiDeleteProduct(id);
      // debouncedRefreshData();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  // Racks
  const addRackToStorage = async (rack: Omit<Rack, 'id' | 'products'>): Promise<Rack | undefined> => {
    try {
      // apiAddRack은 이미 lib/api.ts에서 'products'를 제외한 객체를 받도록 수정됨
      const result = await apiAddRack(rack);
      if (result && result.length > 0) {
        // debouncedRefreshData();
        return {...result[0], products: []}; // 클라이언트 타입에 맞게 products: [] 추가
      }
      throw new Error('Failed to add rack: No data returned');
    } catch (error) {
      console.error('Error adding rack:', error);
      throw error;
    }
  };

  const updateRackInStorage = async (id: string, updates: Partial<Omit<Rack, 'products'>>) => {
    try {
      await apiUpdateRack(id, updates);
      // debouncedRefreshData();
    } catch (error) {
      console.error('Error updating rack:', error);
      throw error;
    }
  };

  const deleteRackFromStorage = async (id: string) => {
    try {
      await apiDeleteRack(id);
      // debouncedRefreshData();
    } catch (error) {
      console.error('Error deleting rack:', error);
      throw error;
    }
  };

  // Product Codes
  const addProductCodeToStorage = async (productCode: Omit<ProductCode, 'id' | 'created_at' | 'updated_at'>): Promise<ProductCode | undefined> => {
    try {
      const { category, ...restOfProductCode } = productCode;
      const dbProductCodePayload = {
        ...restOfProductCode,
        category_id: category, // 'category' (ID)를 'category_id'로 매핑
      };
      
      const result = await apiAddProductCode(dbProductCodePayload as any); // apiAddProductCode는 category_id를 가진 객체를 기대
      if (result && result.length > 0) {
        const newDbData = result[0] as any;
        // debouncedRefreshData();
        return { // 클라이언트 ProductCode 타입으로 다시 매핑
            ...newDbData,
            category: newDbData.category_id 
        };
      }
      throw new Error('Failed to add product code: No data returned');
    } catch (error) {
      console.error('Error adding product code:', error);
      throw error;
    }
  };

  const updateProductCodeInStorage = async (id: string, updates: Partial<Omit<ProductCode, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { category, ...restOfUpdates } = updates;
      const dbUpdatesPayload: Partial<any> = { ...restOfUpdates };

      if (category !== undefined) {
        dbUpdatesPayload.category_id = category;
      }
      
      await apiUpdateProductCode(id, dbUpdatesPayload as any);
      // debouncedRefreshData();
    } catch (error) {
      console.error('Error updating product code:', error);
      throw error;
    }
  };

  const deleteProductCodeFromStorage = async (id: string) => {
    try {
      await apiDeleteProductCode(id);
      // debouncedRefreshData();
    } catch (error) {
      console.error('Error deleting product code:', error);
      throw error;
    }
  };

  // Categories
  const addCategoryToStorage = async (category: Omit<Category, 'id' | 'created_at'>): Promise<Category | undefined> => {
    try {
      const result = await apiAddCategory(category);
      if (result && result.length > 0) {
        // debouncedRefreshData();
        return result[0];
      }
       throw new Error('Failed to add category: No data returned');
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  };

  const updateCategoryInStorage = async (id: string, updates: Partial<Omit<Category, 'id' | 'created_at'>>) => {
    try {
      await apiUpdateCategory(id, updates);
      // debouncedRefreshData();
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategoryFromStorage = async (id: string) => {
    try {
      await apiDeleteCategory(id);
      // debouncedRefreshData();
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  // Users
  const addUserToStorage = async (user: Omit<User, 'id'>): Promise<User | undefined> => {
    try {
      // DB에 저장 시 password는 해싱하거나 auth.users 테이블을 사용해야 함.
      // 현재 users 테이블에 직접 저장하는 방식은 보안상 문제가 될 수 있으므로,
      // 실제 API 호출 시 password는 제외하거나 별도 처리 필요.
      const { password, ...userToInsert } = user;
      const result = await apiAddUser(userToInsert as Omit<User, 'id' | 'password'>);
       if (result && result.length > 0) {
        // debouncedRefreshData();
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
      const { password, ...updatesForDb } = updates;
      await apiUpdateUser(id, updatesForDb);
      // debouncedRefreshData();
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const deleteUserFromStorage = async (id: string) => {
    try {
      await apiDeleteUser(id);
      // debouncedRefreshData();
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  return (
    <StorageContext.Provider value={{
      products, addProduct: addProductToStorage, updateProduct: updateProductInStorage, deleteProduct: deleteProductFromStorage,
      racks, addRack: addRackToStorage, updateRack: updateRackInStorage, deleteRack: deleteRackFromStorage,
      productCodes, setProductCodes: setProductCodesState, addProductCode: addProductCodeToStorage, updateProductCode: updateProductCodeInStorage, deleteProductCode: deleteProductCodeFromStorage,
      categories, setCategories: setCategoriesState, addCategory: addCategoryToStorage, updateCategory: updateCategoryInStorage, deleteCategory: deleteCategoryFromStorage,
      users, addUser: addUserToStorage, updateUser: updateUserInStorage, deleteUser: deleteUserFromStorage,
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
