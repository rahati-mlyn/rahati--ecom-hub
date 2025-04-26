const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const productController = require('../controllers/product.controller');
const passport = require('passport');

// وسيط للتحقق من المصادقة
const authenticate = passport.authenticate('jwt', { session: false });

// إنشاء منتج جديد
router.post(
  '/',
  authenticate,
  productController.upload,
  [
    body('name').notEmpty().withMessage('اسم المنتج مطلوب'),
    body('description').notEmpty().withMessage('وصف المنتج مطلوب'),
    body('price').isNumeric().withMessage('السعر يجب أن يكون رقمًا'),
    body('category').notEmpty().withMessage('الفئة مطلوبة'),
    body('city').notEmpty().withMessage('المدينة مطلوبة')
  ],
  productController.createProduct
);

// الحصول على قائمة المنتجات
router.get('/', authenticate, productController.getAllProducts);

// الحصول على منتج محدد بواسطة المعرف
router.get('/:id', authenticate, productController.getProductById);

// تحديث منتج
router.put(
  '/:id',
  authenticate,
  productController.upload,
  [
    body('name').optional().notEmpty().withMessage('اسم المنتج لا يمكن أن يكون فارغًا'),
    body('description').optional().notEmpty().withMessage('وصف المنتج لا يمكن أن يكون فارغًا'),
    body('price').optional().isNumeric().withMessage('السعر يجب أن يكون رقمًا'),
    body('category').optional().notEmpty().withMessage('الفئة لا يمكن أن تكون فارغة'),
    body('city').optional().notEmpty().withMessage('المدينة لا يمكن أن تكون فارغة')
  ],
  productController.updateProduct
);

// تحديث حالة المنتج (للمسؤول فقط)
router.patch(
  '/:id/status',
  authenticate,
  [
    body('status').isIn(['pending', 'approved', 'rejected']).withMessage('حالة المنتج غير صالحة')
  ],
  productController.updateProductStatus
);

// حذف منتج
router.delete('/:id', authenticate, productController.deleteProduct);

// تحديث ترتيب المنتجات
router.post(
  '/order',
  authenticate,
  [
    body('productsOrder').isArray().withMessage('يجب توفير مصفوفة لترتيب المنتجات')
  ],
  productController.updateProductsOrder
);

module.exports = router;
