const express = require("express");
const passport = require("passport");
const router = express.Router();


// LOGIN PAGE
router.get("/", (req, res) => {
  res.render("login", { error: req.flash("error") });
});

// Login page
router.get("/login", (req, res) => {
  res.render("login", { error: req.flash("error") });
});

// Login POST
router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true
  }),
  (req, res) => {
    if (req.user.role === "admin") return res.redirect("/admin/dashboard");
    return res.redirect("/cashier/sales");
  }
);

// Logout
router.get("/logout", (req, res) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect("/login");
  });
});

module.exports = router;
