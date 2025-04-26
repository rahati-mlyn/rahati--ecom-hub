const Stat = require('../models/Stat');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Order = require('../models/Order');

// الحصول على إحصائيات متجر محدد
exports.getStoreStats = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { period } = req.query;
    
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
        message: 'غير مصرح لك بالوصول إلى إحصائيات هذا المتجر'
      });
    }
    
    // تحديد فترة الإحصائيات
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    } else if (period === 'all') {
      startDate = new Date(0); // بداية الزمن
    }
    
    // الحصول على إحصائيات المتجر
    const stats = await Stat.find({
      storeId,
      date: { $gte: startDate }
    }).sort({ date: 1 });
    
    // الحصول على المنتجات الأكثر مبيعًا
    const topProducts = await Product.find({ storeId })
      .sort({ sales: -1 })
      .limit(5)
      .select('name sales');
    
    // الحصول على عدد الطلبات حسب الحالة
    const pendingOrders = await Order.countDocuments({
      'items.storeId': storeId,
      status: 'pending'
    });
    
    const preparingOrders = await Order.countDocuments({
      'items.storeId': storeId,
      status: 'preparing'
    });
    
    const shippingOrders = await Order.countDocuments({
      'items.storeId': storeId,
      status: 'shipping'
    });
    
    const deliveredOrders = await Order.countDocuments({
      'items.storeId': storeId,
      status: 'delivered'
    });
    
    const rejectedOrders = await Order.countDocuments({
      'items.storeId': storeId,
      status: 'rejected'
    });
    
    // حساب إجمالي المشاهدات والزوار
    const totalViews = stats.reduce((sum, stat) => sum + stat.views, 0);
    const totalVisitors = stats.reduce((sum, stat) => sum + stat.visitors, 0);
    
    // إنشاء كائن الإحصائيات
    const statsResponse = {
      views: {
        today: store.stats.views.today,
        thisWeek: store.stats.views.thisWeek,
        thisMonth: store.stats.views.thisMonth,
        total: store.stats.views.total
      },
      orders: {
        pending: pendingOrders,
        preparing: preparingOrders,
        shipping: shippingOrders,
        delivered: deliveredOrders,
        rejected: rejectedOrders,
        total: pendingOrders + preparingOrders + shippingOrders + deliveredOrders + rejectedOrders
      },
      revenue: {
        today: store.stats.revenue.today,
        thisWeek: store.stats.revenue.thisWeek,
        thisMonth: store.stats.revenue.thisMonth,
        total: store.stats.revenue.total
      },
      topProducts: topProducts.map(product => ({
        id: product._id,
        name: product.name,
        sales: product.sales
      })),
      visitors: {
        total: totalVisitors
      }
    };
    
    res.status(200).json({
      success: true,
      data: statsResponse
    });
  } catch (error) {
    console.error('خطأ في الحصول على إحصائيات المتجر:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على إحصائيات المتجر'
    });
  }
};

// تسجيل زيارة جديدة
exports.recordVisit = async (req, res) => {
  try {
    const { storeId } = req.params;
    
    // التحقق من وجود المتجر
    const store = await Store.findById(storeId);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود'
      });
    }
    
    // تحديث إحصائيات المتجر
    store.stats.views.today += 1;
    store.stats.views.thisWeek += 1;
    store.stats.views.thisMonth += 1;
    store.stats.views.total += 1;
    await store.save();
    
    // تسجيل الزيارة في الإحصائيات
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let stat = await Stat.findOne({
      storeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    if (!stat) {
      stat = new Stat({
        storeId,
        date: new Date(),
        views: 1,
        visitors: 1
      });
    } else {
      stat.views += 1;
      stat.visitors += 1;
    }
    
    await stat.save();
    
    res.status(200).json({
      success: true,
      message: 'تم تسجيل الزيارة بنجاح'
    });
  } catch (error) {
    console.error('خطأ في تسجيل الزيارة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الزيارة'
    });
  }
};

// الحصول على إحصائيات النظام (للمسؤول فقط)
exports.getSystemStats = async (req, res) => {
  try {
    // التحقق من صلاحيات المسؤول
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى إحصائيات النظام'
      });
    }
    
    // الحصول على عدد المتاجر حسب النوع
    const storesByType = await Store.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // الحصول على عدد المتاجر حسب الحالة
    const storesByStatus = await Store.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // الحصول على عدد المنتجات حسب الفئة
    const productsByCategory = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // الحصول على عدد الطلبات حسب الحالة
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // الحصول على إجمالي الإيرادات
    const totalRevenue = await Order.aggregate([
      {
        $match: { status: 'delivered' }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);
    
    // إنشاء كائن الإحصائيات
    const statsResponse = {
      stores: {
        byType: storesByType.reduce((obj, item) => {
          obj[item._id] = item.count;
          return obj;
        }, {}),
        byStatus: storesByStatus.reduce((obj, item) => {
          obj[item._id] = item.count;
          return obj;
        }, {}),
        total: await Store.countDocuments()
      },
      products: {
        byCategory: productsByCategory.reduce((obj, item) => {
          obj[item._id] = item.count;
          return obj;
        }, {}),
        total: await Product.countDocuments()
      },
      orders: {
        byStatus: ordersByStatus.reduce((obj, item) => {
          obj[item._id] = item.count;
          return obj;
        }, {}),
        total: await Order.countDocuments()
      },
      revenue: {
        total: totalRevenue.length > 0 ? totalRevenue[0].total : 0
      }
    };
    
    res.status(200).json({
      success: true,
      data: statsResponse
    });
  } catch (error) {
    console.error('خطأ في الحصول على إحصائيات النظام:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على إحصائيات النظام'
    });
  }
};
