const express = require("express");
const router = express.Router();
const { isAdmin } = require("../middleware/auth");
const multer = require("multer");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");

// Assuming you have a Settings model
const Settings = require("../models/settings");
const User = require("../models/user");

// ------------------
// Multer config for logo upload
// ------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, "logo_" + uniqueSuffix);
  }
});
const upload = multer({ storage });

// ------------------
// GET SETTINGS DASHBOARD
// ------------------
router.get("/", isAdmin, async (req, res) => {
  try {
    let settings = await Settings.findOne() || {};
    res.render("admin/settings", { 
      user: req.user, 
      settings, 
      error: null, 
      success: null 
    });
  } catch (err) {
    console.error(err);
    res.render("admin/settings", { 
      user: req.user, 
      settings: {}, 
      error: "Failed to load settings", 
      success: null 
    });
  }
});

// ------------------
// UPDATE STORE INFO
// ------------------
router.post("/store", isAdmin, upload.single("storeLogo"), async (req, res) => {
  try {
    const { storeName, storeAddress, storeEmail, storePhone } = req.body;
    let settings = await Settings.findOne() || new Settings();

    settings.storeName = storeName;
    settings.storeAddress = storeAddress;
    settings.storeEmail = storeEmail;
    settings.storePhone = storePhone;

    if (req.file) {
      settings.storeLogo = req.file.filename;
    }

    await settings.save();
    res.redirect("/admin/settings");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/settings");
  }
});

// ------------------
// UPDATE TAX & CURRENCY
// ------------------
router.post("/tax", isAdmin, async (req, res) => {
  try {
    const { taxRate, currency } = req.body;
    let settings = await Settings.findOne() || new Settings();
    settings.taxRate = taxRate;
    settings.currency = currency;
    await settings.save();
    res.redirect("/admin/settings");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/settings");
  }
});

// ------------------
// UPDATE NOTIFICATIONS
// ------------------
router.post("/notifications", isAdmin, async (req, res) => {
  try {
    const { emailNotifications, smsNotifications } = req.body;
    let settings = await Settings.findOne() || new Settings();
    settings.emailNotifications = !!emailNotifications;
    settings.smsNotifications = !!smsNotifications;
    await settings.save();
    res.redirect("/admin/settings");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/settings");
  }
});

// ------------------
// UPDATE THEME
// ------------------
router.post("/theme", isAdmin, async (req, res) => {
  try {
    const { theme } = req.body;
    let settings = await Settings.findOne() || new Settings();
    settings.theme = theme;
    await settings.save();
    res.redirect("/admin/settings");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/settings");
  }
});

// ------------------
// CHANGE ADMIN PASSWORD
//// ------------------
// CHANGE ADMIN PASSWORD (FIXED)
// ------------------
router.post("/password", isAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const settings = await Settings.findOne();

    if (newPassword !== confirmPassword) {
      return res.render("admin/settings", {
        user: req.user,
        settings,
        error: "Passwords do not match",
        success: null
      });
    }

    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.render("admin/settings", {
        user: req.user,
        settings,
        error: "Current password is incorrect",
        success: null
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ✅ Update password ONLY (no name validation)
    await User.findByIdAndUpdate(
      req.user._id,
      { password: hashedPassword },
      { runValidators: false }
    );

    return res.render("admin/settings", {
      user: req.user,
      settings,
      success: "Password updated successfully",
      error: null
    });

  } catch (err) {
    console.error(err);
    res.redirect("/admin/settings");
  }
});

module.exports = router;
