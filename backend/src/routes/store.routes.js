const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const storeController = require('../controllers/store.controller');
const passport = require('passport');

// وسيط للتحقق من المصادقة
const authenticate = passport.authenticate('jwt', { session: false });

// إنشاء متجر جديد
router.post(
  '/',
  authenticate,
  storeController.upload,
  [
    body('name').notEmpty().withMessage('اسم المتجر مطلوب'),
    body('description').notEmpty().withMessage('وصف المتجر مطلوب'),
    body('type').isIn(['store', 'restaurant', 'realestate', 'car', 'clothes', 'electronics', 'homegoods']).withMessage('نوع المتجر غير صالح'),
    body('contactPhone').notEmpty().withMessage('رقم الاتصال مطلوب'),
    body('city').notEmpty().withMessage('المدينة مطلوبة')
  ],
  storeController.createStore
);

// الحصول على قائمة المتاجر
router.get('/', authenticate, storeController.getAllStores);

// الحصول على متجر محدد بواسطة المعرف
router.get('/:id', authenticate, storeController.getStoreById);

// تحديث متجر
router.put(
  '/:id',
  authenticate,
  storeController.upload,
  [
    body('name').optional().notEmpty().withMessage('اسم المتجر لا يمكن أن يكون فارغًا'),
    body('description').optional().notEmpty().withMessage('وصف المتجر لا يمكن أن يكون فارغًا'),
    body('type').optional().isIn(['store', 'restaurant', 'realestate', 'car', 'clothes', 'electronics', 'homegoods']).withMessage('نوع المتجر غير صالح'),
    body('contactPhone').optional().notEmpty().withMessage('رقم الاتصال لا يمكن أن يكون فارغًا'),
    body('city').optional().notEmpty().withMessage('المدينة لا يمكن أن تكون فارغة')
  ],
  storeController.updateStore
);

// تحديث حالة المتجر (للمسؤول فقط)
router.patch(
  '/:id/status',
  authenticate,
  [
    body('status').isIn(['pending', 'approved', 'rejected']).withMessage('حالة المتجر غير صالحة'),
    body('subscriptionType').optional().isIn(['basic', 'limited', 'percentage']).withMessage('نوع الاشتراك غير صالح')
  ],
  storeController.updateStoreStatus
);

// حذف متجر
router.delete('/:id', authenticate, storeController.deleteStore);

// الحصول على إحصائيات المتجر
router.get('/:id/stats', authenticate, storeController.getStoreStats);

// الحصول على منتجات المتجر (سيتم تنفيذها في مسارات المنتجات)
router.get('/:id/products', authenticate, (req, res) => {
  // سيتم تحويل هذا الطلب إلى وحدة التحكم بالمنتجات
  res.redirect(`/api/products?storeId=${req.params.id}`);
});

// الحصول على طلبات المتجر (سيتم تنفيذها في مسارات الطلبات)
router.get('/:id/orders', authenticate, (req, res) => {
  // سيتم تحويل هذا الطلب إلى وحدة التحكم بالطلبات
  res.redirect(`/api/orders?storeId=${req.params.id}`);
});

module.exports = router;
