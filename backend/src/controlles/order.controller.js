const Order = require('../models/Order');
const Product = require('../models/Product');
const Store = require('../models/Store');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// إنشاء طلب جديد
exports.createOrder = async (req, res) => {
  try {
    // التحقق من صحة البيانات
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { items, total, shippingAddress, paymentMethod } = req.body;
    
    // التحقق من وجود العناصر
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يجب توفير عناصر الطلب'
      });
    }
    
    // حساب المجموع الفرعي لكل عنصر والتحقق من وجود المنتجات
    const orderItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `المنتج غير موجود: ${item.id}`
        });
      }
      
      // التحقق من حالة المنتج
      if (product.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: `المنتج غير متاح للطلب: ${product.name}`
        });
      }
      
      // حساب المجموع الفرعي
      const subtotal = product.price * item.quantity;
      
      orderItems.push({
        id: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal,
        storeId: product.storeId
      });
      
      // تحديث عدد المبيعات للمنتج
      product.sales += item.quantity;
      await product.save();
    }
    
    // إنشاء طلب جديد
    const order = new Order({
      items: orderItems,
      total,
      userId: req.user.id,
      shippingAddress,
      paymentMethod: paymentMethod || 'cash',
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(),
          message: 'تم استلام الطلب'
        }
      ]
    });
    
    await order.save();
    
    // تحديث إحصائيات المتاجر
    const storeIds = [...new Set(orderItems.map(item => item.storeId.toString()))];
    
    for (const storeId of storeIds) {
      const store = await Store.findById(storeId);
      
      if (store) {
        store.stats.orders.pending += 1;
        store.stats.orders.total += 1;
        await store.save();
      }
    }
    
    res.status(201).json({
      success: true,
      data: order,
      message: 'تم إنشاء الطلب بنجاح'
    });
  } catch (error) {
    console.error('خطأ في إنشاء طلب:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الطلب'
    });
  }
};

// الحصول على قائمة الطلبات للمستخدم الحالي
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .sort({ orderDate: -1 });
    
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('خطأ في الحصول على قائمة الطلبات:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على قائمة الطلبات'
    });
  }
};

// الحصول على قائمة الطلبات لمتجر محدد
exports.getStoreOrders = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { status } = req.query;
    
    // التحقق من وجود المتجر وصلاحيات المستخدم
    const store = await Store.findById(storeId);
    
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
        message: 'غير مصرح لك بالوصول إلى طلبات هذا المتجر'
      });
    }
    
    // بناء شروط البحث
    const query = { 'items.storeId': storeId };
    
    if (status) {
      query.status = status;
    }
    
    // الحصول على الطلبات
    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .populate('userId', 'name email phone');
    
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('خطأ في الحصول على قائمة طلبات المتجر:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على قائمة طلبات المتجر'
    });
  }
};

// الحصول على طلب محدد بواسطة المعرف
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود'
      });
    }
    
    // التحقق من الصلاحيات
    if (req.user.role !== 'admin' && req.user.id !== order.userId.toString()) {
      // التحقق مما إذا كان المستخدم هو مالك أحد المتاجر في الطلب
      const storeIds = [...new Set(order.items.map(item => item.storeId.toString()))];
      let isStoreOwner = false;
      
      for (const storeId of storeIds) {
        const store = await Store.findById(storeId);
        
        if (store && req.user.id === store.owner.toString()) {
          isStoreOwner = true;
          break;
        }
      }
      
      if (!isStoreOwner) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بالوصول إلى هذا الطلب'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('خطأ في الحصول على معلومات الطلب:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على معلومات الطلب'
    });
  }
};

