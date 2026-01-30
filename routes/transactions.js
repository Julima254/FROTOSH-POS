const express = require("express");
const router = express.Router();
const { isCashier } = require("../middleware/auth");
const Transaction = require("../models/Transaction");

// GET /cashier/transactions
router.get("/", isCashier, async (req, res) => {
  try {
    const cashierId = req.user._id;  // logged-in cashier
    const { startDate, endDate } = req.query;

    const filter = { cashier: cashierId };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .populate("items.product", "name")
      .lean();

    res.render("cashier/transactions", { transactions, startDate, endDate });

  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load transactions");
  }
});

module.exports = router;
