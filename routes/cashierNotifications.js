const express = require("express");
const router = express.Router();
const { isCashier } = require("../middleware/auth"); // make sure you have a cashier auth middleware
const Notification = require("../models/Notification");

// ============================
// GET /cashier/notifications
// ============================
router.get("/", isCashier, async (req, res) => {
  try {
    const notifications = await Notification.find({ cashier: req.user._id })
      .sort({ createdAt: -1 });

    res.render("cashier/notifications", {
      user: req.user,
      notifications
    });
  } catch (err) {
    console.error(err);
    res.render("cashier/notifications", {
      user: req.user,
      notifications: [],
      error: "Failed to load notifications"
    });
  }
});

// ============================
// POST /cashier/notifications/:id/read
// ============================
router.post("/:id/read", isCashier, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.redirect("/cashier/notifications");
  } catch (err) {
    console.error(err);
    res.redirect("/cashier/notifications");
  }
});

// ============================
// POST /cashier/notifications/mark-all-read
// ============================
router.post("/mark-all-read", isCashier, async (req, res) => {
  try {
    await Notification.updateMany(
      { cashier: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    res.redirect("/cashier/notifications");
  } catch (err) {
    console.error(err);
    res.redirect("/cashier/notifications");
  }
});

// ============================
// POST /cashier/notifications/clear
// ============================
router.post("/clear", isCashier, async (req, res) => {
  try {
    await Notification.deleteMany({ cashier: req.user._id });
    res.redirect("/cashier/notifications");
  } catch (err) {
    console.error(err);
    res.redirect("/cashier/notifications");
  }
});

module.exports = router;
