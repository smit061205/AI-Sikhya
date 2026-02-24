const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { createOrder, verifyPayment } = require("../controllers/paymentController");

// Route to create a new payment order
// This is protected, as a user must be logged in to create an order for their cart.
router.post("/create-order", authMiddleware, createOrder);
router.post("/verify", authMiddleware, verifyPayment);

module.exports = router;
