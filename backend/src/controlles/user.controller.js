const User = require('../models/User');
const { validationResult } = require('express-validator');

// الحصول على قائمة المستخدمين (للمسؤول فقط)
exports.getAllUsers = async (req, res) => {
  try {
    // التحقق من صلاحيات المسؤول
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى هذا المورد'
      });
    }

    const users = await User.find().select('-password');

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('خطأ في الحصول على قائمة المستخدمين:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على قائمة المستخدمين'
    });
  }
};

// الحصول على مستخدم محدد بواسطة المعرف
exports.getUserById = async (req, res) => {
  try {
    // التحقق من صلاحيات المسؤول أو المستخدم نفسه
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى هذا المورد'
      });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('خطأ في الحصول على معلومات المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على معلومات المستخدم'
    });
  }
};

// تحديث معلومات المستخدم
exports.updateUser = async (req, res) => {
  try {
    // التحقق من صحة البيانات
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // التحقق من صلاحيات المسؤول أو المستخدم نفسه
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث هذا المستخدم'
      });
    }

    const { name, email, phone, avatar } = req.body;

    // التحقق من عدم وجود مستخدم آخر بنفس البريد الإلكتروني أو رقم الهاتف
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مستخدم بالفعل'
        });
      }
    }

    if (phone) {
      const existingUser = await User.findOne({ phone, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'رقم الهاتف مستخدم بالفعل'
        });
      }
    }

    // تحديث المستخدم
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, avatar },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'تم تحديث معلومات المستخدم بنجاح'
    });
  } catch (error) {
    console.error('خطأ في تحديث معلومات المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث معلومات المستخدم'
    });
  }
};

// تغيير كلمة المرور
exports.changePassword = async (req, res) => {
  try {
    // التحقق من صحة البيانات
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // التحقق من صلاحيات المستخدم نفسه
    if (req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتغيير كلمة المرور لهذا المستخدم'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // الحصول على المستخدم
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // التحقق من كلمة المرور الحالية
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // تحديث كلمة المرور
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });
  } catch (error) {
    console.error('خطأ في تغيير كلمة المرور:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تغيير كلمة المرور'
    });
  }
};

// حذف مستخدم
exports.deleteUser = async (req, res) => {
  try {
    // التحقق من صلاحيات المسؤول أو المستخدم نفسه
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف هذا المستخدم'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    res.status(200).json({
      success: true,
      message: 'تم حذف المستخدم بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف المستخدم'
    });
  }
};
