const mongoose = require('mongoose');

const statSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  views: {
    type: Number,
    default: 0
  },
  visitors: {
    type: Number,
    default: 0
  },
  logins: {
    type: Number,
    default: 0
  },
  orders: {
    count: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  topProducts: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: {
      type: String
    },
    sales: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

// إضافة فهرس مركب للمتجر والتاريخ
statSchema.index({ storeId: 1, date: -1 });

const Stat = mongoose.model('Stat', statSchema);

module.exports = Stat;
