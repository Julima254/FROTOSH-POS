require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const categoryRoutes = require("./routes/categories");
const salesRoutes = require("./routes/sales");
const reportsRoutes = require("./routes/reports");
const settingsRoutes = require("./routes/settings");
const notificationRoutes = require("./routes/notifications");
// Cashier Transactions
const transactionsRoute = require("./routes/transactions");
const cashierNotificationsRouter = require("./routes/cashierNotifications");




// Routes
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const cashierRoutes = require("./routes/cashier");
const cashierAdminRoutes = require("./routes/cashiers");




// Passport config
require("./config/passport")(passport);

const app = express();
// MIDDLEWARE


// Serve static files
app.use(express.static("public"));

// EJS
app.set('view engine', 'ejs');

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

//overrride middleware
app.use(methodOverride("_method"));

// Express session
app.use(session({
  secret: process.env.SESSION_SECRET || "secretkey",
  resave: false,
  saveUninitialized: false
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// ====================
// MONGODB CONNECTION
// ====================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));


// ROUTES
app.use("/", authRoutes);        // login/logout
app.use("/admin", adminRoutes);  // admin dashboard, inventory, etc.
app.use("/cashier", cashierRoutes); // cashier pages
app.use("/admin/categories", categoryRoutes); // categories
app.use("/admin/cashiers", cashierAdminRoutes);
app.use("/admin/sales", salesRoutes);
app.use("/admin/reports", reportsRoutes);
app.use("/admin/settings", settingsRoutes);
app.use("/admin/notifications", notificationRoutes);
app.use("/cashier/transactions", transactionsRoute);
app.use("/cashier/notifications", cashierNotificationsRouter);





// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
