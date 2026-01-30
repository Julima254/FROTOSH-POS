const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  storeName: String,
  storeAddress: String,
  storeEmail: String,
  storePhone: String,
  storeLogo: String,
  taxRate: { type: Number, default: 0 },
  currency: { type: String, default: "Ksh" },
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: true },
  theme: { type: String, default: "light" }
}, { timestamps: true });

module.exports = mongoose.model("Settings", settingsSchema);
