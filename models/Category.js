const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true }
});

// Check if model exists first
module.exports = mongoose.models.Category || mongoose.model("Category", categorySchema);
