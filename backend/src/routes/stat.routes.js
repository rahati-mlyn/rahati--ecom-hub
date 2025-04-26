const express = require('express');
const router = express.Router();
const statController = require('../controllers/stat.controller');
const passport = require('passport');

// وسيط للتحقق من المصادقة
const authenticate = passport.authenticate('jwt', { session: false });

// الحصول على إحصائيات متجر محدد
router.get('/store/:storeId', authenticate, statController.getStoreStats);

// تسجيل زيارة جديدة
router.post('/visit/:storeId', statController.recordVisit);

// الحصول على إحصائيات النظام (للمسؤول فقط)
router.get('/system', authenticate, statController.getSystemStats);

module.exports = router;
