const Store = require('../models/Store');
const User = require('../models/User');
const Product = require('../models/Product');
const Stat = require('../models/Stat');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// تكوين التخزين للصور
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/stores');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'store-' + uniqueSuffix + ext);
  }
});

// تكوين رفع الملفات
exports.upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 ميجابايت
  fileFilter: function(req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يجب أن يكون الملف صورة'));
    }
  }
}).single('image');

// إنشاء متجر جديد
exports.createStore = async (req, res) => {
  try {
    // التحقق من صحة البيانات
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description, type, contactPhone, city } = req.body;
    
    // إضافة مسار الصورة إذا تم رفعها
    let image = '';
    if (req.file) {
      image = `/uploads/stores/${req.file.filename}`;
    }

    // إنشاء متجر جديد
    const store = new Store({
      name,
      description,
      type,
      contactPhone,
      city,
      image,
      owner: req.user.id,
      status: 'pending' // المتاجر الجديدة تكون في حالة انتظار الموافقة
    });

    await store.save();

    // تحديث دور المستخدم ومعرف المتجر
    await User.findByIdAndUpdate(req.user.id, {
      role: 'store_owner',
      storeId: store._id
    });

    res.status(201).json({
      success: true,
      data: store,
      message: 'تم إرسال طلب إنشاء المتجر بنجاح وهو قيد المراجعة'
    });
  } catch (error) {
    console.error('خطأ في إنشاء متجر:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء المتجر'
    });
  }
};

// الحصول على قائمة المتاجر
exports.getAllStores = async (req, res) => {
  try {
    const { type, city, status } = req.query;
    
    // بناء شروط البحث
    const query = {};
    
    if (type) {
      query.type = type;
    }
    
    if (city) {
      query.city = city;
    }
    
    // إذا كان المستخدم مسؤولاً، يمكنه رؤية جميع المتاجر بغض النظر عن الحالة
    if (req.user && req.user.role === 'admin') {
      if (status) {
        query.status = status;
      }
    } else {
      // المستخدمون العاديون يمكنهم رؤية المتاجر المعتمدة فقط
      query.status = 'approved';
    }
    
    // الحصول على المتاجر مع التصفية
    const stores = await Store.find(query)
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: stores
    });
  } catch (error) {
    console.error('خطأ في الحصول على قائمة المتاجر:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على قائمة المتاجر'
    });
  }
};

// الحصول على متجر محدد بواسطة المعرف
exports.getStoreById = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)
      .populate('owner', 'name email phone');
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود'
      });
    }
    
    // التحقق من الصلاحيات للمتاجر غير المعتمدة
    if (store.status !== 'approved') {
      // فقط المالك أو المسؤول يمكنه رؤية المتاجر غير المعتمدة
      if (!(req.user && (req.user.id === store.owner.toString() || req.user.role === 'admin'))) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بالوصول إلى هذا المتجر'
        });
      }
    }
    
    // زيادة عدد المشاهدات
    if (store.status === 'approved') {
      store.stats.views.today += 1;
      store.stats.views.thisWeek += 1;
      store.stats.views.thisMonth += 1;
      store.stats.views.total += 1;
      await store.save();
      
      // تسجيل الإحصائيات
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let stat = await Stat.findOne({
        storeId: store._id,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      });
      
      if (!stat) {
        stat = new Stat({
          storeId: store._id,
          date: new Date(),
          views: 1,
          visitors: 1
        });
      } else {
        stat.views += 1;
      }
      
      await stat.save();
    }
    
    res.status(200).json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error('خطأ في الحصول على معلومات المتجر:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على معلومات المتجر'
    });
  }
};

// تحديث متجر
exports.updateStore = async (req, res) => {
  try {
    // التحقق من صحة البيانات
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { name, description, type, contactPhone, city } = req.body;
    
    // البحث عن المتجر
    const store = await Store.findById(req.params.id);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود'
      });
    }
    
    // التحقق من الصلاحيات
    if (req.user.role !== 'admin' && req.user.id !== store.owner.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث هذا المتجر'
      });
    }
    
    // تحديث بيانات المتجر
    store.name = name || store.name;
    store.description = description || store.description;
    store.type = type || store.type;
    store.contactPhone = contactPhone || store.contactPhone;
    store.city = city || store.city;
    
    // تحديث الصورة إذا تم رفعها
    if (req.file) {
      // حذف الصورة القديمة إذا كانت موجودة
      if (store.image) {
        const oldImagePath = path.join(__dirname, '../..', store.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      store.image = `/uploads/stores/${req.file.filename}`;
    }
    
    await store.save();
    
    res.status(200).json({
      success: true,
      data: store,
      message: 'تم تحديث المتجر بنجاح'
    });
  } catch (error) {
    console.error('خطأ في تحديث المتجر:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث المتجر'
    });
  }
};

