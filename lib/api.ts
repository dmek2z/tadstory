import { supabase } from './supabaseClient';
import type { Product, Rack, Category, ProductCode, User } from '@/contexts/storage-context';

// Error handling utility
const handleError = (error: any, operation: string) => {
  console.error(`Error during ${operation}:`, error);
  // 실제 애플리케이션에서는 사용자에게 더 친화적인 에러 메시지를 보여주거나,
  // 에러 로깅 시스템으로 보내는 등의 처리를 할 수 있습니다.
  // throw new Error(`Failed to ${operation}: ${error.message}`); // 필요에 따라 주석 해제 또는 수정
  return []; // 에러 발생 시 빈 배열 또는 적절한 기본값 반환 고려
};

// 제품 전체 조회
export async function fetchProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('inbound_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Product[];
  } catch (error) {
    return handleError(error, 'fetch products') as Product[];
  }
}

// 제품 추가
export async function addProduct(product: Omit<Product, 'id'>) {
  try {
    const productDataForDb = {
      ...product,
    };
    const { data, error } = await supabase
      .from('products')
      .insert([productDataForDb])
      .select();

    if (error) throw error;
    return (data || []) as Product[];
  } catch (error) {
    return handleError(error, 'add product') as Product[];
  }
}

// 제품 수정
export async function updateProduct(id: string, updates: Partial<Product>) {
  try {
    const updatesForDb: Partial<any> = { ...updates };
    // DB 컬럼명과 일치하는지 확인 (이미 Product 타입이 snake_case라고 가정)
    const { data, error } = await supabase
      .from('products')
      .update(updatesForDb)
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as Product[];
  } catch (error) {
    return handleError(error, 'update product') as Product[];
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
    return handleError(error, 'delete product') as Product[];
  }
}

// 랙 전체 조회
export async function fetchRacks() {
  try {
    const { data, error } = await supabase
      .from('racks')
      .select('*') // '* , rack_products(*)' 와 같이 필요한 경우 관계 테이블도 함께 조회
      .order('name');

    if (error) throw error;
    return (data || []) as Rack[];
  } catch (error) {
    return handleError(error, 'fetch racks') as Rack[];
  }
}

// 랙 추가
export async function addRack(rack: Omit<Rack, 'id'>) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { products, ...rackDataForDb } = rack; // 'products' 필드를 분리하여 실제 DB 삽입 객체에서는 제외

    const { data, error } = await supabase
      .from('racks')
      .insert([rackDataForDb]) // 'products'가 제외된 객체 사용
      .select();

    if (error) throw error;
    // 새로 추가된 랙은 products가 비어있어야 정상입니다.
    // 반환된 데이터에 products 필드가 없으므로, 필요시 클라이언트에서 []로 채워줍니다.
    return (data?.map(r => ({...r, products: []})) || []) as Rack[];
  } catch (error) {
    return handleError(error, 'add rack') as Rack[];
  }
}

// 랙 수정
export async function updateRack(id: string, updates: Partial<Rack>) {
  try {
    // products 필드는 racks 테이블의 컬럼이 아니므로 업데이트 객체에서 제외해야 할 수 있음
    // 만약 products 업데이트가 rack_products 같은 중간 테이블을 통해 이루어진다면 별도 API 호출 필요
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { products, ...updatesForDb } = updates;

    const { data, error } = await supabase
      .from('racks')
      .update(updatesForDb)
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as Rack[];
  } catch (error) {
    return handleError(error, 'update rack') as Rack[];
  }
}

// 랙 삭제
export async function deleteRack(id: string) {
  try {
    // 관련 데이터(예: rack_products 테이블의 레코드) 삭제 로직이 필요할 수 있음
    const { data, error } = await supabase
      .from('racks')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as Rack[];
  } catch (error) {
    return handleError(error, 'delete rack') as Rack[];
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
    return handleError(error, 'fetch categories') as Category[];
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
    return handleError(error, 'add category') as Category[];
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
    return handleError(error, 'update category') as Category[];
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
    return handleError(error, 'delete category') as Category[];
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
    return handleError(error, 'fetch users') as User[];
  }
}

// 사용자 추가
export async function addUser(user: Omit<User, 'id'>) {
  try {
    // DB에 저장 시 password는 해싱하거나 auth.users 테이블을 사용해야 합니다.
    // 현재 users 테이블에 직접 저장하는 방식은 보안상 문제가 될 수 있습니다.
    // 여기서는 전달된 객체 그대로 저장한다고 가정합니다.
    const { password, ...userToInsert } = user; // 예시: password 필드 제외
    const { data, error } = await supabase
      .from('users')
      .insert([userToInsert]) // password가 제외된 userToInsert 사용
      .select();

    if (error) throw error;
    return (data || []) as User[];
  } catch (error) {
    return handleError(error, 'add user') as User[];
  }
}

// 사용자 수정
export async function updateUser(id: string, updates: Partial<User>) {
  try {
    const { password, ...updatesForDb } = updates; // 예시: password 필드 제외
    const { data, error } = await supabase
      .from('users')
      .update(updatesForDb)
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as User[];
  } catch (error) {
    return handleError(error, 'update user') as User[];
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
    return handleError(error, 'delete user') as User[];
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
    return handleError(error, 'fetch product codes') as ProductCode[];
  }
}

// 품목 코드 추가
export async function addProductCode(productCode: Omit<ProductCode, 'id'>) {
  try {
    // storage-context.tsx 에서 이미 category_id로 매핑하고 있으므로,
    // 전달된 productCode 객체가 DB 스키마와 일치한다고 가정합니다.
    // 만약 ProductCode 타입에 category가 있고 DB에 category_id만 있다면,
    // context에서 category_id: productCode.category, delete productCode.category 처리가 필요합니다.
    // 현재는 lib/api.ts로 전달된 productCode 객체가 DB 삽입에 적합하다고 가정합니다.
    const { category, ...productCodeForDb } = productCode as any; // 'category'가 있다면 분리
    if (category && !productCodeForDb.category_id) { // category_id가 없고 category가 있다면 변환
         productCodeForDb.category_id = category;
    }


    const { data, error } = await supabase
      .from('product_codes')
      .insert([productCodeForDb]) // category 필드가 아닌 category_id를 사용하도록 이미 컨텍스트에서 처리되었거나 여기서 조정
      .select();

    if (error) throw error;
    return (data || []) as ProductCode[];
  } catch (error) {
    return handleError(error, 'add product code') as ProductCode[];
  }
}

// 품목 코드 수정
export async function updateProductCode(id: string, updates: Partial<ProductCode>) {
  try {
    // 위와 동일하게 category vs category_id 처리 필요
    const { category, ...updatesForDb } = updates as any;
    if (category && !updatesForDb.category_id) {
        updatesForDb.category_id = category;
    }

    const { data, error } = await supabase
      .from('product_codes')
      .update(updatesForDb)
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []) as ProductCode[];
  } catch (error) {
    return handleError(error, 'update product code') as ProductCode[];
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
    return handleError(error, 'delete product code') as ProductCode[];
  }
}
