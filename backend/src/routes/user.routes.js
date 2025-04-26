const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const passport = require('passport');

// وسيط للتحقق من المصادقة
const authenticate = passport.authenticate('jwt', { session: false });

// الحصول على قائمة المستخدمين (للمسؤول فقط)
router.get('/', authenticate, userController.getAllUsers);

// الحصول على مستخدم محدد بواسطة المعرف
router.get('/:id', authenticate, userController.getUserById);

// تحديث معلومات المستخدم
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().notEmpty().withMessage('الاسم لا يمكن أن يكون فارغًا'),
    body('email').optional().isEmail().withMessage('البريد الإلكتروني غير صالح'),
    body('phone').optional().isMobilePhone(['ar-SA']).withMessage('رقم الهاتف غير صالح')
  ],
  userController.updateUser
);

// تغيير كلمة المرور
router.put(
  '/:id/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('كلمة المرور الحالية مطلوبة'),
    body('newPassword').isLength({ min: 6 }).withMessage('كلمة المرور الجديدة يجب أن تكون على الأقل 6 أحرف')
  ],
  userController.changePassword
);

// حذف مستخدم
router.delete('/:id', authenticate, userController.deleteUser);

module.exports = router;
