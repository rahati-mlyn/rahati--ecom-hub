const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  items: [{
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    }
  }],
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'shipping', 'delivered', 'rejected'],
    default: 'pending'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shippingAddress: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    postalCode: {
      type: String
    },
    country: {
      type: String,
      default: 'المملكة العربية السعودية'
    }
  },
  paymentMethod: {
    type: String,
    enum: ['cash'],
    default: 'cash'
  },
  trackingInfo: {
    trackingNumber: {
      type: String
    },
    estimatedDelivery: {
      type: Date
    },
    lastUpdate: {
      type: Date,
      default: Date.now
    }
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'preparing', 'shipping', 'delivered', 'rejected']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    message: {
      type: String
    }
  }],
  rejectionReason: {
    type: String
  },
  inquiryMessage: {
    type: String
  },
  inquiryResponse: {
    type: String
  }
}, {
  timestamps: true
});

// إضافة فهرس للبحث حسب المستخدم
orderSchema.index({ userId: 1 });

// إضافة فهرس للبحث حسب المتجر (من خلال العناصر)
orderSchema.index({ 'items.storeId': 1 });

// إضافة فهرس للبحث حسب الحالة
orderSchema.index({ status: 1 });

// إضافة فهرس للبحث حسب تاريخ الطلب
orderSchema.index({ orderDate: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
