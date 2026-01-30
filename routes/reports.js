const express = require("express");
const router = express.Router();
const { isAdmin } = require("../middleware/auth");
const Transaction = require("../models/Transaction");
const Product = require("../models/Product");
const Category = require("../models/Category");
const User = require("../models/user");

router.get("/", isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, cashier: cashierId, category: categoryId } = req.query;

    // ===== FILTER TRANSACTIONS =====
    let txFilter = {};
    if (startDate || endDate) {
      txFilter.createdAt = {};
      if (startDate) txFilter.createdAt.$gte = new Date(startDate);
      if (endDate) txFilter.createdAt.$lte = new Date(endDate);
    }
    if (cashierId) txFilter.cashier = cashierId;

    // Fetch transactions with populated items and cashier
    const transactions = await Transaction.find(txFilter)
      .sort({ createdAt: -1 })
      .populate("items.product")
      .populate("cashier")
      .lean();

    // ===== INVENTORY =====
    let inventoryFilter = {};
    if (categoryId) inventoryFilter.category = categoryId;
    const inventory = await Product.find(inventoryFilter).populate("category");

    // ===== CASHIERS =====
    const cashiers = await User.find({ role: "cashier" });

    // ===== CATEGORIES =====
    const categories = await Category.find();

    // ===== STATS =====
    let totalSales = 0;
    const productSalesMap = {};
    const cashierSalesMap = {};

    transactions.forEach(tx => {
      totalSales += tx.totalAmount || tx.items?.reduce((sum, i) => sum + (i.price * i.quantity), 0) || 0;

      // Top products
      tx.items?.forEach(item => {
        const name = item.product?.name || "Unknown";
        productSalesMap[name] = (productSalesMap[name] || 0) + (item.quantity || 0);
      });

      // Top cashier
      const cashierName = tx.cashier?.name || "Unknown";
      cashierSalesMap[cashierName] = (cashierSalesMap[cashierName] || 0) + (tx.totalAmount || 0);
    });

    const totalTransactions = transactions.length;

    // Sort top products (top 5)
    const sortedProducts = Object.keys(productSalesMap)
      .sort((a, b) => productSalesMap[b] - productSalesMap[a])
      .slice(0, 5);
    const topProducts = {
      labels: sortedProducts,
      data: sortedProducts.map(name => productSalesMap[name])
    };
    const topProduct = sortedProducts[0] || "-";

    // Sort top cashier
    const sortedCashiers = Object.keys(cashierSalesMap)
      .sort((a, b) => cashierSalesMap[b] - cashierSalesMap[a])
      .slice(0, 5);
    const cashierPerformance = {
      labels: sortedCashiers,
      data: sortedCashiers.map(name => cashierSalesMap[name])
    };
    const topCashier = sortedCashiers[0] || "-";

    // Sales trend last 7 days
    const salesTrend = { labels: [], data: [] };
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toLocaleDateString();
      const daySales = transactions
        .filter(tx => new Date(tx.createdAt).toDateString() === date.toDateString())
        .reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
      salesTrend.labels.push(dateString);
      salesTrend.data.push(daySales);
    }

    // Render
    res.render("admin/reports", {
      user: req.user,
      transactions,
      inventory,
      cashiers,
      categories,
      stats: {
        totalSales,
        totalTransactions,
        topProduct,
        topCashier,
        salesTrend,
        topProducts,
        cashierPerformance
      },
      error: null
    });

  } catch (err) {
    console.error(err);
    res.render("admin/reports", {
      user: req.user,
      transactions: [],
      inventory: [],
      cashiers: [],
      categories: [],
      stats: {
        totalSales: 0,
        totalTransactions: 0,
        topProduct: "-",
        topCashier: "-",
        salesTrend: { labels: [], data: [] },
        topProducts: { labels: [], data: [] },
        cashierPerformance: { labels: [], data: [] }
      },
      error: "Failed to load reports"
    });
  }
});

module.exports = router;
