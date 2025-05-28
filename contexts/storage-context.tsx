"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'; // useCallback 추가
import {
  // ... (기존 임포트 유지)
  fetchProducts, fetchRacks, fetchCategories, fetchUsers, fetchProductCodes,
  addProduct as apiAddProduct, updateProduct as apiUpdateProduct, deleteProduct as apiDeleteProduct,
  addRack as apiAddRack, updateRack as apiUpdateRack, deleteRack as apiDeleteRack,
  addCategory as apiAddCategory, updateCategory as apiUpdateCategory, deleteCategory as apiDeleteCategory,
  addUser as apiAddUser, updateUser as apiUpdateUser, deleteUser as apiDeleteUser,
  addProductCode as apiAddProductCode, updateProductCode as apiUpdateProductCode, deleteProductCode as apiDeleteProductCode
} from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

// Types (기존 정의 유지)
export interface Product {
  id: string
  code: string
  inbound_at: string
  outbound_at: string | null
  weight: number
  manufacturer: string
  floor?: number
}
// ... (Rack, ProductCode, Category, User, StockMovement 인터페이스 정의 유지) ...
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
  category: string 
  storage_temp: number 
  created_at: string 
  updated_at: string 
}

export interface Category {
  id: string
  name: string
  created_at: string
}

export interface User { 
  id: string; 
  email: string; 
  name: string; 
  role: string; 
  password?: string 
  status: "active" | "inactive" 
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
  // ... (기존 타입 유지)
  products: Product[]
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product | undefined>
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>

  racks: Rack[]
  addRack: (rack: Omit<Rack, 'id'>) => Promise<Rack | undefined>
  updateRack: (id: string, updates: Partial<Rack>) => Promise<void>
  deleteRack: (id: string) => Promise<void>

  productCodes: ProductCode[]
  setProductCodes: React.Dispatch<React.SetStateAction<ProductCode[]>>
  addProductCode: (productCode: Omit<ProductCode, 'id'>) => Promise<ProductCode | undefined>
  updateProductCode: (id: string, updates: Partial<ProductCode>) => Promise<void>
  deleteProductCode: (id: string) => Promise<void>

  categories: Category[]
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>
  addCategory: (category: Omit<Category, 'id'>) => Promise<Category | undefined>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>
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

// 디바운스 함수
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
    if ('inbound_at' in product) dbProduct.inbound_at = product.inbound_at;
    if ('outbound_at' in product) dbProduct.outbound_at = product.outbound_at;
    return dbProduct;
  };

  const refreshData = useCallback(async () => { // useCallback으로 감싸기
    console.log("StorageContext: refreshData called");
    setIsLoadingState(true);
    try {
      const [productsDataDb, racksDataDb, categoriesDataDb, usersDataDb, productCodesDataDb, activityLogsDataDb] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('racks').select('*, rack_products(product_id, floor, inbound_date, outbound_date)'),
        supabase.from('categories').select('*'),
        supabase.from('users').select('*'),
        supabase.from('product_codes').select('*'),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

      // 에러 처리 강화
      const errors = [
        productsDataDb.error, 
        racksDataDb.error, 
        categoriesDataDb.error, 
        usersDataDb.error, 
        productCodesDataDb.error, 
        activityLogsDataDb.error
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
        category: pc.category_id, 
        storage_temp: -18, 
        created_at: pc.created_at,
        updated_at: pc.updated_at,
      })) as ProductCode[]);

      setStockMovementsState((activityLogsDataDb.data || []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        product_id: log.product_id || 'N/A', 
        rack_id: log.rack_id, 
        type: log.action, 
        quantity: parseInt(log.action.match(/\d+/)?.[0] || "0"), 
        moved_at: log.created_at,
        details: log.action,
      })) as StockMovement[]);

      setLastRefreshState(Date.now());
      console.log("StorageContext: refreshData successful");
    } catch (error) {
      console.error('StorageContext: Error refreshing data:', error);
    } finally {
      setIsLoadingState(false);
      console.log("StorageContext: refreshData finished, isLoading:", false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 의존성 배열을 비워서 mount 시에만 생성되도록 함 (내부에서 사용하는 상태는 setState로 관리)

  // 실시간 변경 감지 시 디바운스된 refreshData 호출
  const debouncedRefreshData = useCallback(debounce(refreshData, 1000), [refreshData]); // 1초 디바운스

  useEffect(() => {
    // 초기 데이터 로드 (StorageProvider가 마운트될 때 한 번만)
    refreshData();

    const changes = supabase
      .channel('public-schema-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('StorageContext: DB Change received!', payload);
        debouncedRefreshData(); // 디바운스된 함수 호출
      })
      .subscribe();

    return () => {
      supabase.removeChannel(changes);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedRefreshData]); // refreshData는 useCallback으로 감싸져 있으므로, debouncedRefreshData도 안정적


  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now - lastRefresh >= 5 * 60 * 1000) { // 5분
        console.log("StorageContext: Interval refresh triggered");
        refreshData();
      }
    }, 60 * 1000); // 1분마다 체크

    return () => clearInterval(intervalId);
  }, [lastRefresh, refreshData]); // refreshData 의존성 추가

  // ... (기존 CRUD 함수들은 그대로 유지)
  // Products
  const addProductToStorage = async (product: Omit<Product, 'id'>): Promise<Product | undefined> => {
    try {
      const dbProduct = mapProductToDb(product);
      const result = await apiAddProduct(dbProduct as Omit<Product, 'id'>);
      if (result && result.length > 0) {
        const newProduct = mapProductFromDb(result[0]);
        // setProductsState(prev => [...prev, newProduct]); // 실시간 업데이트가 refreshData를 호출하므로 중복될 수 있음
        // refreshData(); // 또는 여기서 직접 호출
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
      // refreshData(); 
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
        return result[0]; 
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
      const dbProductCode = {
        ...productCode,
        category_id: productCode.category, 
      };

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
      const result = await apiAddUser(user); // 실제 API 호출 시 password는 제외하거나 해싱 처리 필요
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
      await apiUpdateUser(id, updates); // 실제 API 호출 시 password는 제외하거나 해싱 처리 필요
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
      setProductCodes: setProductCodesState, 
      addProductCode: addProductCodeToStorage,
      updateProductCode: updateProductCodeInStorage,
      deleteProductCode: deleteProductCodeFromStorage,

      categories,
      setCategories: setCategoriesState, 
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
      refreshData // useCallback으로 감싸진 함수 전달
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
