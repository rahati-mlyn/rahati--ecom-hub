const request = require('supertest');
const app = require('../src/server');
const mongoose = require('mongoose');
const Store = require('../src/models/Store');
const User = require('../src/models/User');

// بيانات اختبار
const testUser = {
  name: 'مالك متجر اختبار',
  email: 'store_owner@example.com',
  phone: '0500000001',
  password: 'password123'
};

const testStore = {
  name: 'متجر اختبار',
  description: 'وصف متجر الاختبار',
  type: 'store',
  contactPhone: '0500000001',
  city: 'الرياض'
};

let authToken;
let userId;
let storeId;

// قبل جميع الاختبارات
beforeAll(async () => {
  // حذف المستخدم والمتجر إذا كانا موجودين
  await User.deleteOne({ email: testUser.email });
  await Store.deleteOne({ name: testStore.name });
  
  // تسجيل مستخدم جديد
  const userResponse = await request(app)
    .post('/api/auth/register')
    .send(testUser);
  
  authToken = userResponse.body.token;
  userId = userResponse.body.user.id;
});

// بعد جميع الاختبارات
afterAll(async () => {
  // حذف المستخدم والمتجر بعد الانتهاء
  await User.deleteOne({ email: testUser.email });
  await Store.deleteOne({ _id: storeId });
  
  // إغلاق اتصال قاعدة البيانات
  await mongoose.connection.close();
});

describe('اختبار إدارة المتاجر', () => {
  // اختبار إنشاء متجر جديد
  test('إنشاء متجر جديد', async () => {
    const response = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testStore);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.name).toBe(testStore.name);
    expect(response.body.data.status).toBe('pending');
    
    // حفظ معرف المتجر للاختبارات اللاحقة
    storeId = response.body.data._id;
    
    // التحقق من تحديث دور المستخدم
    const userResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(userResponse.body.user.role).toBe('store_owner');
    expect(userResponse.body.user.storeId).toBe(storeId);
  });
  
  // اختبار الحصول على قائمة المتاجر
  test('الحصول على قائمة المتاجر', async () => {
    const response = await request(app)
      .get('/api/stores')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
  });
  
  // اختبار الحصول على متجر محدد
  test('الحصول على متجر محدد', async () => {
    const response = await request(app)
      .get(`/api/stores/${storeId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data._id).toBe(storeId);
    expect(response.body.data.name).toBe(testStore.name);
  });
  
  // اختبار تحديث متجر
  test('تحديث متجر', async () => {
    const updatedStore = {
      name: 'متجر اختبار محدث',
      description: 'وصف متجر الاختبار المحدث'
    };
    
    const response = await request(app)
      .put(`/api/stores/${storeId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updatedStore);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.name).toBe(updatedStore.name);
    expect(response.body.data.description).toBe(updatedStore.description);
  });
  
  // اختبار الحصول على إحصائيات المتجر
  test('الحصول على إحصائيات المتجر', async () => {
    const response = await request(app)
      .get(`/api/stores/${storeId}/stats`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.views).toBeDefined();
    expect(response.body.data.orders).toBeDefined();
    expect(response.body.data.revenue).toBeDefined();
    expect(response.body.data.topProducts).toBeDefined();
  });
});