// تحديث حالة المتجر (للمسؤول فقط)
exports.updateStoreStatus = async (req, res) => {
  try {
    // التحقق من صلاحيات المسؤول
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث حالة المتجر'
      });
    }
    
    const { status, subscriptionType } = req.body;
    
    // التحقق من صحة الحالة
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'حالة المتجر غير صالحة'
      });
    }
    
    // البحث عن المتجر وتحديثه
    const store = await Store.findById(req.params.id);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود'
      });
    }
    
    store.status = status;
    
    // تحديث نوع الاشتراك إذا تم توفيره
    if (subscriptionType) {
      store.subscriptionType = subscriptionType;
      
      // تحديث تفاصيل الاشتراك بناءً على النوع
      if (subscriptionType === 'basic') {
        store.subscriptionDetails.maxProducts = 10;
        store.subscriptionDetails.percentage = 0;
      } else if (subscriptionType === 'limited') {
        store.subscriptionDetails.maxProducts = 50;
        store.subscriptionDetails.percentage = 0;
      } else if (subscriptionType === 'percentage') {
        store.subscriptionDetails.maxProducts = 1000;
        store.subscriptionDetails.percentage = 5; // 5% نسبة افتراضية
      }
      
      // تحديث تاريخ بداية ونهاية الاشتراك
      const startDate = new Date();
      store.subscriptionDetails.startDate = startDate;
      
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // اشتراك لمدة شهر
      store.subscriptionDetails.endDate = endDate;
    }
    
    await store.save();
    
    res.status(200).json({
      success: true,
      data: store,
      message: 'تم تحديث حالة المتجر بنجاح'
    });
  } catch (error) {
    console.error('خطأ في تحديث حالة المتجر:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث حالة المتجر'
    });
  }
};

// حذف متجر
exports.deleteStore = async (req, res) => {
  try {
    // البحث عن المتجر
    const store = await Store.findById(req.params.id);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود'
      });
    }
    
    // التحقق من الصلاحيات
    if (req.user.role !== 'admin' && req.user.id !== store.owner.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف هذا المتجر'
      });
    }
    
    // حذف صورة المتجر إذا كانت موجودة
    if (store.image) {
      const imagePath = path.join(__dirname, '../..', store.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // حذف جميع منتجات المتجر
    await Product.deleteMany({ storeId: store._id });
    
    // حذف إحصائيات المتجر
    await Stat.deleteMany({ storeId: store._id });
    
    // تحديث المستخدم المالك
    if (req.user.id === store.owner.toString()) {
      await User.findByIdAndUpdate(req.user.id, {
        role: 'user',
        storeId: null
      });
    }
    
    // حذف المتجر
    await Store.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'تم حذف المتجر بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف المتجر:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف المتجر'
    });
  }
};

// الحصول على إحصائيات المتجر
exports.getStoreStats = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود'
      });
    }
    
    // التحقق من الصلاحيات
    if (req.user.role !== 'admin' && req.user.id !== store.owner.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى إحصائيات هذا المتجر'
      });
    }
    
    // الحصول على المنتجات الأكثر مبيعًا
    const topProducts = await Product.find({ storeId: store._id })
      .sort({ sales: -1 })
      .limit(5)
      .select('name sales');
    
    // إنشاء كائن الإحصائيات
    const stats = {
      views: store.stats.views,
      orders: store.stats.orders,
      revenue: store.stats.revenue,
      topProducts: topProducts.map(product => ({
        id: product._id,
        name: product.name,
        sales: product.sales
      }))
    };
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('خطأ في الحصول على إحصائيات المتجر:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على إحصائيات المتجر'
    });
  }
};
