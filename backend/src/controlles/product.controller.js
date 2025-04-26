const Product = require('../models/Product');
const Store = require('../models/Store');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// تكوين التخزين للصور
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
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

// إنشاء منتج جديد
exports.createProduct = async (req, res) => {
  try {
    // التحقق من صحة البيانات
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description, price, category, subCategory, city, discount, attributes } = req.body;
    
    // التحقق من وجود المتجر وصلاحيات المستخدم
    const store = await Store.findById(req.body.storeId || req.user.storeId);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود'
      });
    }
    
    // التحقق من أن المستخدم هو مالك المتجر أو مسؤول
    if (req.user.role !== 'admin' && req.user.id !== store.owner.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بإضافة منتجات لهذا المتجر'
      });
    }
    
    // التحقق من عدد المنتجات المسموح به
    const productsCount = await Product.countDocuments({ storeId: store._id });
    if (productsCount >= store.subscriptionDetails.maxProducts) {
      return res.status(400).json({
        success: false,
        message: `لقد وصلت إلى الحد الأقصى من المنتجات المسموح بها (${store.subscriptionDetails.maxProducts}) لنوع اشتراكك الحالي`
      });
    }
    
    // إضافة مسار الصورة إذا تم رفعها
    let image = '';
    if (req.file) {
      image = `/uploads/products/${req.file.filename}`;
    }
    
    // تحويل السمات إلى كائن إذا تم تقديمها كسلسلة نصية
    let parsedAttributes = {};
    if (attributes) {
      if (typeof attributes === 'string') {
        try {
          parsedAttributes = JSON.parse(attributes);
        } catch (error) {
          console.error('خطأ في تحليل السمات:', error);
        }
      } else if (typeof attributes === 'object') {
        parsedAttributes = attributes;
      }
    }
    
    // إنشاء منتج جديد
    const product = new Product({
      name,
      description,
      price,
      category,
      subCategory,
      city,
      image,
      discount: discount || 0,
      storeId: store._id,
      attributes: parsedAttributes,
      status: store.status === 'approved' ? 'approved' : 'pending' // المنتجات تكون معتمدة تلقائيًا إذا كان المتجر معتمدًا
    });
    
    await product.save();
    
    res.status(201).json({
      success: true,
      data: product,
      message: product.status === 'approved' ? 'تمت إضافة المنتج بنجاح' : 'تمت إضافة المنتج بنجاح وهو قيد المراجعة'
    });
  } catch (error) {
    console.error('خطأ في إنشاء منتج:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء المنتج'
    });
  }
};

// الحصول على قائمة المنتجات
exports.getAllProducts = async (req, res) => {
  try {
    const { category, subCategory, city, storeId, status, minPrice, maxPrice, sortBy, limit, page } = req.query;
    
    // بناء شروط البحث
    const query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (subCategory) {
      query.subCategory = subCategory;
    }
    
    if (city) {
      query.city = city;
    }
    
    if (storeId) {
      query.storeId = storeId;
      
      // التحقق من صلاحيات المستخدم للمنتجات غير المعتمدة
      const store = await Store.findById(storeId);
      
      if (store) {
        // إذا كان المستخدم مسؤولاً أو مالك المتجر، يمكنه رؤية جميع المنتجات
        if (req.user && (req.user.role === 'admin' || req.user.id === store.owner.toString())) {
          if (status) {
            query.status = status;
          }
        } else {
          // المستخدمون العاديون يمكنهم رؤية المنتجات المعتمدة فقط
          query.status = 'approved';
        }
      } else {
        // إذا لم يتم العثور على المتجر، عرض المنتجات المعتمدة فقط
        query.status = 'approved';
      }
    } else {
      // إذا لم يتم تحديد معرف المتجر، عرض المنتجات المعتمدة فقط
      query.status = 'approved';
    }
    
    // تصفية حسب السعر
    if (minPrice || maxPrice) {
      query.price = {};
      
      if (minPrice) {
        query.price.$gte = parseFloat(minPrice);
      }
      
      if (maxPrice) {
        query.price.$lte = parseFloat(maxPrice);
      }
    }
    
    // إعداد خيارات الترتيب والتصفح
    const options = {
      sort: { createdAt: -1 }, // افتراضيًا، ترتيب حسب تاريخ الإنشاء (الأحدث أولاً)
      limit: parseInt(limit) || 10,
      skip: (parseInt(page) - 1) * (parseInt(limit) || 10) || 0,
      populate: {
        path: 'storeId',
        select: 'name type city'
      }
    };
    
    // تغيير الترتيب إذا تم تحديده
    if (sortBy) {
      if (sortBy === 'price_asc') {
        options.sort = { price: 1 };
      } else if (sortBy === 'price_desc') {
        options.sort = { price: -1 };
      } else if (sortBy === 'name_asc') {
        options.sort = { name: 1 };
      } else if (sortBy === 'name_desc') {
        options.sort = { name: -1 };
      } else if (sortBy === 'newest') {
        options.sort = { createdAt: -1 };
      } else if (sortBy === 'oldest') {
        options.sort = { createdAt: 1 };
      } else if (sortBy === 'popular') {
        options.sort = { sales: -1 };
      } else if (sortBy === 'discount') {
        options.sort = { discount: -1 };
      }
    }
    
    // الحصول على المنتجات مع التصفية
    const products = await Product.find(query)
      .sort(options.sort)
      .limit(options.limit)
      .skip(options.skip)
      .populate(options.populate);
    
    // الحصول على العدد الإجمالي للمنتجات
    const total = await Product.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: products,
      total,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      totalPages: Math.ceil(total / (parseInt(limit) || 10))
    });
  } catch (error) {
    console.error('خطأ في الحصول على قائمة المنتجات:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على قائمة المنتجات'
    });
  }
};

