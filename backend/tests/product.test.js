const request = require('supertest');
const app = require('../src/server');
const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const Store = require('../src/models/Store');
const User = require('../src/models/User');

// بيانات اختبار
const testUser = {
  name: 'مالك متجر اختبار للمنتجات',
  email: 'product_owner@example.com',
  phone: '0500000002',
  password: 'password123'
};

const testStore = {
  name: 'متجر اختبار للمنتجات',
  description: 'وصف متجر اختبار المنتجات',
  type: 'store',
  contactPhone: '0500000002',
  city: 'الرياض'
};

const testProduct = {
  name: 'منتج اختبار',
  description: 'وصف منتج الاختبار',
  price: 100,
  category: 'إلكترونيات',
  city: 'الرياض'
};

let authToken;
let userId;
let storeId;
let productId;

// قبل جميع الاختبارات
beforeAll(async () => {
  // حذف المستخدم والمتجر والمنتج إذا كانوا موجودين
  await User.deleteOne({ email: testUser.email });
  await Store.deleteOne({ name: testStore.name });
  
  // تسجيل مستخدم جديد
  const userResponse = await request(app)
    .post('/api/auth/register')
    .send(testUser);
  
  authToken = userResponse.body.token;
  userId = userResponse.body.user.id;
  
  // إنشاء متجر جديد
  const storeResponse = await request(app)
    .post('/api/stores')
    .set('Authorization', `Bearer ${authToken}`)
    .send(testStore);
  
  storeId = storeResponse.body.data._id;
});

// بعد جميع الاختبارات
afterAll(async () => {
  // حذف المستخدم والمتجر والمنتج بعد الانتهاء
  await User.deleteOne({ email: testUser.email });
  await Store.deleteOne({ _id: storeId });
  await Product.deleteOne({ _id: productId });
  
  // إغلاق اتصال قاعدة البيانات
  await mongoose.connection.close();
});

describe('اختبار إدارة المنتجات', () => {
  // اختبار إنشاء منتج جديد
  test('إنشاء منتج جديد', async () => {
    const productData = {
      ...testProduct,
      storeId
    };
    
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send(productData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.name).toBe(testProduct.name);
    expect(response.body.data.price).toBe(testProduct.price);
    expect(response.body.data.storeId).toBe(storeId);
    
    // حفظ معرف المنتج للاختبارات اللاحقة
    productId = response.body.data._id;
  });
  
  // اختبار الحصول على قائمة المنتجات
  test('الحصول على قائمة المنتجات', async () => {
    const response = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
  });
  
  // اختبار الحصول على منتج محدد
  test('الحصول على منتج محدد', async () => {
    const response = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data._id).toBe(productId);
    expect(response.body.data.name).toBe(testProduct.name);
  });
  
  // اختبار تحديث منتج
  test('تحديث منتج', async () => {
    const updatedProduct = {
      name: 'منتج اختبار محدث',
      price: 150
    };
    
    const response = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updatedProduct);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.name).toBe(updatedProduct.name);
    expect(response.body.data.price).toBe(updatedProduct.price);
  });
  
  // اختبار البحث عن المنتجات حسب الفئة
  test('البحث عن المنتجات حسب الفئة', async () => {
    const response = await request(app)
      .get(`/api/products?category=${testProduct.category}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
  });
  
  // اختبار البحث عن المنتجات حسب المتجر
  test('البحث عن المنتجات حسب المتجر', async () => {
    const response = await request(app)
      .get(`/api/products?storeId=${storeId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });
});
