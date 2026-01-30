const express = require("express");
const router = express.Router();
const { isAdmin } = require("../middleware/auth");
const Notification = require("../models/Notification");

// ============================
// GET /admin/notifications
// ============================
router.get("/", isAdmin, async (req, res) => {
  try {
    // Fetch all notifications, latest first
    const notifications = await Notification.find().sort({ createdAt: -1 }).lean();

    res.render("admin/notifications", {
      user: req.user,
      notifications,
      error: null,
      success: null
    });

  } catch (err) {
    console.error(err);
    res.render("admin/notifications", {
      user: req.user,
      notifications: [],
      error: "Failed to load notifications",
      success: null
    });
  }
});

// ============================
// POST /admin/notifications/:id/read
// ============================
router.post("/:id/read", isAdmin, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.redirect("/admin/notifications");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/notifications");
  }
});

// ============================
// POST /admin/notifications/mark-all-read
// ============================
router.post("/mark-all-read", isAdmin, async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { $set: { isRead: true } });
    res.redirect("/admin/notifications");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/notifications");
  }
});

// ============================
// POST /admin/notifications/clear
// ============================
router.post("/clear", isAdmin, async (req, res) => {
  try {
    await Notification.deleteMany({});
    res.redirect("/admin/notifications");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/notifications");
  }
});

module.exports = router;
