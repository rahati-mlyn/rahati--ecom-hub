const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['store', 'restaurant', 'realestate', 'car', 'clothes', 'electronics', 'homegoods'],
    required: true
  },
  contactPhone: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  subscriptionType: {
    type: String,
    enum: ['basic', 'limited', 'percentage'],
    default: 'basic'
  },
  subscriptionDetails: {
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: function() {
        // افتراضيًا، الاشتراك لمدة شهر واحد
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        return date;
      }
    },
    percentage: {
      type: Number,
      default: 0
    },
    maxProducts: {
      type: Number,
      default: 10
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  stats: {
    views: {
      today: { type: Number, default: 0 },
      thisWeek: { type: Number, default: 0 },
      thisMonth: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    orders: {
      pending: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    revenue: {
      today: { type: Number, default: 0 },
      thisWeek: { type: Number, default: 0 },
      thisMonth: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    }
  }
}, {
  timestamps: true
});

// إضافة فهرس للبحث بالاسم
storeSchema.index({ name: 'text' });

// إضافة فهرس للبحث حسب النوع والمدينة
storeSchema.index({ type: 1, city: 1 });

// إضافة فهرس للبحث حسب الحالة
storeSchema.index({ status: 1 });

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;
