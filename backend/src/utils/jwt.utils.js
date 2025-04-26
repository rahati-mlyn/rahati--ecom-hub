const jwt = require('jsonwebtoken');

// استخراج الرمز المميز من رأس الطلب
exports.extractToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

// إنشاء رمز JWT
exports.generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'rahati_secret_key',
    { expiresIn: '7d' }
  );
};

// التحقق من صحة الرمز المميز
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'rahati_secret_key');
  } catch (error) {
    return null;
  }
};

// تجديد الرمز المميز
exports.refreshToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'rahati_secret_key',
    { expiresIn: '7d' }
  );
};
