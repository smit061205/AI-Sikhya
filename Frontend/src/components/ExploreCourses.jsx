import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ReactLenis, useLenis } from "lenis/react";
import { useNavigate } from "react-router-dom";
import userApi from "../api/userApi";

const ExploreCourses = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPrice, setSelectedPrice] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const navigate = useNavigate();

  const lenis = useLenis((lenis) => {
    console.log(lenis);
  });

  const categories = [
    "All",
    "Mathematics",
    "Science",
    "English",
    "History",
    "Geography",
    "Physics",
    "Chemistry",
    "Biology",
    "Computer Science",
    "Arts",
    "Languages",
  ];

  const priceFilters = ["All", "Free", "Paid"];
  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
    { value: "rating", label: "Highest Rated" },
  ];

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    filterAndSortCourses();
  }, [courses, searchQuery, selectedCategory, selectedPrice, sortBy]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all courses from backend
      const response = await userApi.get("/courses");
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      setError("Failed to load courses. Please try again.");

      // Mock data for development
      setCourses([
        {
          _id: "1",
          title: "Complete Mathematics for Grade 10",
          description:
            "Master algebra, geometry, and trigonometry with comprehensive lessons designed for rural students.",
          thumbnail: {
            url: "https://via.placeholder.com/400x225/3b82f6/ffffff?text=Course",
          },
          price: 0,
          category: "Mathematics",
          averageRating: 4.8,
          totalStudents: 1250,
          duration: "12 hours",
          level: "Intermediate",
          createdBy: { name: "Dr. Rajesh Kumar" },
          createdAt: "2024-12-15",
        },
        {
          _id: "2",
          title: "Science Fundamentals",
          description:
            "Explore physics, chemistry, and biology concepts with practical experiments and real-world applications.",
          thumbnail: {
            url: "https://via.placeholder.com/400x225/3b82f6/ffffff?text=Course",
          },
          price: 299,
          category: "Science",
          averageRating: 4.6,
          totalStudents: 890,
          duration: "15 hours",
          level: "Beginner",
          createdBy: { name: "Prof. Priya Sharma" },
          createdAt: "2024-12-10",
        },
        {
          _id: "3",
          title: "English Literature & Grammar",
          description:
            "Improve your English skills with literature analysis, grammar rules, and creative writing techniques.",
          thumbnail: { url: "/api/placeholder/400/225" },
          price: 199,
          category: "English",
          averageRating: 4.7,
          totalStudents: 2100,
          duration: "10 hours",
          level: "Beginner",
          createdBy: { name: "Ms. Anjali Verma" },
          createdAt: "2024-12-08",
        },
        {
          _id: "4",
          title: "Indian History & Culture",
          description:
            "Journey through India's rich history from ancient civilizations to modern independence movement.",
          thumbnail: {
            url: "https://via.placeholder.com/400x225/3b82f6/ffffff?text=Course",
          },
          price: 0,
          category: "History",
          averageRating: 4.9,
          totalStudents: 1560,
          duration: "8 hours",
          level: "Beginner",
          createdBy: { name: "Dr. Vikram Singh" },
          createdAt: "2024-12-05",
        },
        {
          _id: "5",
          title: "Computer Programming Basics",
          description:
            "Learn programming fundamentals with Python, perfect for beginners in rural areas.",
          thumbnail: {
            url: "https://via.placeholder.com/400x225/3b82f6/ffffff?text=Course",
          },
          price: 499,
          category: "Computer Science",
          averageRating: 4.5,
          totalStudents: 750,
          duration: "20 hours",
          level: "Beginner",
          createdBy: { name: "Mr. Arjun Patel" },
          createdAt: "2024-12-01",
        },
        {
          _id: "6",
          title: "Geography & Environment",
          description:
            "Understand our planet's geography, climate patterns, and environmental challenges.",
          thumbnail: {
            url: "https://via.placeholder.com/400x225/3b82f6/ffffff?text=Course",
          },
          price: 0,
          category: "Geography",
          averageRating: 4.4,
          totalStudents: 980,
          duration: "9 hours",
          level: "Intermediate",
          createdBy: { name: "Dr. Meera Joshi" },
          createdAt: "2024-11-28",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCourses = () => {
    let filtered = [...courses];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          course.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "All") {
      filtered = filtered.filter(
        (course) => course.category === selectedCategory
      );
    }

    // Price filter
    if (selectedPrice !== "All") {
      if (selectedPrice === "Free") {
        filtered = filtered.filter((course) => course.price === 0);
      } else if (selectedPrice === "Paid") {
        filtered = filtered.filter((course) => course.price > 0);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating":
          return (b.averageRating || 0) - (a.averageRating || 0);
        default:
          return 0;
      }
    });

    setFilteredCourses(filtered);
  };

  const handleAddToCart = async (courseId) => {
    try {
      await userApi.post(`/user/cart/${courseId}`);
      // Show success message or update UI
      console.log("Added to cart successfully");
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  const handleViewDetails = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} className="text-yellow-400">
          ★
        </span>
      );
    }
    if (hasHalfStar) {
      stars.push(
        <span key="half" className="text-yellow-400">
          ☆
        </span>
      );
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push(
        <span key={i} className="text-gray-600">
          ☆
        </span>
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black font-poppins">
        <ReactLenis
          root
          options={{
            lerp: 0.2,
            duration: 1,
            wheelMultiplier: 2.5,
            smoothWheel: true,
            smoothTouch: true,
          }}
        />
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"
          />
          <span className="ml-4 text-xl text-white">Loading courses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-poppins">
      <ReactLenis
        root
        options={{
          lerp: 0.2,
          duration: 1,
          wheelMultiplier: 2.5,
          smoothWheel: true,
          smoothTouch: true,
        }}
      />

      <div className="container mx-auto px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-5xl font-semibold text-white mb-4">
              Explore Subjects
            </h1>
            <p className="text-gray-400 text-xl">
              Discover comprehensive courses designed for rural education
            </p>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6 mb-8"
          >
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for courses, subjects, or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 pl-12 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price
                </label>
                <select
                  value={selectedPrice}
                  onChange={(e) => setSelectedPrice(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  {priceFilters.map((filter) => (
                    <option key={filter} value={filter}>
                      {filter}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Results Count */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-6"
          >
            <p className="text-gray-400">
              Showing {filteredCourses.length} course
              {filteredCourses.length !== 1 ? "s" : ""}
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-900/50 border border-yellow-600 rounded-2xl p-4 mb-8"
            >
              <p className="text-yellow-200">⚠️ {error}</p>
            </motion.div>
          )}

          {/* Course Grid */}
          {filteredCourses.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredCourses.map((course, index) => (
                <motion.div
                  key={course._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gray-900/50 border border-gray-700 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition-all duration-300"
                >
                  {/* Course Thumbnail */}
                  <div className="aspect-video bg-gray-800 relative overflow-hidden">
                    {course.thumbnail?.url ? (
                      <img
                        src={course.thumbnail.url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-800 to-gray-900">
                        <svg
                          className="w-12 h-12"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Price Badge */}
                    <div className="absolute top-2 right-2">
                      {course.price === 0 ? (
                        <span className="bg-green-600 text-white px-2 py-1 rounded-lg text-sm font-medium">
                          Free
                        </span>
                      ) : (
                        <span className="bg-cyan-600 text-white px-2 py-1 rounded-lg text-sm font-medium">
                          ₹{course.price}
                        </span>
                      )}
                    </div>

                    {/* Level Badge */}
                    <div className="absolute top-2 left-2">
                      <span className="bg-black/70 text-white px-2 py-1 rounded-lg text-xs">
                        {course.level}
                      </span>
                    </div>
                  </div>

                  {/* Course Info */}
                  <div className="p-4">
                    <div className="mb-2">
                      <span className="text-cyan-400 text-sm font-medium">
                        {course.category}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {course.description}
                    </p>

                    <div className="text-sm text-gray-500 mb-3">
                      By {course.createdBy?.name || "Unknown"}
                    </div>

                    {/* Rating and Stats */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-1">
                        <div className="flex">
                          {renderStars(course.averageRating || 0)}
                        </div>
                        <span className="text-gray-400 text-sm ml-1">
                          ({course.averageRating?.toFixed(1) || "0.0"})
                        </span>
                      </div>
                      <div className="text-gray-400 text-sm">
                        {course.totalStudents} students
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-400 text-sm">
                        ⏱️ {course.duration}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <motion.button
                        onClick={() => handleViewDetails(course._id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gradient-to-br from-cyan-200 to-cyan-300 text-black font-semibold py-2 px-4 rounded-xl hover:opacity-90 transition-opacity"
                      >
                        View Details
                      </motion.button>

                      {course.price > 0 && (
                        <motion.button
                          onClick={() => handleAddToCart(course._id)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-xl font-medium transition-colors"
                        >
                          Add to Cart
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="text-gray-400 text-xl mb-4">
                📚 No courses found
              </div>
              <p className="text-gray-500 mb-6">
                Try adjusting your search or filter criteria
              </p>
              <motion.button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedPrice("All");
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-6 rounded-xl font-medium transition-colors"
              >
                Clear Filters
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExploreCourses;
