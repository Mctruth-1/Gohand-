// Authentication, session tokens, OTP verification, and age checks
const crypto = require('node:crypto');
const { db, hashPassword, calculateAge } = require('./db');

// In-memory sessions map: token -> { userId, expiresAt }
const activeSessions = new Map();

// In-memory OTP store: email/phone -> { code, expiresAt, type }
const otpStore = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createSession(userId) {
  const token = generateToken();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  activeSessions.set(token, { userId, expiresAt });
  return token;
}

function getSessionUser(token) {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId);
  if (!user || user.is_banned) return null;

  // Safe user object (omit password_hash)
  const { password_hash, ...safeUser } = user;
  safeUser.age = calculateAge(user.birthdate);
  safeUser.photos = JSON.parse(user.photos || '[]');
  safeUser.interests = JSON.parse(user.interests || '[]');
  safeUser.languages = JSON.parse(user.languages || '[]');
  return safeUser;
}

function destroySession(token) {
  activeSessions.delete(token);
}

function validateAge18(birthdate) {
  const age = calculateAge(birthdate);
  return age >= 18;
}

function requestEmailOTP(email) {
  const code = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  otpStore.set(`email:${email}`, { code, expiresAt });
  console.log(`[PEACE Auth] Email OTP for ${email}: ${code}`);
  return code;
}

function verifyEmailOTP(email, code) {
  const record = otpStore.get(`email:${email}`);
  if (!record) return { success: false, message: 'No OTP requested or OTP expired' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(`email:${email}`);
    return { success: false, message: 'OTP has expired' };
  }
  if (record.code !== code.trim()) {
    return { success: false, message: 'Invalid verification code' };
  }
  otpStore.delete(`email:${email}`);
  return { success: true };
}

function requestPhoneOTP(phone) {
  const code = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  otpStore.set(`phone:${phone}`, { code, expiresAt });
  console.log(`[PEACE Auth] Phone OTP for ${phone}: ${code}`);
  return code;
}

function verifyPhoneOTP(phone, code) {
  const record = otpStore.get(`phone:${phone}`);
  if (!record) return { success: false, message: 'No OTP requested or expired' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(`phone:${phone}`);
    return { success: false, message: 'OTP has expired' };
  }
  if (record.code !== code.trim()) {
    return { success: false, message: 'Invalid SMS code' };
  }
  otpStore.delete(`phone:${phone}`);
  return { success: true };
}

module.exports = {
  activeSessions,
  createSession,
  getSessionUser,
  destroySession,
  validateAge18,
  requestEmailOTP,
  verifyEmailOTP,
  requestPhoneOTP,
  verifyPhoneOTP
};
