# Rahati Backend API

هذا هو النظام الخلفي (Backend) لموقع راحتي الإلكتروني، مبني باستخدام Node.js وExpress وMongoDB.

## المتطلبات

- Node.js (الإصدار 18 أو أحدث)
- MongoDB
- npm أو yarn

## التثبيت

1. استنساخ المستودع:
```bash
git clone https://github.com/yourusername/rahati-backend.git
cd rahati-backend
```

2. تثبيت التبعيات:
```bash
npm install
```

3. إنشاء ملف `.env` بناءً على ملف `.env.example`:
```bash
cp .env.example .env
```

4. تعديل ملف `.env` بإضافة بيانات الاتصال الخاصة بك:
```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/rahati-db?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://localhost:3000
```

5. تشغيل الخادم:
```bash
npm start
```

للتطوير، يمكنك استخدام:
```bash
npm run dev
```

## هيكل المشروع

```
backend/
├── src/
│   ├── config/         # ملفات التكوين
│   ├── controllers/    # وحدات التحكم بواجهات API
│   ├── middleware/     # وسائط Express
│   ├── models/         # نماذج Mongoose
│   ├── routes/         # مسارات API
│   ├── utils/          # أدوات مساعدة
│   └── server.js       # نقطة الدخول الرئيسية
├── tests/              # اختبارات
├── uploads/            # مجلد تحميل الملفات
├── .env.example        # نموذج لملف البيئة
├── package.json        # تبعيات المشروع
└── README.md           # توثيق المشروع
```

## واجهات API

### المصادقة

- `POST /api/auth/register` - تسجيل مستخدم جديد
- `POST /api/auth/login` - تسجيل الدخول
- `GET /api/auth/me` - الحصول على معلومات المستخدم الحالي
- `POST /api/auth/logout` - تسجيل الخروج
- `GET /api/auth/google` - بدء مصادقة Google
- `GET /api/auth/google/callback` - استجابة مصادقة Google

### المستخدمين

- `GET /api/users` - الحصول على قائمة المستخدمين (للمسؤول فقط)
- `GET /api/users/:id` - الحصول على مستخدم محدد
- `PUT /api/users/:id` - تحديث معلومات المستخدم
- `PUT /api/users/:id/password` - تغيير كلمة المرور
- `DELETE /api/users/:id` - حذف مستخدم

### المتاجر

- `POST /api/stores` - إنشاء متجر جديد
- `GET /api/stores` - الحصول على قائمة المتاجر
- `GET /api/stores/:id` - الحصول على متجر محدد
- `PUT /api/stores/:id` - تحديث متجر
- `PATCH /api/stores/:id/status` - تحديث حالة المتجر (للمسؤول فقط)
- `DELETE /api/stores/:id` - حذف متجر
- `GET /api/stores/:id/stats` - الحصول على إحصائيات المتجر

### المنتجات

- `POST /api/products` - إنشاء منتج جديد
- `GET /api/products` - الحصول على قائمة المنتجات
- `GET /api/products/:id` - الحصول على منتج محدد
- `PUT /api/products/:id` - تحديث منتج
- `PATCH /api/products/:id/status` - تحديث حالة المنتج (للمسؤول فقط)
- `DELETE /api/products/:id` - حذف منتج
- `POST /api/products/order` - تحديث ترتيب المنتجات

### الطلبات

- `POST /api/orders` - إنشاء طلب جديد
- `GET /api/orders/user` - الحصول على قائمة الطلبات للمستخدم الحالي
- `GET /api/orders/store/:storeId` - الحصول على قائمة الطلبات لمتجر محدد
- `GET /api/orders/:id` - الحصول على طلب محدد
- `PATCH /api/orders/:id/status` - تحديث حالة الطلب
- `POST /api/orders/:id/inquiry` - إضافة استفسار للطلب
- `POST /api/orders/:id/inquiry-response` - إضافة رد على استفسار الطلب

### الإحصائيات

- `GET /api/stats/store/:storeId` - الحصول على إحصائيات متجر محدد
- `POST /api/stats/visit/:storeId` - تسجيل زيارة جديدة
- `GET /api/stats/system` - الحصول على إحصائيات النظام (للمسؤول فقط)

## النشر على Render

1. إنشاء حساب على [Render](https://render.com/)
2. إنشاء خدمة ويب جديدة واختيار "Build and deploy from a Git repository"
3. ربط مستودع GitHub الخاص بك
4. تكوين الخدمة:
   - **Name**: rahati-backend
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. إضافة متغيرات البيئة:
   - `PORT`: 10000 (Render يستخدم هذا المنفذ افتراضيًا)
   - `MONGODB_URI`: رابط اتصال MongoDB Atlas الخاص بك
   - `JWT_SECRET`: مفتاح سري قوي
   - `FRONTEND_URL`: عنوان URL للواجهة الأمامية المنشورة
   - `NODE_ENV`: production
6. انقر على "Create Web Service"

## الاتصال بقاعدة بيانات MongoDB Atlas

1. إنشاء حساب على [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. إنشاء مجموعة جديدة (cluster)
3. إنشاء مستخدم قاعدة بيانات مع كلمة مرور قوية
4. تكوين قائمة IP المسموح بها (يمكنك السماح بالوصول من أي مكان: 0.0.0.0/0)
5. الحصول على رابط الاتصال واستبدال `username` و`password` ببيانات الاعتماد الخاصة بك
6. استخدام رابط الاتصال في ملف `.env` الخاص بك

## الاختبارات

لتشغيل الاختبارات:

```bash
npm test
```

## الترخيص

هذا المشروع مرخص بموجب [MIT License](LICENSE).
