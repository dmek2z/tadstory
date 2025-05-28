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
      .order('inbound_at', { ascending: false }); // 'inboundDate'를 'inbound_at'으로 변경

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
    // API로 전달되는 객체의 키가 DB 컬럼명과 일치해야 합니다.
    // Product 타입이 storage-context.tsx에서 snake_case로 변경되면, 이 부분은 자동으로 맞게 됩니다.
    const productDataForDb = {
      ...product,
      // 만약 Product 타입이 아직 camelCase라면 여기서 변환 필요
      // inbound_at: product.inboundDate,
      // outbound_at: product.outboundDate,
    };
    // delete productDataForDb.inboundDate; // 임시 속성 제거
    // delete productDataForDb.outboundDate; // 임시 속성 제거


    const { data, error } = await supabase
      .from('products')
      .insert([productDataForDb])
      .select();

    if (error) throw error;
    // 반환되는 데이터도 Product 타입에 맞게 조정될 필요가 있을 수 있습니다.
    // Supabase는 기본적으로 snake_case로 컬럼을 반환하므로, Product 타입과 일치해야 합니다.
    return (data || []) as Product[];
  } catch (error) {
    handleError(error, 'add product');
    return [];
  }
}

// 제품 수정
export async function updateProduct(id: string, updates: Partial<Product>) {
  try {
    // API로 전달되는 객체의 키가 DB 컬럼명과 일치해야 합니다.
    const updatesForDb: Partial<any> = { ...updates };
    if ('inbound_at' in updates) {
      updatesForDb.inbound_at = updates.inbound_at;
      // delete updatesForDb.inboundDate; // 만약 Product 타입이 아직 camelCase라면
    }
    if ('outbound_at' in updates) {
      updatesForDb.outbound_at = updates.outbound_at;
      // delete updatesForDb.outboundDate; // 만약 Product 타입이 아직 camelCase라면
    }

    const { data, error } = await supabase
      .from('products')
      .update(updatesForDb)
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
