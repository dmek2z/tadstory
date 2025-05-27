import { supabase } from './supabaseClient';
import type { Product, Rack, Category, ProductCode, User } from '@/contexts/storage-context';

// Error handling utility
const handleError = (error: any, operation: string) => {
  console.error(`Error during ${operation}:`, error);
  throw new Error(`Failed to ${operation}: ${error.message}`);
};

// 제품 전체 조회
export async function fetchProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('inboundDate', { ascending: false });

    if (error) throw error;
    return (data || []) as Product[];
  } catch (error) {
    handleError(error, 'fetch products');
    return [];
  }
}

// 제품 추가
export async function addProduct(product: Omit<Product, 'id'>) {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select();

    if (error) throw error;
    return (data || []) as Product[];
  } catch (error) {
    handleError(error, 'add product');
    return [];
  }
}

// 제품 수정
export async function updateProduct(id: string, updates: Partial<Product>) {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as Product[];
  } catch (error) {
    handleError(error, 'update product');
    return [];
  }
}

// 제품 삭제
export async function deleteProduct(id: string) {
  try {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as Product[];
  } catch (error) {
    handleError(error, 'delete product');
    return [];
  }
}

// 랙 전체 조회
export async function fetchRacks() {
  try {
    const { data, error } = await supabase
      .from('racks')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []) as Rack[];
  } catch (error) {
    handleError(error, 'fetch racks');
    return [];
  }
}

// 랙 추가
export async function addRack(rack: Omit<Rack, 'id'>) {
  try {
    const { data, error } = await supabase
      .from('racks')
      .insert([rack])
      .select();

    if (error) throw error;
    return (data || []) as Rack[];
  } catch (error) {
    handleError(error, 'add rack');
    return [];
  }
}

// 랙 수정
export async function updateRack(id: string, updates: Partial<Rack>) {
  try {
    const { data, error } = await supabase
      .from('racks')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as Rack[];
  } catch (error) {
    handleError(error, 'update rack');
    return [];
  }
}

// 랙 삭제
export async function deleteRack(id: string) {
  try {
    const { data, error } = await supabase
      .from('racks')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as Rack[];
  } catch (error) {
    handleError(error, 'delete rack');
    return [];
  }
}

// 카테고리 전체 조회
export async function fetchCategories() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []) as Category[];
  } catch (error) {
    handleError(error, 'fetch categories');
    return [];
  }
}

// 카테고리 추가
export async function addCategory(category: Omit<Category, 'id'>) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([category])
      .select();

    if (error) throw error;
    return (data || []) as Category[];
  } catch (error) {
    handleError(error, 'add category');
    return [];
  }
}

// 카테고리 수정
export async function updateCategory(id: string, updates: Partial<Category>) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as Category[];
  } catch (error) {
    handleError(error, 'update category');
    return [];
  }
}

// 카테고리 삭제
export async function deleteCategory(id: string) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as Category[];
  } catch (error) {
    handleError(error, 'delete category');
    return [];
  }
}

// 사용자 전체 조회
export async function fetchUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []) as User[];
  } catch (error) {
    handleError(error, 'fetch users');
    return [];
  }
}

// 사용자 추가
export async function addUser(user: Omit<User, 'id'>) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select();

    if (error) throw error;
    return (data || []) as User[];
  } catch (error) {
    handleError(error, 'add user');
    return [];
  }
}

// 사용자 수정
export async function updateUser(id: string, updates: Partial<User>) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as User[];
  } catch (error) {
    handleError(error, 'update user');
    return [];
  }
}

// 사용자 삭제
export async function deleteUser(id: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as User[];
  } catch (error) {
    handleError(error, 'delete user');
    return [];
  }
}

// 품목 코드 전체 조회
export async function fetchProductCodes() {
  try {
    const { data, error } = await supabase
      .from('product_codes')
      .select('*')
      .order('code');

    if (error) throw error;
    return (data || []) as ProductCode[];
  } catch (error) {
    handleError(error, 'fetch product codes');
    return [];
  }
}

// 품목 코드 추가
export async function addProductCode(productCode: Omit<ProductCode, 'id'>) {
  try {
    const { data, error } = await supabase
      .from('product_codes')
      .insert([productCode])
      .select();

    if (error) throw error;
    return (data || []) as ProductCode[];
  } catch (error) {
    handleError(error, 'add product code');
    return [];
  }
}

// 품목 코드 수정
export async function updateProductCode(id: string, updates: Partial<ProductCode>) {
  try {
    const { data, error } = await supabase
      .from('product_codes')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as ProductCode[];
  } catch (error) {
    handleError(error, 'update product code');
    return [];
  }
}

// 품목 코드 삭제
export async function deleteProductCode(id: string) {
  try {
    const { data, error } = await supabase
      .from('product_codes')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as ProductCode[];
  } catch (error) {
    handleError(error, 'delete product code');
    return [];
  }
} 