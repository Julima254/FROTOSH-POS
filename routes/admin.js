const express = require('express');
const multer = require("multer");
const path = require("path");
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const fs = require('fs');
const User = require('../models/user');





// IMPORT MODELS
const Product = require('../models/Product');
const Category = require('../models/Category');

// ✅ Correct: use router, not app
router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // --- Fetch today's completed transactions ---
    const todayTransactions = await Transaction.find({
      createdAt: { $gte: today, $lte: endOfToday },
      status: 'Completed'
    })
      .populate('items.product', 'name')
      .populate('cashier', 'username')
      .lean();

    // --- Total Sales Today ---
    const totalSalesToday = todayTransactions.reduce(
      (sum, tx) => sum + (tx.totalAmount || 0),
      0
    );

    // --- Revenue This Month ---
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const revenueMonthAgg = await Transaction.aggregate([
      { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth }, status: 'Completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const revenueMonth = revenueMonthAgg[0]?.totalRevenue || 0;

    // --- Total Products ---
    const totalProducts = await Product.countDocuments();

    // --- Low Stock Items ---
    const lowStock = await Product.countDocuments({ $expr: { $lte: ['$quantity', '$minStock'] } });

    // --- Total Cashiers ---
    const totalCashiers = await User.countDocuments({ role: 'cashier' });

    // --- Sales Trend (hourly) ---
    const salesTrend = { labels: [], data: [] };
    for (let h = 0; h < 24; h++) {
      const start = new Date(today);
      start.setHours(h);
      const end = new Date(today);
      end.setHours(h + 1);

      const hourlyTotal = todayTransactions
        .filter(tx => tx.createdAt >= start && tx.createdAt < end)
        .reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);

      salesTrend.labels.push(`${h}:00`);
      salesTrend.data.push(hourlyTotal);
    }

    // --- Top Selling Products ---
    const productMap = {};
    todayTransactions.forEach(tx => {
      tx.items.forEach(item => {
        const name = item.product?.name || 'Unknown';
        productMap[name] = (productMap[name] || 0) + (item.quantity || 0);
      });
    });

    const topProductsLabels = Object.keys(productMap)
      .sort((a, b) => productMap[b] - productMap[a])
      .slice(0, 5);
    const topProductsData = topProductsLabels.map(name => productMap[name]);
    const topProducts = { labels: topProductsLabels, data: topProductsData };

    // --- Recent Transactions (last 10) ---
    const recentTransactions = todayTransactions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map(tx => ({
        invoice: tx.invoice || '-',
        customer: tx.customer?.name || 'Walk-in',
        totalAmount: tx.totalAmount || tx.items?.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0) || 0,
        cashier: tx.cashier?.username || '-',
        status: tx.status || '-'
      }));

    // --- Stats Object ---
    const stats = {
      totalSalesToday,
      revenueMonth,
      totalProducts,
      lowStock,
      totalCashiers,
      salesTrend,
      topProducts
    };

    // --- Render dashboard ---
    res.render('admin/dashboard', { user: req.user, stats, recentTransactions });

  } catch (err) {
    console.error(err);
    res.render('admin/dashboard', {
      user: req.user,
      stats: {
        totalSalesToday: 0,
        revenueMonth: 0,
        totalProducts: 0,
        lowStock: 0,
        totalCashiers: 0,
        salesTrend: { labels: [], data: [] },
        topProducts: { labels: [], data: [] }
      },
      recentTransactions: []
    });
  }
});


//inventory
router.get('/inventory', isAdmin, async (req, res) => {
  try {
    const products = await Product.find().populate('category');
    const categories = await Category.find();

    const alerts = products.filter(
      p => p.quantity <= p.minStock
    );

    res.render('admin/inventory', {
      user: req.user,
      products,
      categories,
      alerts
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


//products/new
router.get("/products/new", isAdmin, async (req, res) => {
  try {
    const categories = await Category.find();
    res.render("admin/products/new", { categories, error: null });
  } catch (err) {
    res.render("admin/products/new", {
      categories: [],
      error: "Failed to load categories"
    });
  }
});


//product image storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/products");
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

//filter only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files allowed"), false);
  }
};


//upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});


//post/new products
router.post("/products", isAdmin, (req, res, next) => {
  upload.single("image")(req, res, async function (err) {
    const categories = await Category.find();

    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      req.flash("error", "File too large. Max size is 2MB.");
      return res.redirect("/admin/products/new");
    } else if (err) {
      // Unknown error
      req.flash("error", "Something went wrong uploading the file.");
      return res.redirect("/admin/products/new");
    }

    // Everything fine, proceed to next middleware
    next();
  });
}, async (req, res) => {
  try {
    const {
      name,
      sku,
      category,
      buyingPrice,
      sellingPrice,
      quantity,
      minStock,
      description
    } = req.body;

    // Basic validation
    if (!name || !sku || !buyingPrice || !sellingPrice || !quantity) {
      req.flash("error", "Please fill all required fields");
      return res.redirect("/admin/products/new");
    }

    // Prevent duplicate SKU
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      req.flash("error", "SKU already exists");
      return res.redirect("/admin/products/new");
    }

    // Create product
    const product = new Product({
      name,
      sku,
      category: category || null,
      buyingPrice,
      sellingPrice,
      quantity,
      minStock,
      description,
      image: req.file
        ? `/uploads/products/${req.file.filename}`
        : null
    });

    await product.save();

    req.flash("success", "Product added successfully!");
    res.redirect("/admin/inventory");

  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong while saving the product");
    res.redirect("/admin/products/new");
  }
});


// DELETE product
router.delete('/products/:id', isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product && product.image) {
      const imagePath = path.join(__dirname, '..', 'public', product.image);
      fs.unlink(imagePath, (err) => {
        if (err) console.error('Failed to delete image:', err);
      });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin/inventory');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/inventory');
  }
});

// EDIT PRODUCT PAGE
router.get("/products/:id/edit", isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    const categories = await Category.find();

    if (!product) {
      return res.redirect("/admin/inventory");
    }

    res.render("admin/products/edit", {
      user: req.user,
      product,
      categories,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.redirect("/admin/inventory");
  }
});


// UPDATE PRODUCT
router.put(
  "/products/:id",
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        name,
        sku,
        category,
        buyingPrice,
        sellingPrice,
        quantity,
        minStock,
        description
      } = req.body;

      const updateData = {
        name,
        sku,
        category: category || null,
        buyingPrice,
        sellingPrice,
        quantity,
        minStock,
        description
      };

      if (req.file) {
        updateData.image = `/uploads/products/${req.file.filename}`;
      }

      await Product.findByIdAndUpdate(req.params.id, updateData);

      res.redirect("/admin/inventory");
    } catch (err) {
      console.error(err);
      res.redirect("/admin/inventory");
    }
  }
);





module.exports = router;
