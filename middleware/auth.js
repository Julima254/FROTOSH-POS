// middleware/auth.js

// Check if user is Cashier
module.exports.isCashier = (req, res, next) => {
  if (req.user && req.user.role === 'cashier') {
    return next();
  }
  res.redirect('/login'); // or 403 forbidden
};


// Check if user is admin
module.exports.isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === "admin") return next();
  return res.redirect("/login");
};
