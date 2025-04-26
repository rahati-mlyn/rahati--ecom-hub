const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const orderController = require('../controllers/order.controller');
const passport = require('passport');

// وسيط للتحقق من المصادقة
const authenticate = passport.authenticate('jwt', { session: false });

// إنشاء طلب جديد
router.post(
  '/',
  authenticate,
  [
    body('items').isArray().withMessage('يجب توفير عناصر الطلب كمصفوفة'),
    body('items.*.id').notEmpty().withMessage('معرف المنتج مطلوب'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('الكمية يجب أن تكون رقمًا صحيحًا أكبر من 0'),
    body('total').isNumeric().withMessage('المجموع يجب أن يكون رقمًا'),
    body('shippingAddress.street').notEmpty().withMessage('عنوان الشارع مطلوب'),
    body('shippingAddress.city').notEmpty().withMessage('المدينة مطلوبة')
  ],
  orderController.createOrder
);

// الحصول على قائمة الطلبات للمستخدم الحالي
router.get('/user', authenticate, orderController.getUserOrders);

// الحصول على قائمة الطلبات لمتجر محدد
router.get('/store/:storeId', authenticate, orderController.getStoreOrders);

// الحصول على طلب محدد بواسطة المعرف
router.get('/:id', authenticate, orderController.getOrderById);

// تحديث حالة الطلب
router.patch(
  '/:id/status',
  authenticate,
  [
    body('status').isIn(['pending', 'preparing', 'shipping', 'delivered', 'rejected']).withMessage('حالة الطلب غير صالحة')
  ],
  orderController.updateOrderStatus
);

// إضافة استفسار للطلب
router.post(
  '/:id/inquiry',
  authenticate,
  [
    body('inquiryMessage').notEmpty().withMessage('رسالة الاستفسار مطلوبة')
  ],
  orderController.addOrderInquiry
);

// إضافة رد على استفسار الطلب
router.post(
  '/:id/inquiry-response',
  authenticate,
  [
    body('inquiryResponse').notEmpty().withMessage('الرد على الاستفسار مطلوب')
  ],
  orderController.addOrderInquiryResponse
);

module.exports = router;
