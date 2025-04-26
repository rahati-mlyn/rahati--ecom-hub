const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// استراتيجية JWT
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'rahati_secret_key'
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    // البحث عن المستخدم بناءً على معرف المستخدم في الرمز المميز
    const user = await User.findById(payload.id);
    
    if (user) {
      return done(null, user);
    }
    
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// استراتيجية Google OAuth (إذا كان مطلوبًا)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // البحث عن المستخدم بناءً على معرف Google
      let user = await User.findOne({ googleId: profile.id });
      
      // إذا لم يكن المستخدم موجودًا، قم بإنشاء مستخدم جديد
      if (!user) {
        user = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          // إنشاء كلمة مرور عشوائية للمستخدمين المسجلين عبر Google
          password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
        });
        
        await user.save();
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));
}

module.exports = passport;
