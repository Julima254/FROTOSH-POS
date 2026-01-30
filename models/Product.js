const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: String,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  buyingPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  quantity: { type: Number, default: 0 },
  minStock: { type: Number, default: 5 },
  status: { type: String, default: 'Active' },
  createdAt: { type: Date, default: Date.now },
   // 🖼️ PRODUCT IMAGE
  image: {
    type: String, // stores filename or URL
    default: "default-product.png"
  }
});

// ✅ This prevents OverwriteModelError
module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);