// الحصول على منتج محدد بواسطة المعرف
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({
        path: 'storeId',
        select: 'name type city contactPhone'
      });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }
    
    // التحقق من الصلاحيات للمنتجات غير المعتمدة
    if (product.status !== 'approved') {
      const store = await Store.findById(product.storeId);
      
      // فقط المالك أو المسؤول يمكنه رؤية المنتجات غير المعتمدة
      if (!(req.user && (req.user.role === 'admin' || (store && req.user.id === store.owner.toString())))) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بالوصول إلى هذا المنتج'
        });
      }
    }
    
    // زيادة عدد المشاهدات
    product.views += 1;
    await product.save();
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('خطأ في الحصول على معلومات المنتج:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على معلومات المنتج'
    });
  }
};

// تحديث منتج
exports.updateProduct = async (req, res) => {
  try {
    // التحقق من صحة البيانات
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    // البحث عن المنتج
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }
    
    // التحقق من صلاحيات المستخدم
    const store = await Store.findById(product.storeId);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود'
      });
    }
    
    if (req.user.role !== 'admin' && req.user.id !== store.owner.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث هذا المنتج'
      });
    }
    
    const { name, description, price, category, subCategory, city, discount, attributes } = req.body;
    
    // تحديث بيانات المنتج
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (category) product.category = category;
    if (subCategory) product.subCategory = subCategory;
    if (city) product.city = city;
    if (discount !== undefined) product.discount = discount;
    
    // تحديث السمات إذا تم تقديمها
    if (attributes) {
      let parsedAttributes = {};
      
      if (typeof attributes === 'string') {
        try {
          parsedAttributes = JSON.parse(attributes);
        } catch (error) {
          console.error('خطأ في تحليل السمات:', error);
        }
      } else if (typeof attributes === 'object') {
        parsedAttributes = attributes;
      }
      
      product.attributes = parsedAttributes;
    }
    
    // تحديث الصورة إذا تم رفعها
    if (req.file) {
      // حذف الصورة القديمة إذا كانت موجودة
      if (product.image) {
        const oldImagePath = path.join(__dirname, '../..', product.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      product.image = `/uploads/products/${req.file.filename}`;
    }
    
    // إعادة تعيين حالة المنتج إذا تم تحديث بيانات مهمة
    if (name || description || price || category) {
      product.status = store.status === 'approved' ? 'approved' : 'pending';
    }
    
    await product.save();
    
    res.status(200).json({
      success: true,
      data: product,
      message: 'تم تحديث المنتج بنجاح'
    });
  } catch (error) {
    console.error('خطأ في تحديث المنتج:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث المنتج'
    });
  }
};

// تحديث حالة المنتج (للمسؤول فقط)
exports.updateProductStatus = async (req, res) => {
  try {
    // التحقق من صلاحيات المسؤول
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث حالة المنتج'
      });
    }
    
    const { status } = req.body;
    
    // التحقق من صحة الحالة
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'حالة المنتج غير صالحة'
      });
    }
    
    // البحث عن المنتج وتحديثه
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product,
      message: 'تم تحديث حالة المنتج بنجاح'
    });
  } catch (error) {
    console.error('خطأ في تحديث حالة المنتج:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث حالة المنتج'
    });
  }
};

// حذف منتج
exports.deleteProduct = async (req, res) => {
  try {
    // البحث عن المنتج
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }
    
    // التحقق من صلاحيات المستخدم
    const store = await Store.findById(product.storeId);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود'
      });
    }
    
    if (req.user.role !== 'admin' && req.user.id !== store.owner.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف هذا المنتج'
      });
    }
    
    // حذف صورة المنتج إذا كانت موجودة
    if (product.image) {
      const imagePath = path.join(__dirname, '../..', product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // حذف المنتج
    await Product.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'تم حذف المنتج بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف المنتج:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف المنتج'
    });
  }
};

// تحديث ترتيب المنتجات
exports.updateProductsOrder = async (req, res) => {
  try {
    const { productsOrder } = req.body;
    
    if (!Array.isArray(productsOrder)) {
      return res.status(400).json({
        success: false,
        message: 'يجب توفير مصفوفة لترتيب المنتجات'
      });
    }
    
    // التحقق من صلاحيات المستخدم
    const firstProductId = productsOrder[0]?.id;
    if (!firstProductId) {
      return res.status(400).json({
        success: false,
        message: 'يجب توفير معرف المنتج وترتيبه'
      });
    }
    
    const firstProduct = await Product.findById(firstProductId);
    if (!firstProduct) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }
    
    const store = await Store.findById(firstProduct.storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود'
      });
    }
    
    if (req.user.role !== 'admin' && req.user.id !== store.owner.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث ترتيب المنتجات'
      });
    }
    
    // تحديث ترتيب المنتجات
    const updatePromises = productsOrder.map(item => {
      return Product.findByIdAndUpdate(
        item.id,
        { sortOrder: item.order },
        { new: true }
      );
    });
    
    await Promise.all(updatePromises);
    
    res.status(200).json({
      success: true,
      message: 'تم تحديث ترتيب المنتجات بنجاح'
    });
  } catch (error) {
    console.error('خطأ في تحديث ترتيب المنتجات:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث ترتيب المنتجات'
    });
  }
};
