const requireRole = (...roles) => (req, res, next) => {
  console.log('=== ROLE CHECK ===');
  console.log('URL:', req.method, req.originalUrl);
  console.log('Required roles:', roles);
  console.log('Session exists?', !!req.session);
  console.log('Session user:', req.session ? req.session.user : 'NO SESSION');
  console.log('==================');

  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }
  if (!roles.includes(req.session.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to do that.' });
  }
  next();
};

module.exports = { requireRole };