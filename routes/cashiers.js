const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const { isAdmin } = require("../middleware/auth");

/**
 * GET – View all cashiers
 */
router.get("/", isAdmin, async (req, res) => {
  try {
    const cashiers = await User.find({ role: "cashier" });

    res.render("admin/cashiers", {
      cashiers,
      error: null,
      success: null
    });
  } catch (err) {
    res.render("admin/cashiers", {
      cashiers: [],
      error: "Failed to load cashiers",
      success: null
    });
  }
});

/**
 * GET – New cashier form
 */
router.get("/new", isAdmin, (req, res) => {
  res.render("admin/cashiers/new", {
    error: null
  });
});

/**
 * POST – Create cashier
 */
router.post("/", isAdmin, async (req, res) => {
  try {
    const { name, username, password, email } = req.body;

    if (!name || !username || !password) {
      return res.render("admin/cashiers/new", {
        error: "All required fields must be filled"
      });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.render("admin/cashiers/new", {
        error: "Username already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      role: "cashier"
    });

    res.redirect("/admin/cashiers");
  } catch (err) {
    console.error(err);
    res.render("admin/cashiers/new", {
      error: "Failed to create cashier"
    });
  }
});

/**
 * GET – Edit cashier
 */
router.get("/:id/edit", isAdmin, async (req, res) => {
  const cashier = await User.findById(req.params.id);

  if (!cashier) {
    return res.redirect("/admin/cashiers");
  }

  res.render("admin/cashiers/edit", {
    cashier,
    error: null
  });
});

/**
 * PUT – Update cashier
 */
router.put("/:id", isAdmin, async (req, res) => {
  try {
    const { name, email, isActive } = req.body;

    await User.findByIdAndUpdate(req.params.id, {
      name,
      email,
      isActive: isActive === "on"
    });

    res.redirect("/admin/cashiers");
  } catch (err) {
    res.redirect("/admin/cashiers");
  }
});

/**
 * DELETE – Remove cashier
 */
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect("/admin/cashiers");
  } catch (err) {
    res.redirect("/admin/cashiers");
  }
});

module.exports = router;
