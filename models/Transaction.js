// models/Transaction.js
const mongoose = require("mongoose");

const transactionItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  costPrice: { type: Number }, // for profit calculation
  totalAmount: { type: Number, required: true },
  profit: { type: Number, default: 0 } // per item profit
});

const transactionSchema = new mongoose.Schema({
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [transactionItemSchema],
  totalAmount: { type: Number, required: true },
  profit: { type: Number, default: 0 }, // total profit
  paymentMethod: { type: String }, // cash, mpesa, bank
  status: { type: String, default: "Completed" }
}, { timestamps: true });

module.exports = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