// تحديث حالة الطلب
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, message } = req.body;
    
    // التحقق من صحة الحالة
    if (!['pending', 'preparing', 'shipping', 'delivered', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'حالة الطلب غير صالحة'
      });
    }
    
    // البحث عن الطلب
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود'
      });
    }
    
    // التحقق من الصلاحيات
    const storeIds = [...new Set(order.items.map(item => item.storeId.toString()))];
    let isAuthorized = req.user.role === 'admin';
    
    if (!isAuthorized) {
      for (const storeId of storeIds) {
        const store = await Store.findById(storeId);
        
        if (store && req.user.id === store.owner.toString()) {
          isAuthorized = true;
          break;
        }
      }
    }
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث حالة هذا الطلب'
      });
    }
    
    // تحديث حالة الطلب
    order.status = status;
    
    // إضافة سجل الحالة
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      message: message || `تم تحديث حالة الطلب إلى ${status}`
    });
    
    // إضافة سبب الرفض إذا كانت الحالة مرفوضة
    if (status === 'rejected') {
      order.rejectionReason = message || 'تم رفض الطلب';
    }
    
    // تحديث معلومات التتبع إذا كانت الحالة قيد الشحن
    if (status === 'shipping') {
      order.trackingInfo = {
        lastUpdate: new Date(),
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // تقدير موعد التسليم بعد يومين
      };
    }
    
    await order.save();
    
    // تحديث إحصائيات المتاجر
    for (const storeId of storeIds) {
      const store = await Store.findById(storeId);
      
      if (store) {
        if (status === 'delivered') {
          store.stats.orders.pending -= 1;
          store.stats.orders.completed += 1;
          
          // حساب الإيرادات
          const storeItems = order.items.filter(item => item.storeId.toString() === storeId);
          const storeRevenue = storeItems.reduce((total, item) => total + item.subtotal, 0);
          
          store.stats.revenue.today += storeRevenue;
          store.stats.revenue.thisWeek += storeRevenue;
          store.stats.revenue.thisMonth += storeRevenue;
          store.stats.revenue.total += storeRevenue;
        } else if (status === 'rejected' && order.status === 'pending') {
          store.stats.orders.pending -= 1;
        }
        
        await store.save();
      }
    }
    
    res.status(200).json({
      success: true,
      data: order,
      message: 'تم تحديث حالة الطلب بنجاح'
    });
  } catch (error) {
    console.error('خطأ في تحديث حالة الطلب:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث حالة الطلب'
    });
  }
};

// إضافة استفسار للطلب
exports.addOrderInquiry = async (req, res) => {
  try {
    const { inquiryMessage } = req.body;
    
    if (!inquiryMessage) {
      return res.status(400).json({
        success: false,
        message: 'يجب توفير رسالة الاستفسار'
      });
    }
    
    // البحث عن الطلب
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود'
      });
    }
    
    // التحقق من أن المستخدم هو صاحب الطلب
    if (req.user.id !== order.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بإضافة استفسار لهذا الطلب'
      });
    }
    
    // إضافة الاستفسار
    order.inquiryMessage = inquiryMessage;
    await order.save();
    
    res.status(200).json({
      success: true,
      data: order,
      message: 'تم إضافة الاستفسار بنجاح'
    });
  } catch (error) {
    console.error('خطأ في إضافة استفسار للطلب:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إضافة استفسار للطلب'
    });
  }
};

// إضافة رد على استفسار الطلب
exports.addOrderInquiryResponse = async (req, res) => {
  try {
    const { inquiryResponse } = req.body;
    
    if (!inquiryResponse) {
      return res.status(400).json({
        success: false,
        message: 'يجب توفير رد على الاستفسار'
      });
    }
    
    // البحث عن الطلب
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود'
      });
    }
    
    // التحقق من وجود استفسار
    if (!order.inquiryMessage) {
      return res.status(400).json({
        success: false,
        message: 'لا يوجد استفسار للرد عليه'
      });
    }
    
    // التحقق من الصلاحيات
    const storeIds = [...new Set(order.items.map(item => item.storeId.toString()))];
    let isAuthorized = req.user.role === 'admin';
    
    if (!isAuthorized) {
      for (const storeId of storeIds) {
        const store = await Store.findById(storeId);
        
        if (store && req.user.id === store.owner.toString()) {
          isAuthorized = true;
          break;
        }
      }
    }
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالرد على استفسار هذا الطلب'
      });
    }
    
    // إضافة الرد
    order.inquiryResponse = inquiryResponse;
    await order.save();
    
    res.status(200).json({
      success: true,
      data: order,
      message: 'تم إضافة الرد على الاستفسار بنجاح'
    });
  } catch (error) {
    console.error('خطأ في إضافة رد على استفسار الطلب:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إضافة رد على استفسار الطلب'
    });
  }
};
