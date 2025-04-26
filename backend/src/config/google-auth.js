require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { generateToken } = require('../utils/jwt.utils');

// تكوين استراتيجية Google OAuth
const setupGoogleStrategy = () => {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/api/auth/google/callback',
          scope: ['profile', 'email']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // البحث عن المستخدم بواسطة معرف Google
            let user = await User.findOne({ googleId: profile.id });
            
            // إذا لم يكن المستخدم موجودًا، قم بإنشاء مستخدم جديد
            if (!user) {
              // التحقق من وجود مستخدم بنفس البريد الإلكتروني
              const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
              
              if (email) {
                user = await User.findOne({ email });
                
                if (user) {
                  // تحديث معرف Google للمستخدم الموجود
                  user.googleId = profile.id;
                  await user.save();
                }
              }
              
              // إنشاء مستخدم جديد إذا لم يكن موجودًا
              if (!user) {
                user = new User({
                  name: profile.displayName,
                  email: email,
                  googleId: profile.id,
                  // إنشاء كلمة مرور عشوائية للمستخدمين المسجلين عبر Google
                  password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8),
                  avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : ''
                });
                
                await user.save();
              }
            }
            
            // تحديث آخر تسجيل دخول
            user.lastLogin = Date.now();
            await user.save();
            
            return done(null, user);
          } catch (error) {
            return done(error, false);
          }
        }
      )
    );
  }
};

// معالج استجابة Google OAuth
exports.googleAuthCallback = async (req, res) => {
  try {
    // إنشاء رمز JWT للمستخدم المصادق عليه من Google
    const token = generateToken(req.user);
    
    // إعادة توجيه المستخدم إلى الصفحة الرئيسية مع الرمز المميز
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?token=${token}`);
  } catch (error) {
    console.error('خطأ في معالجة استجابة Google OAuth:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
  }
};

// تصدير دالة الإعداد
exports.setupGoogleStrategy = setupGoogleStrategy;
