const request = require('supertest');
const app = require('../src/server');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

// بيانات اختبار
const testUser = {
  name: 'مستخدم اختبار',
  email: 'test@example.com',
  phone: '0500000000',
  password: 'password123'
};

let authToken;
let userId;

// قبل جميع الاختبارات
beforeAll(async () => {
  // حذف المستخدم إذا كان موجودًا
  await User.deleteOne({ email: testUser.email });
});

// بعد جميع الاختبارات
afterAll(async () => {
  // حذف المستخدم بعد الانتهاء
  await User.deleteOne({ email: testUser.email });
  
  // إغلاق اتصال قاعدة البيانات
  await mongoose.connection.close();
});

describe('اختبار نظام المصادقة', () => {
  // اختبار تسجيل مستخدم جديد
  test('تسجيل مستخدم جديد', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.name).toBe(testUser.name);
    expect(response.body.user.email).toBe(testUser.email);
    
    // حفظ الرمز المميز ومعرف المستخدم للاختبارات اللاحقة
    authToken = response.body.token;
    userId = response.body.user.id;
  });
  
  // اختبار تسجيل الدخول
  test('تسجيل الدخول بالبريد الإلكتروني وكلمة المرور', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.name).toBe(testUser.name);
    expect(response.body.user.email).toBe(testUser.email);
    
    // تحديث الرمز المميز
    authToken = response.body.token;
  });
  
  // اختبار تسجيل الدخول برقم الهاتف
  test('تسجيل الدخول برقم الهاتف وكلمة المرور', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        phone: testUser.phone,
        password: testUser.password
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.name).toBe(testUser.name);
    expect(response.body.user.phone).toBe(testUser.phone);
  });
  
  // اختبار الحصول على معلومات المستخدم الحالي
  test('الحصول على معلومات المستخدم الحالي', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.name).toBe(testUser.name);
    expect(response.body.user.email).toBe(testUser.email);
  });
  
  // اختبار تسجيل الدخول بكلمة مرور خاطئة
  test('تسجيل الدخول بكلمة مرور خاطئة', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrong_password'
      });
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
  
  // اختبار التحقق من الرمز المميز
  test('التحقق من صحة الرمز المميز', () => {
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'rahati_secret_key');
    
    expect(decoded).toBeDefined();
    expect(decoded.id).toBe(userId);
    expect(decoded.role).toBe('user');
  });
});

describe('اختبار إدارة المستخدمين', () => {
  // اختبار تحديث معلومات المستخدم
  test('تحديث معلومات المستخدم', async () => {
    const updatedUser = {
      name: 'مستخدم محدث'
    };
    
    const response = await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updatedUser);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.name).toBe(updatedUser.name);
  });
  
  // اختبار تغيير كلمة المرور
  test('تغيير كلمة المرور', async () => {
    const passwordData = {
      currentPassword: testUser.password,
      newPassword: 'newpassword123'
    };
    
    const response = await request(app)
      .put(`/api/users/${userId}/password`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(passwordData);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // تحديث كلمة المرور للاختبارات اللاحقة
    testUser.password = passwordData.newPassword;
  });
  
  // اختبار تسجيل الدخول بكلمة المرور الجديدة
  test('تسجيل الدخول بكلمة المرور الجديدة', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
  });
});
