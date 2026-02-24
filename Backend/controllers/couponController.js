const { Coupon } = require('../models/coupon');

const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, expiryDate } = req.body;
    const adminId = req.userId;

    if (!code || !discountType || !discountValue || !expiryDate) {
      return res.status(400).json({ error: 'All coupon fields are required.' });
    }

    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({ error: 'A coupon with this code already exists.' });
    }

    const coupon = await Coupon.create({
      code,
      discountType,
      discountValue,
      expiryDate,
      createdBy: adminId,
    });

    res.status(201).json({ message: 'Coupon created successfully', coupon });

  } catch (err) {
    console.error('--- ERROR in createCoupon ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getAllCoupons = async (req, res) => {
  try {
    const adminId = req.userId;
    const coupons = await Coupon.find({ createdBy: adminId });
    res.status(200).json({ coupons });
  } catch (err) {
    console.error('--- ERROR in getAllCoupons ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const adminId = req.userId;
    const updateData = req.body;

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found.' });
    }

    if (coupon.createdBy.toString() !== adminId) {
      return res.status(403).json({ error: 'Forbidden. You can only update your own coupons.' });
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, updateData, { new: true });

    res.status(200).json({ message: 'Coupon updated successfully', coupon: updatedCoupon });

  } catch (err) {
    console.error('--- ERROR in updateCoupon ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const adminId = req.userId;

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found.' });
    }

    if (coupon.createdBy.toString() !== adminId) {
      return res.status(403).json({ error: 'Forbidden. You can only delete your own coupons.' });
    }

    await Coupon.findByIdAndDelete(couponId);

    res.status(200).json({ message: 'Coupon deleted successfully.' });

  } catch (err) {
    console.error('--- ERROR in deleteCoupon ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
};
