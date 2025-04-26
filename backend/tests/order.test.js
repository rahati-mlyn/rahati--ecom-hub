const request = require('supertest');
const app = require('../src/server');
const mongoose = require('mongoose');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const Store = require('../src/models/Store');
const User = require('../src/models/User');

// بيانات اختبار
const testUser = {
  name: 'مستخدم اختبار للطلبات',
  email: 'order_user@example.com',
  phone: '0500000003',
  password: 'password123'
};

const testStoreOwner = {
  name: 'مالك متجر اختبار للطلبات',
  email: 'order_store_owner@example.com',
  phone: '0500000004',
  password: 'password123'
};

const testStore = {
  name: 'متجر اختبار للطلبات',
  description: 'وصف متجر اختبار الطلبات',
  type: 'store',
  contactPhone: '0500000004',
  city: 'الرياض'
};

const testProduct = {
  name: 'منتج اختبار للطلبات',
  description: 'وصف منتج اختبار الطلبات',
  price: 100,
  category: 'إلكترونيات',
  city: 'الرياض'
};

const testShippingAddress = {
  street: 'شارع الاختبار',
  city: 'الرياض',
  postalCode: '12345',
  country: 'المملكة العربية السعودية'
};

let userToken;
let userId;
let ownerToken;
let ownerId;
let storeId;
let productId;
let orderId;

// قبل جميع الاختبارات
beforeAll(async () => {
  // حذف بيانات الاختبار إذا كانت موجودة
  await User.deleteOne({ email: testUser.email });
  await User.deleteOne({ email: testStoreOwner.email });
  await Store.deleteOne({ name: testStore.name });
  
  // تسجيل مستخدم عادي
  const userResponse = await request(app)
    .post('/api/auth/register')
    .send(testUser);
  
  userToken = userResponse.body.token;
  userId = userResponse.body.user.id;
  
  // تسجيل مالك متجر
  const ownerResponse = await request(app)
    .post('/api/auth/register')
    .send(testStoreOwner);
  
  ownerToken = ownerResponse.body.token;
  ownerId = ownerResponse.body.user.id;
  
  // إنشاء متجر جديد
  const storeResponse = await request(app)
    .post('/api/stores')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send(testStore);
  
  storeId = storeResponse.body.data._id;
  
  // تحديث حالة المتجر إلى معتمد (محاكاة لعملية الموافقة من المسؤول)
  await Store.findByIdAndUpdate(storeId, { status: 'approved' });
  
  // إنشاء منتج جديد
  const productData = {
    ...testProduct,
    storeId
  };
  
  const productResponse = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send(productData);
  
  productId = productResponse.body.data._id;
  
  // تحديث حالة المنتج إلى معتمد (محاكاة لعملية الموافقة من المسؤول)
  await Product.findByIdAndUpdate(productId, { status: 'approved' });
});

// بعد جميع الاختبارات
afterAll(async () => {
  // حذف بيانات الاختبار بعد الانتهاء
  await User.deleteOne({ email: testUser.email });
  await User.deleteOne({ email: testStoreOwner.email });
  await Store.deleteOne({ _id: storeId });
  await Product.deleteOne({ _id: productId });
  await Order.deleteOne({ _id: orderId });
  
  // إغلاق اتصال قاعدة البيانات
  await mongoose.connection.close();
});

describe('اختبار إدارة الطلبات', () => {
  // اختبار إنشاء طلب جديد
  test('إنشاء طلب جديد', async () => {
    const orderData = {
      items: [
        {
          id: productId,
          quantity: 2
        }
      ],
      total: testProduct.price * 2,
      shippingAddress: testShippingAddress,
      paymentMethod: 'cash'
    };
    
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send(orderData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.items).toBeDefined();
    expect(response.body.data.items.length).toBe(1);
    expect(response.body.data.items[0].id).toBe(productId);
    expect(response.body.data.items[0].quantity).toBe(2);
    expect(response.body.data.total).toBe(testProduct.price * 2);
    expect(response.body.data.status).toBe('pending');
    
    // حفظ معرف الطلب للاختبارات اللاحقة
    orderId = response.body.data._id;
  });
  
  // اختبار الحصول على قائمة الطلبات للمستخدم
  test('الحصول على قائمة الطلبات للمستخدم', async () => {
    const response = await request(app)
      .get('/api/orders/user')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });
  
  // اختبار الحصول على قائمة الطلبات للمتجر
  test('الحصول على قائمة الطلبات للمتجر', async () => {
    const response = await request(app)
      .get(`/api/orders/store/${storeId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });
  
  // اختبار الحصول على طلب محدد
  test('الحصول على طلب محدد', async () => {
    const response = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data._id).toBe(orderId);
    expect(response.body.data.status).toBe('pending');
  });
  
  // اختبار تحديث حالة الطلب
  test('تحديث حالة الطلب', async () => {
    const statusData = {
      status: 'preparing',
      message: 'جاري تجهيز الطلب'
    };
    
    const response = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(statusData);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.status).toBe('preparing');
    expect(response.body.data.statusHistory).toBeDefined();
    expect(response.body.data.statusHistory.length).toBeGreaterThan(1);
  });
  
  // اختبار إضافة استفسار للطلب
  test('إضافة استفسار للطلب', async () => {
    const inquiryData = {
      inquiryMessage: 'متى سيتم توصيل الطلب؟'
    };
    
    const response = await request(app)
      .post(`/api/orders/${orderId}/inquiry`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(inquiryData);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.inquiryMessage).toBe(inquiryData.inquiryMessage);
  });
  
  // اختبار إضافة رد على استفسار الطلب
  test('إضافة رد على استفسار الطلب', async () => {
    const responseData = {
      inquiryResponse: 'سيتم توصيل الطلب خلال 24 ساعة'
    };
    
    const response = await request(app)
      .post(`/api/orders/${orderId}/inquiry-response`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(responseData);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.inquiryResponse).toBe(responseData.inquiryResponse);
  });
});
