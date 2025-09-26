const { Course } = require('../models/course');
const { User } = require('../models/user');

const getDashboardStats = async (req, res) => {
  try {
    const adminId = req.userId;

    // 1. Find all courses created by the admin
    const courses = await Course.find({ createdBy: adminId });
    const courseIds = courses.map(course => course._id);

    // 2. Calculate total revenue
    const totalRevenue = courses.reduce((acc, course) => acc + (course.price * course.purchasedBy.length), 0);

    // 3. Calculate total students (unique students across all courses)
    const allStudents = await User.find({ purchasedCourses: { $in: courseIds } });
    const totalStudents = allStudents.length;

    // 4. Get total number of courses
    const totalCourses = courses.length;

    // 5. Get top 5 best-selling courses
    const topCourses = courses
      .sort((a, b) => b.purchasedBy.length - a.purchasedBy.length)
      .slice(0, 5)
      .map(course => ({ 
        title: course.title, 
        enrollments: course.purchasedBy.length, 
        revenue: course.price * course.purchasedBy.length 
      }));

    res.status(200).json({
      totalRevenue: totalRevenue.toFixed(2),
      totalStudents,
      totalCourses,
      topCourses,
    });

  } catch (err) {
    console.error('--- ERROR in getDashboardStats ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getDashboardStats,
};
