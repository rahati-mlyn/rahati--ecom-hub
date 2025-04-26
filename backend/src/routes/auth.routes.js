const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const passport = require('passport');

// مسار تسجيل مستخدم جديد
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('الاسم مطلوب'),
    body('password').isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون على الأقل 6 أحرف'),
    body('email').optional().isEmail().withMessage('البريد الإلكتروني غير صالح'),
    body('phone').optional().isMobilePhone(['ar-SA']).withMessage('رقم الهاتف غير صالح')
  ],
  authController.register
);

// مسار تسجيل الدخول
router.post(
  '/login',
  [
    body('password').notEmpty().withMessage('كلمة المرور مطلوبة'),
    body('email').optional().isEmail().withMessage('البريد الإلكتروني غير صالح'),
    body('phone').optional().isMobilePhone(['ar-SA']).withMessage('رقم الهاتف غير صالح')
  ],
  authController.login
);

// مسار الحصول على معلومات المستخدم الحالي
router.get(
  '/me',
  passport.authenticate('jwt', { session: false }),
  authController.getCurrentUser
);

// مسار تسجيل الخروج
router.post('/logout', authController.logout);

// مسارات مصادقة Google
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  authController.googleCallback
);

module.exports = router;
