"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  fetchProducts, fetchRacks, fetchCategories, fetchUsers, fetchProductCodes,
  addProduct, updateProduct, deleteProduct,
  addRack, updateRack, deleteRack,
  addCategory, updateCategory, deleteCategory,
  addUser, updateUser, deleteUser,
  addProductCode, updateProductCode, deleteProductCode
} from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

// Types
export interface Product {
  id: string
  code: string
  inboundDate: string
  outboundDate: string | null
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
  category: string
  storageTemp: number
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  createdAt: string
}

export interface User {
  id: string
  userId: string
  name: string
  password?: string
  status: "active" | "inactive"
  permissions: { page: string; view: boolean; edit: boolean }[]
}

export interface StockMovement {
  id: string;
  product_id: string;
  type: "IN" | "OUT";
  quantity: number;
  moved_at: string;
  rack_id?: string;
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
  addProductCode: (productCode: Omit<ProductCode, 'id'>) => Promise<ProductCode | undefined>
  updateProductCode: (id: string, updates: Partial<ProductCode>) => Promise<void>
  deleteProductCode: (id: string) => Promise<void>

  // Categories
  categories: Category[]
  addCategory: (category: Omit<Category, 'id'>) => Promise<Category | undefined>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>

  // Users
  users: User[]
  addUser: (user: Omit<User, 'id'>) => Promise<User | undefined>
  updateUser: (id: string, updates: Partial<User>) => Promise<void>
  deleteUser: (id: string) => Promise<void>

  // New additions for stock movements and last updated
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
  const [products, setProducts] = useState<Product[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const refreshData = async () => {
    try {
      setIsLoading(true);
      const [productsData, racksData, categoriesData, usersData, productCodesData, stockMovementsData] = await Promise.all([
        fetchProducts(),
        fetchRacks(),
        fetchCategories(),
        fetchUsers(),
        fetchProductCodes(),
        Promise.resolve([])
      ]);

      setProducts(productsData || []);
      setRacks(racksData || []);
      setCategories(categoriesData || []);
      setUsers(usersData || []);
      setProductCodes(productCodesData || []);
      setStockMovements(stockMovementsData || []);
      setLastRefresh(Date.now());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    refreshData();

    // Set up realtime subscriptions
    const productsSubscription = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        refreshData();
      })
      .subscribe();

    const racksSubscription = supabase
      .channel('racks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'racks' }, () => {
        refreshData();
      })
      .subscribe();

    const categoriesSubscription = supabase
      .channel('categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        refreshData();
      })
      .subscribe();

    const usersSubscription = supabase
      .channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        refreshData();
      })
      .subscribe();

    const productCodesSubscription = supabase
      .channel('product-codes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_codes' }, () => {
        refreshData();
      })
      .subscribe();

    // Cleanup subscriptions
    return () => {
      productsSubscription.unsubscribe();
      racksSubscription.unsubscribe();
      categoriesSubscription.unsubscribe();
      usersSubscription.unsubscribe();
      productCodesSubscription.unsubscribe();
    };
  }, []);

  // 주기적인 데이터 갱신 (5분마다)
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now - lastRefresh >= 5 * 60 * 1000) { // 5분
        refreshData();
      }
    }, 60 * 1000); // 1분마다 체크

    return () => clearInterval(intervalId);
  }, [lastRefresh]);

  // Products
  const addProductToStorage = async (product: Omit<Product, 'id'>) => {
    try {
      const newProduct = await addProduct(product);
      if (newProduct && newProduct[0]) {
        setProducts(prev => [...prev, newProduct[0]]);
        return newProduct[0];
      }
      throw new Error('Failed to add product');
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateProductInStorage = async (id: string, updates: Partial<Product>) => {
    try {
      await updateProduct(id, updates);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProductFromStorage = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  // Racks
  const addRackToStorage = async (rack: Omit<Rack, 'id'>) => {
    try {
      const newRack = await addRack(rack);
      if (newRack && newRack[0]) {
        setRacks(prev => [...prev, newRack[0]]);
        return newRack[0];
      }
      throw new Error('Failed to add rack');
    } catch (error) {
      console.error('Error adding rack:', error);
      throw error;
    }
  };

  const updateRackInStorage = async (id: string, updates: Partial<Rack>) => {
    try {
      await updateRack(id, updates);
      setRacks(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    } catch (error) {
      console.error('Error updating rack:', error);
      throw error;
    }
  };

  const deleteRackFromStorage = async (id: string) => {
    try {
      await deleteRack(id);
      setRacks(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting rack:', error);
      throw error;
    }
  };

  // Product Codes
  const addProductCodeToStorage = async (productCode: Omit<ProductCode, 'id'>) => {
    try {
      const newProductCode = await addProductCode(productCode);
      if (newProductCode && newProductCode[0]) {
        setProductCodes(prev => [...prev, newProductCode[0]]);
        return newProductCode[0];
      }
      throw new Error('Failed to add product code');
    } catch (error) {
      console.error('Error adding product code:', error);
      throw error;
    }
  };

  const updateProductCodeInStorage = async (id: string, updates: Partial<ProductCode>) => {
    try {
      await updateProductCode(id, updates);
      setProductCodes(prev => prev.map(pc => pc.id === id ? { ...pc, ...updates } : pc));
    } catch (error) {
      console.error('Error updating product code:', error);
      throw error;
    }
  };

  const deleteProductCodeFromStorage = async (id: string) => {
    try {
      await deleteProductCode(id);
      setProductCodes(prev => prev.filter(pc => pc.id !== id));
    } catch (error) {
      console.error('Error deleting product code:', error);
      throw error;
    }
  };

  // Categories
  const addCategoryToStorage = async (category: Omit<Category, 'id'>) => {
    try {
      const newCategory = await addCategory(category);
      if (newCategory && newCategory[0]) {
        setCategories(prev => [...prev, newCategory[0]]);
        return newCategory[0];
      }
      throw new Error('Failed to add category');
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  };

  const updateCategoryInStorage = async (id: string, updates: Partial<Category>) => {
    try {
      await updateCategory(id, updates);
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategoryFromStorage = async (id: string) => {
    try {
      await deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  // Users
  const addUserToStorage = async (user: Omit<User, 'id'>) => {
    try {
      const newUser = await addUser(user);
      if (newUser && newUser[0]) {
        setUsers(prev => [...prev, newUser[0]]);
        return newUser[0];
      }
      throw new Error('Failed to add user');
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  };

  const updateUserInStorage = async (id: string, updates: Partial<User>) => {
    try {
      await updateUser(id, updates);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const deleteUserFromStorage = async (id: string) => {
    try {
      await deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  return (
    <StorageContext.Provider value={{ 
      // Products
      products,
      addProduct: addProductToStorage,
      updateProduct: updateProductInStorage,
      deleteProduct: deleteProductFromStorage,

      // Racks
      racks,
      addRack: addRackToStorage,
      updateRack: updateRackInStorage,
      deleteRack: deleteRackFromStorage,

      // Product Codes
      productCodes,
      addProductCode: addProductCodeToStorage,
      updateProductCode: updateProductCodeInStorage,
      deleteProductCode: deleteProductCodeFromStorage,

      // Categories
      categories,
      addCategory: addCategoryToStorage,
      updateCategory: updateCategoryInStorage,
      deleteCategory: deleteCategoryFromStorage,

      // Users
      users,
      addUser: addUserToStorage,
      updateUser: updateUserInStorage,
      deleteUser: deleteUserFromStorage,

      // New additions for stock movements and last updated
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
