const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  subCategory: {
    type: String,
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
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  attributes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  sales: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// إضافة فهرس للبحث بالاسم والوصف
productSchema.index({ name: 'text', description: 'text' });

// إضافة فهرس للبحث حسب الفئة والمدينة
productSchema.index({ category: 1, city: 1 });

// إضافة فهرس للبحث حسب المتجر والحالة
productSchema.index({ storeId: 1, status: 1 });

// إضافة فهرس للبحث حسب السعر
productSchema.index({ price: 1 });

// إضافة فهرس للترتيب
productSchema.index({ sortOrder: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
