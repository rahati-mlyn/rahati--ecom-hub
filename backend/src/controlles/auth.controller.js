const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// إنشاء رمز JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'rahati_secret_key',
    { expiresIn: '7d' }
  );
};

// تسجيل المستخدم
exports.register = async (req, res) => {
  try {
    // التحقق من صحة البيانات
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, phone, password } = req.body;

    // التحقق من عدم وجود مستخدم بنفس البريد الإلكتروني أو رقم الهاتف
    let existingUser;
    if (email) {
      existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مستخدم بالفعل'
        });
      }
    }

    if (phone) {
      existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'رقم الهاتف مستخدم بالفعل'
        });
      }
    }

    // إنشاء مستخدم جديد
    const user = new User({
      name,
      email,
      phone,
      password,
      role: 'user'
    });

    await user.save();

    // إنشاء رمز JWT
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: user.toJSON(),
      message: 'تم تسجيل المستخدم بنجاح'
    });
  } catch (error) {
    console.error('خطأ في تسجيل المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل المستخدم'
    });
  }
};

// تسجيل الدخول
exports.login = async (req, res) => {
  try {
    // التحقق من صحة البيانات
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone, email, password } = req.body;

    // البحث عن المستخدم بواسطة البريد الإلكتروني أو رقم الهاتف
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (phone) {
      user = await User.findOne({ phone });
    } else {
      return res.status(400).json({
        success: false,
        message: 'يجب توفير البريد الإلكتروني أو رقم الهاتف'
      });
    }

    // التحقق من وجود المستخدم
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الاعتماد غير صحيحة'
      });
    }

    // التحقق من كلمة المرور
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الاعتماد غير صحيحة'
      });
    }

    // تحديث آخر تسجيل دخول
    user.lastLogin = Date.now();
    await user.save();

    // إنشاء رمز JWT
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      token,
      user: user.toJSON(),
      message: 'تم تسجيل الدخول بنجاح'
    });
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدخول'
    });
  }
};

// الحصول على معلومات المستخدم الحالي
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    res.status(200).json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('خطأ في الحصول على معلومات المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على معلومات المستخدم'
    });
  }
};

// تسجيل الخروج (لا يتطلب عملية خاصة في الخادم، يتم التعامل معه في العميل)
exports.logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'تم تسجيل الخروج بنجاح'
  });
};

// مسار استجابة Google OAuth
exports.googleCallback = (req, res) => {
  // إنشاء رمز JWT للمستخدم المصادق عليه من Google
  const token = generateToken(req.user);
  
  // إعادة توجيه المستخدم إلى الصفحة الرئيسية مع الرمز المميز
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?token=${token}`);
};
