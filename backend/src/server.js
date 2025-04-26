require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const path = require('path');
const { setupGoogleStrategy } = require('./config/google-auth');

// إنشاء تطبيق Express
const app = express();
const PORT = process.env.PORT || 5000;

// الاتصال بقاعدة البيانات MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('تم الاتصال بقاعدة البيانات MongoDB بنجاح'))
  .catch(err => console.error('خطأ في الاتصال بقاعدة البيانات:', err));

// إعدادات الأمان والوسائط
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// تكوين حد معدل الطلبات
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // الحد الأقصى للطلبات لكل IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة لاحقًا'
});
app.use('/api/', limiter);

// تكوين Passport
app.use(passport.initialize());
require('./config/passport');
setupGoogleStrategy();

// المجلد العام للملفات الثابتة
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// استيراد المسارات
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const storeRoutes = require('./routes/store.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const statRoutes = require('./routes/stat.routes');

// استخدام المسارات
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statRoutes);

// مسار الاختبار
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'النظام الخلفي يعمل بشكل صحيح' });
});

// معالجة الأخطاء
app.use((req, res, next) => {
  const error = new Error('المسار غير موجود');
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message
    }
  });
});

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
});

module.exports = app;
