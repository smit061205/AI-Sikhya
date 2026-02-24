const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getAllCourses,
  getCourseById,
  purchaseCourse,
  getPurchasedCourses,
  searchCourses
} = require('../controllers/courseController');

router.get('/courses', getAllCourses);
router.get('/course/:id', getCourseById);
router.post('/user/purchase/:id', authMiddleware, purchaseCourse);
router.get('/user/purchased', authMiddleware, getPurchasedCourses);

// Public route for searching courses
router.get('/search', searchCourses);

module.exports = router;