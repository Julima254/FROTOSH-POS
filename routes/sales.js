const express = require("express");
const router = express.Router();
const { isAdmin } = require("../middleware/auth");
const Transaction = require("../models/Transaction");
const User = require("../models/user");

// ================= BUILD STATS FUNCTION =================
function buildStats(transactions) {
  const today = new Date();

  let totalSalesToday = 0;
  let cashToday = 0;
  let mpesaToday = 0;
  let bankToday = 0;
  let profitToday = 0;

  // Revenue this month
  const totalRevenueMonth = transactions
    .filter(tx => {
      const d = new Date(tx.createdAt);
      return d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    })
    .reduce((sum, tx) => sum + (tx.total || 0), 0);

  // Loop all transactions
  transactions.forEach(tx => {
    const isToday = new Date(tx.createdAt).toDateString() === today.toDateString();

    if (isToday) {
      totalSalesToday += tx.total || 0;

      // Payment methods
   // With this:
const pm = (tx.paymentMethod || "").toLowerCase();
if (pm === "cash") cashToday += tx.total || 0;
if (pm === "mpesa") mpesaToday += tx.total || 0;
if (pm === "bank") bankToday += tx.total || 0;

      // Profit
      profitToday += tx.profit || 0;
    }
  });

  // Sales trend last 7 days
  const salesTrend = { labels: [], data: [] };
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dayTotal = transactions
      .filter(tx => new Date(tx.createdAt).toDateString() === date.toDateString())
      .reduce((sum, tx) => sum + (tx.total || 0), 0);

    salesTrend.labels.push(date.toLocaleDateString());
    salesTrend.data.push(dayTotal);
  }

  // Top products
  const productMap = {};
  transactions.forEach(tx => {
    tx.items?.forEach(item => {
      const name = item.productName || "Unknown";
      productMap[name] = (productMap[name] || 0) + (item.quantity || 0);
    });
  });

  const sortedProducts = Object.keys(productMap)
    .sort((a, b) => productMap[b] - productMap[a])
    .slice(0, 5);

  const topProducts = {
    labels: sortedProducts,
    data: sortedProducts.map(p => productMap[p])
  };

  const topProduct = sortedProducts[0] || "-";

  // Top cashier
  const cashierMap = {};
  transactions.forEach(tx => {
    const c = tx.cashierName || "-";
    cashierMap[c] = (cashierMap[c] || 0) + 1;
  });

  const topCashier = Object.keys(cashierMap)
    .sort((a, b) => cashierMap[b] - cashierMap[a])[0] || "-";

  return {
    totalSalesToday,
    totalRevenueMonth,
    totalTransactions: transactions.length,
    topProduct,
    topCashier,
    salesTrend,
    topProducts,
    cashToday,
    mpesaToday,
    bankToday,
    profitToday
  };
}

// ================= ADMIN SALES DASHBOARD =================
router.get("/", isAdmin, async (req, res) => {
  try {
    const cashiers = await User.find({ role: "cashier" });

    // ALL TRANSACTIONS FOR STATS
    const allTransactionsRaw = await Transaction.find()
      .populate("items.product", "name")
      .populate("cashier", "username")
      .lean();

    const allTransactions = allTransactionsRaw.map(tx => ({
      invoice: tx.invoice || "-",
      cashierName: tx.cashier?.username || "-",
      total: tx.totalAmount || tx.items?.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0) || 0,
      paymentMethod: tx.paymentMethod || "",
      profit: tx.profit || 0,
      createdAt: tx.createdAt,
      items: tx.items?.map(i => ({
        quantity: i.quantity || 0,
        price: i.price || 0,
        productName: i.product?.name || "Unknown"
      })) || []
    }));

    const stats = buildStats(allTransactions);

    // RECENT 50 TRANSACTIONS FOR TABLE
    const recentTransactionsRaw = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("items.product", "name")
      .populate("cashier", "username")
      .lean();

    const transactions = recentTransactionsRaw.map(tx => ({
      invoice: tx.invoice || "-",
      cashier: tx.cashier?.username || "-",
      total: tx.totalAmount || tx.items?.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0) || 0,
      status: tx.status || "-",
      createdAt: tx.createdAt,
      items: tx.items || []
    }));

    res.render("admin/sales", {
      user: req.user,
      cashiers,
      stats,
      transactions
    });

  } catch (err) {
    console.error(err);
    res.render("admin/sales", {
      user: req.user,
      cashiers: [],
      stats: {
        totalSalesToday: 0,
        totalRevenueMonth: 0,
        totalTransactions: 0,
        topProduct: "-",
        topCashier: "-",
        salesTrend: { labels: [], data: [] },
        topProducts: { labels: [], data: [] },
        cashToday: 0,
        mpesaToday: 0,
        bankToday: 0,
        profitToday: 0
      },
      transactions: [],
      error: "Failed to load sales"
    });
  }
});

// ================= FILTER SALES =================
router.get("/filter", isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, cashier } = req.query;

    const cashiers = await User.find({ role: "cashier" });

    const filter = {};
    if (startDate && endDate) filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    if (cashier) filter.cashier = cashier;

    const raw = await Transaction.find(filter)
      .populate("items.product", "name")
      .populate("cashier", "username")
      .lean();

    const mapped = raw.map(tx => ({
      invoice: tx.invoice || "-",
      cashierName: tx.cashier?.username || "-",
      total: tx.totalAmount || tx.items?.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0) || 0,
      paymentMethod: tx.paymentMethod || "",
      profit: tx.profit || 0,
      createdAt: tx.createdAt,
      items: tx.items?.map(i => ({
        quantity: i.quantity || 0,
        price: i.price || 0,
        productName: i.product?.name || "Unknown"
      })) || []
    }));

    const stats = buildStats(mapped);

    res.render("admin/sales", {
      user: req.user,
      cashiers,
      stats,
      transactions: mapped
    });

  } catch (err) {
    console.error(err);
    res.redirect("/admin/sales");
  }
});

module.exports = router;
