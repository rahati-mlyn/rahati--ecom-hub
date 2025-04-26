const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'الرجاء إدخال بريد إلكتروني صحيح']
  },
  phone: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'store_owner'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: ''
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    default: null
  },
  googleId: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// إضافة فهرس مركب للتأكد من أن المستخدم لديه إما بريد إلكتروني أو رقم هاتف
userSchema.index({ 
  email: 1 
}, { 
  unique: true, 
  partialFilterExpression: { email: { $type: 'string' } } 
});

userSchema.index({ 
  phone: 1 
}, { 
  unique: true, 
  partialFilterExpression: { phone: { $type: 'string' } } 
});

// تشفير كلمة المرور قبل الحفظ
userSchema.pre('save', async function(next) {
  const user = this;
  
  // تشفير كلمة المرور فقط إذا تم تعديلها أو إنشاء مستخدم جديد
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
  
  next();
});

// إضافة طريقة للتحقق من كلمة المرور
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// إضافة طريقة لإنشاء كائن آمن للإرسال (بدون كلمة المرور)
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
