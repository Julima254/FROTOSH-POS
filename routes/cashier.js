const express = require('express');
const router = express.Router();
const { isCashier } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');

/* =============================
   CASHIER DASHBOARD
============================= */
router.get('/sales', isCashier, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);

    const transactionsToday = await Transaction.find({
      createdAt: { $gte: today },
      status: 'Completed',
      cashier: req.user._id
    })
    .populate('items.product')
    .lean();

    let totalSalesToday = 0;
    let totalProfitToday = 0;
    let cashToday = 0;
    let mpesaToday = 0;
    let bankToday = 0;

    transactionsToday.forEach(tx => {
      totalSalesToday += tx.totalAmount || 0;
      totalProfitToday += tx.profit || 0;

      switch ((tx.paymentMethod || '').toLowerCase()) {
        case 'cash': cashToday += tx.totalAmount || 0; break;
        case 'mpesa': mpesaToday += tx.totalAmount || 0; break;
        case 'bank': bankToday += tx.totalAmount || 0; break;
      }
    });

    const lowStockItems = await Product.find({ quantity: { $lte: 5 } });
    const lowStockCount = lowStockItems.length;

    const topProductAgg = await Transaction.aggregate([
      { 
        $match: { 
          createdAt: { $gte: today }, 
          status: 'Completed',
          cashier: req.user._id
        } 
      },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalQty: { $sum: '$items.quantity' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 1 }
    ]);

    let topProduct = '-';
    if (topProductAgg.length > 0) {
      const product = await Product.findById(topProductAgg[0]._id);
      topProduct = product?.name || '-';
    }

    const salesTrend = { labels: [], data: [] };
    for (let h = 0; h < 24; h++) {
      const start = new Date(today); start.setHours(h);
      const end = new Date(today); end.setHours(h+1);
      const hourlyTotal = transactionsToday
        .filter(tx => new Date(tx.createdAt) >= start && new Date(tx.createdAt) < end)
        .reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
      salesTrend.labels.push(`${h}:00`);
      salesTrend.data.push(hourlyTotal);
    }

    const productMap = {};
    transactionsToday.forEach(tx => {
      tx.items?.forEach(i => {
        const name = i.product?.name || 'Unknown';
        productMap[name] = (productMap[name] || 0) + (i.quantity || 0);
      });
    });

    const sortedProducts = Object.keys(productMap)
      .sort((a,b) => productMap[b] - productMap[a])
      .slice(0,10);

    const topProducts = {
      labels: sortedProducts,
      data: sortedProducts.map(p => productMap[p])
    };

    const recentTransactions = await Transaction.find({
      cashier: req.user._id
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('cashier')
      .populate('items.product');

    const stats = {
      totalSalesToday,
      profitToday: totalProfitToday,
      cashToday,
      mpesaToday,
      bankToday,
      totalTransactionsToday: transactionsToday.length,
      lowStockCount,
      topProduct,
      salesTrend,
      topProducts
    };

    res.render('cashier/sales', {
      user: req.user,
      stats,
      recentTransactions,
      notifications: []
    });

  } catch (err) {
    console.error(err);
    res.render('cashier/sales', {
      user: req.user,
      stats: {},
      recentTransactions: [],
      notifications: []
    });
  }
});

/* =============================
   POS PAGE
============================= */
router.get('/pos', isCashier, async (req, res) => {
  try {
    const products = await Product.find({ quantity: { $gt: 0 } }).populate('category');
    res.render('cashier/pos', { user: req.user, products });
  } catch (err) {
    console.error(err);
    res.render('cashier/pos', { user: req.user, products: [] });
  }
});

/* =============================
   COMPLETE SALE
============================= */
router.post('/pos/complete', isCashier, async (req, res) => {
  try {
    const { cart, paymentMethod } = req.body;

    if (!Array.isArray(cart) || cart.length === 0)
      return res.status(400).json({ success: false, message: "Cart is empty" });

    const transactionItems = cart.map(item => {
      const quantity = Number(item.quantity) || 0;

      // ✅ Use overridePrice if provided, otherwise sellingPrice
      const price = Number(item.overridePrice != null ? item.overridePrice : item.sellingPrice) || 0;

      const costPrice = Number(item.costPrice) || 0;
      const totalAmount = quantity * price;
      const profit = (price - costPrice) * quantity;

      return {
        product: item.product,
        quantity,
        price,
        costPrice,
        totalAmount,
        profit
      };
    });

    const totalAmount = transactionItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalProfit = transactionItems.reduce((sum, item) => sum + item.profit, 0);

    const transaction = new Transaction({
      cashier: req.user._id,
      items: transactionItems,
      totalAmount,
      profit: totalProfit,
      paymentMethod,
      status: 'Completed'
    });

    await transaction.save();

    const populatedTransaction = await Transaction.findById(transaction._id).populate("items.product");

    res.json({ success: true, message: "Sale completed", transaction: populatedTransaction });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

/* =============================
   LIVE STATS
============================= */
router.get("/stats/live", isCashier, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);

    const totalSalesAgg = await Transaction.aggregate([
      { $match: { createdAt: { $gte: today }, status: "Completed", cashier: req.user._id } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    const totalSalesToday = totalSalesAgg[0]?.total || 0;
    const totalTransactionsToday = await Transaction.countDocuments({
      createdAt: { $gte: today },
      status: "Completed",
      cashier: req.user._id
    });

    res.json({ totalSalesToday, totalTransactionsToday });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

module.exports = router;
