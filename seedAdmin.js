require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/user");

const MONGO_URI = process.env.MONGO_URI;

async function seedAdmin() {
  try {
    // Connect to DB
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      console.log("❌ Admin already exists. Seeding aborted.");
      process.exit();
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("Admin@123", 12);

    // Create admin
    const admin = new User({
      name: "System Admin",
      username: "admin",
      password: hashedPassword,
      role: "admin",
      active: true
    });

    await admin.save();

    console.log("✅ Admin account created successfully");
    console.log("👤 Username: admin");
    console.log("🔑 Password: Admin@123");
    console.log("⚠️ Change password after first login");

    process.exit();
  } catch (err) {
    console.error("❌ Error seeding admin:", err);
    process.exit(1);
  }
}

seedAdmin();
