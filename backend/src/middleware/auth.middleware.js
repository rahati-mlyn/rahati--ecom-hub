const passport = require('passport');

// وسيط للتحقق من المصادقة
exports.authenticate = passport.authenticate('jwt', { session: false });

// وسيط للتحقق من دور المسؤول
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'غير مصرح لك بالوصول إلى هذا المورد'
  });
};

// وسيط للتحقق من دور مالك المتجر
exports.isStoreOwner = (req, res, next) => {
  if (req.user && (req.user.role === 'store_owner' || req.user.role === 'admin')) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'غير مصرح لك بالوصول إلى هذا المورد'
  });
};

// وسيط للتحقق من ملكية المتجر
exports.isStoreOwnerOrAdmin = async (req, res, next) => {
  const storeId = req.params.storeId || req.body.storeId;
  
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'معرف المتجر مطلوب'
    });
  }
  
  // المسؤول لديه وصول كامل
  if (req.user.role === 'admin') {
    return next();
  }
  
  // التحقق من أن المستخدم هو مالك المتجر
  const Store = require('../models/Store');
  const store = await Store.findById(storeId);
  
  if (!store) {
    return res.status(404).json({
      success: false,
      message: 'المتجر غير موجود'
    });
  }
  
  if (req.user.id === store.owner.toString()) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'غير مصرح لك بالوصول إلى هذا المتجر'
  });
};

// وسيط للتحقق من ملكية المنتج
exports.isProductOwnerOrAdmin = async (req, res, next) => {
  const productId = req.params.id;
  
  if (!productId) {
    return res.status(400).json({
      success: false,
      message: 'معرف المنتج مطلوب'
    });
  }
  
  // المسؤول لديه وصول كامل
  if (req.user.role === 'admin') {
    return next();
  }
  
  // التحقق من أن المستخدم هو مالك المتجر الذي ينتمي إليه المنتج
  const Product = require('../models/Product');
  const product = await Product.findById(productId);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'المنتج غير موجود'
    });
  }
  
  const Store = require('../models/Store');
  const store = await Store.findById(product.storeId);
  
  if (!store) {
    return res.status(404).json({
      success: false,
      message: 'المتجر غير موجود'
    });
  }
  
  if (req.user.id === store.owner.toString()) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'غير مصرح لك بالوصول إلى هذا المنتج'
  });
};
