const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  username: {
    type: String,
    required: true,
    unique: true
  },

  email: {
    type: String
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["admin", "cashier"],
    default: "cashier"
  },

  isActive: {
    type: Boolean,
    default: true
  },

  lastLogin: {
    type: Date
  }

}, { timestamps: true });

// ✅ Fix OverwriteModelError
module.exports = mongoose.models.User || mongoose.model("User", userSchema);
