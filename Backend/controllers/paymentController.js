const Razorpay = require("razorpay");
const { User } = require("../models/user");
const { Course } = require("../models/course");
const crypto = require("crypto");
const { createNotification } = require('../utils/notificationHelper');
const { Coupon } = require('../models/coupon');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { couponCode } = req.body; // Optional: get coupon from request

    const user = await User.findById(userId).populate('cart');

    if (!user || user.cart.length === 0) {
      return res.status(400).json({ error: 'Cart is empty or user not found.' });
    }

    const originalTotal = user.cart.reduce((acc, course) => acc + course.price, 0);
    let finalAmount = originalTotal;
    let discountAmount = 0;

    // If a coupon code is provided, validate it and apply the discount
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });

      if (coupon && coupon.expiryDate >= new Date()) {
        if (coupon.discountType === 'percentage') {
          discountAmount = (originalTotal * coupon.discountValue) / 100;
        } else if (coupon.discountType === 'fixed') {
          discountAmount = coupon.discountValue;
        }
        finalAmount = Math.max(0, originalTotal - discountAmount);
      } else {
        // If coupon is invalid or expired, fail the request
        return res.status(400).json({ error: 'Invalid or expired coupon code.' });
      }
    }

    const options = {
      amount: Math.round(finalAmount * 100), // Amount in smallest currency unit (paise)
      currency: 'INR',
      receipt: `receipt_order_${new Date().getTime()}`,
      notes: { // Add metadata for reference
        userId,
        originalTotal: originalTotal.toFixed(2),
        couponCode: couponCode || 'N/A',
        discountAmount: discountAmount.toFixed(2),
        finalAmount: finalAmount.toFixed(2),
      },
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      return res.status(500).json({ error: 'Error creating Razorpay order' });
    }

    res.status(200).json(order);
  } catch (err) {
    console.error('--- ERROR in createOrder ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.userId;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification details are required.' });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature.' });
    }

    // Signature is valid, find the user and their cart
    const user = await User.findById(userId).populate('cart');
    if (!user || user.cart.length === 0) {
      return res.status(404).json({ error: 'User or cart not found.' });
    }

    const purchasedCourses = user.cart;

    // Add courses to user's purchased list and notify instructors
    for (const course of purchasedCourses) {
      user.purchasedCourses.push(course._id);

      // Notify the course instructor
      await createNotification({
        recipient: course.createdBy,
        recipientModel: 'Admin',
        sender: userId,
        senderModel: 'User',
        type: 'course_purchase',
        title: 'New Course Sale!',
        message: `${user.username} has just purchased your course: "${course.title}".`,
        relatedCourse: course._id,
        actionUrl: `/admin/courses/${course._id}/analytics`,
        priority: 'high',
      });
    }

    // Clear the cart
    user.cart = [];
    await user.save();

    res.status(200).json({ success: true, message: 'Payment verified successfully. Courses added to your account.' });

  } catch (err) {
    console.error('--- ERROR in verifyPayment ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};
