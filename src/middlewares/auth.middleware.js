export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  // API clients get JSON response
  if (req.accepts('json')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Please login to access this resource'
    });
  }

  // Web users get redirected
  return res.redirect('/auth/account/google/login');
};

// For API-only protection
export const apiAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication credentials'
    });
  }
  next();
};