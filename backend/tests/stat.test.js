const request = require('supertest');
const app = require('../src/server');
const mongoose = require('mongoose');
const Stat = require('../src/models/Stat');
const Store = require('../src/models/Store');
const User = require('../src/models/User');

// بيانات اختبار
const testAdmin = {
  name: 'مسؤول اختبار',
  email: 'admin_test@example.com',
  phone: '0500000005',
  password: 'password123'
};

const testStore = {
  name: 'متجر اختبار للإحصائيات',
  description: 'وصف متجر اختبار الإحصائيات',
  type: 'store',
  contactPhone: '0500000005',
  city: 'الرياض'
};

let adminToken;
let adminId;
let storeId;

// قبل جميع الاختبارات
beforeAll(async () => {
  // حذف بيانات الاختبار إذا كانت موجودة
  await User.deleteOne({ email: testAdmin.email });
  await Store.deleteOne({ name: testStore.name });
  
  // تسجيل مستخدم مسؤول
  const adminResponse = await request(app)
    .post('/api/auth/register')
    .send(testAdmin);
  
  adminToken = adminResponse.body.token;
  adminId = adminResponse.body.user.id;
  
  // تحديث دور المستخدم إلى مسؤول
  await User.findByIdAndUpdate(adminId, { role: 'admin' });
  
  // إنشاء متجر جديد
  const storeResponse = await request(app)
    .post('/api/stores')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(testStore);
  
  storeId = storeResponse.body.data._id;
  
  // تحديث حالة المتجر إلى معتمد
  await Store.findByIdAndUpdate(storeId, { status: 'approved' });
});

// بعد جميع الاختبارات
afterAll(async () => {
  // حذف بيانات الاختبار بعد الانتهاء
  await User.deleteOne({ email: testAdmin.email });
  await Store.deleteOne({ _id: storeId });
  await Stat.deleteMany({ storeId });
  
  // إغلاق اتصال قاعدة البيانات
  await mongoose.connection.close();
});

describe('اختبار إدارة الإحصائيات', () => {
  // اختبار تسجيل زيارة جديدة
  test('تسجيل زيارة جديدة', async () => {
    const response = await request(app)
      .post(`/api/stats/visit/${storeId}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBeDefined();
  });
  
  // اختبار الحصول على إحصائيات المتجر
  test('الحصول على إحصائيات المتجر', async () => {
    const response = await request(app)
      .get(`/api/stats/store/${storeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.views).toBeDefined();
    expect(response.body.data.orders).toBeDefined();
    expect(response.body.data.revenue).toBeDefined();
    expect(response.body.data.topProducts).toBeDefined();
  });
  
  // اختبار الحصول على إحصائيات المتجر مع تحديد الفترة
  test('الحصول على إحصائيات المتجر مع تحديد الفترة', async () => {
    const response = await request(app)
      .get(`/api/stats/store/${storeId}?period=week`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });
  
  // اختبار الحصول على إحصائيات النظام (للمسؤول فقط)
  test('الحصول على إحصائيات النظام', async () => {
    const response = await request(app)
      .get('/api/stats/system')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.stores).toBeDefined();
    expect(response.body.data.products).toBeDefined();
    expect(response.body.data.orders).toBeDefined();
    expect(response.body.data.revenue).toBeDefined();
  });
});
