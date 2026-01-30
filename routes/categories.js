const express = require("express");
const router = express.Router();
const Category = require("../models/Category"); // Make sure file is models/Category.js
const { isAdmin } = require("../middleware/auth");

// ===========================
// GET ALL CATEGORIES
// ===========================
router.get("/", isAdmin, async (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    const categories = await Category.find({
      name: { $regex: searchQuery, $options: "i" }
    }).sort({ name: 1 });

    res.render("admin/categories", {
      categories,
      error: null,
      success: null,
      searchQuery
    });
  } catch (err) {
    console.error(err);
    res.render("admin/categories", {
      categories: [],
      error: "Failed to load categories",
      success: null
    });
  }
});

// ===========================
// GET NEW CATEGORY FORM
// ===========================
router.get("/new", isAdmin, (req, res) => {
  res.render("admin/categories/new", { error: null, success: null });
});

// ===========================
// POST CREATE NEW CATEGORY
// ===========================
router.post("/", isAdmin, async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.render("admin/categories/new", { error: "Category name is required", success: null });
  }

  try {
    const category = new Category({ name, description });
    await category.save();
    res.redirect("/admin/categories");
  } catch (err) {
    console.error(err);
    res.render("admin/categories/new", { error: "Failed to create category", success: null });
  }
});

// ===========================
// GET EDIT CATEGORY FORM
// ===========================
router.get("/:id/edit", isAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.redirect("/admin/categories");

    res.render("admin/categories/edit", { category, error: null });
  } catch (err) {
    console.error(err);
    res.redirect("/admin/categories");
  }
});

// ===========================
// PUT UPDATE CATEGORY
// ===========================
router.put("/:id", isAdmin, async (req, res) => {
  const { name, description } = req.body;
  try {
    await Category.findByIdAndUpdate(req.params.id, { name, description });
    res.redirect("/admin/categories");
  } catch (err) {
    console.error(err);
    res.render("admin/categories/edit", { category: { _id: req.params.id, name, description }, error: "Failed to update category" });
  }
});

// ===========================
// DELETE CATEGORY
// ===========================
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.redirect("/admin/categories");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/categories");
  }
});

// GET EDIT CATEGORY
router.get("/:id/edit", isAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.redirect("/admin/categories");
    }

    res.render("admin/categories/edit", {
      user: req.user,
      category,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.redirect("/admin/categories");
  }
});


// UPDATE CATEGORY
router.put("/:id", isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      const category = await Category.findById(req.params.id);
      return res.render("admin/categories/edit", {
        user: req.user,
        category,
        error: "Category name is required"
      });
    }

    await Category.findByIdAndUpdate(req.params.id, {
      name,
      description
    });

    res.redirect("/admin/categories");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/categories");
  }
});


module.exports = router;
