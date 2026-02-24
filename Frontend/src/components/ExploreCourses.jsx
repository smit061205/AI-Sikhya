import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ReactLenis } from "lenis/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import userApi from "../api/userApi";

const CATEGORIES = [
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
const PRICES = ["All", "Free", "Paid"];
const SORTS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price-low", label: "Price: Low → High" },
  { value: "price-high", label: "Price: High → Low" },
  { value: "rating", label: "Highest Rated" },
];

/* ─── Star renderer ──────────────────────────────────── */
const Stars = ({ rating = 0 }) => {
  const full = Math.floor(rating);
  return (
    <span className="text-xs">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < full ? "text-yellow-400" : "text-gray-700"}
        >
          ★
        </span>
      ))}
    </span>
  );
};

/* ─── Select helper ──────────────────────────────────── */
const FilterSelect = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#111318] border border-[#222530] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer"
    >
      {options.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ),
      )}
    </select>
  </div>
);

/* ════════════════════════════════════════════════════════
   Main Component
════════════════════════════════════════════════════════ */
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
  const [searchParams] = useSearchParams();

  /* read ?q= param from navbar search */
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    filterAndSort();
  }, [courses, searchQuery, selectedCategory, selectedPrice, sortBy]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await userApi.get("/courses");
      setCourses(res.data.courses || []);
    } catch {
      setError("Couldn't load courses from server. Showing sample data.");
      setCourses([
        {
          _id: "1",
          title: "Complete Mathematics for Grade 10",
          description: "Master algebra, geometry, and trigonometry.",
          thumbnail: {
            url: "https://via.placeholder.com/400x225/1a1d27/22d3ee?text=Mathematics",
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
          description: "Physics, chemistry, and biology with experiments.",
          thumbnail: {
            url: "https://via.placeholder.com/400x225/1a1d27/22d3ee?text=Science",
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
          description: "Improve English with literature and creative writing.",
          thumbnail: {
            url: "https://via.placeholder.com/400x225/1a1d27/22d3ee?text=English",
          },
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
          description: "Journey through India's rich history.",
          thumbnail: {
            url: "https://via.placeholder.com/400x225/1a1d27/22d3ee?text=History",
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
          description: "Learn Python from scratch.",
          thumbnail: {
            url: "https://via.placeholder.com/400x225/1a1d27/22d3ee?text=CS",
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
          description: "Understand planet geography and climate.",
          thumbnail: {
            url: "https://via.placeholder.com/400x225/1a1d27/22d3ee?text=Geography",
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

  const filterAndSort = () => {
    let f = [...courses];
    if (searchQuery)
      f = f.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.category.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    if (selectedCategory !== "All")
      f = f.filter((c) => c.category === selectedCategory);
    if (selectedPrice === "Free") f = f.filter((c) => c.price === 0);
    if (selectedPrice === "Paid") f = f.filter((c) => c.price > 0);
    f.sort((a, b) => {
      if (sortBy === "newest")
        return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "oldest")
        return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "rating")
        return (b.averageRating || 0) - (a.averageRating || 0);
      return 0;
    });
    setFilteredCourses(f);
  };

  const handleAddToCart = async (courseId) => {
    try {
      await userApi.post(`/user/cart/${courseId}`);
    } catch {}
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedPrice("All");
  };

  const hasActiveFilters =
    searchQuery || selectedCategory !== "All" || selectedPrice !== "All";

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center font-poppins">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"
        />
        <span className="ml-3 text-gray-500 text-sm">Loading courses…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0e14] font-poppins text-white">
      <ReactLenis
        root
        options={{
          lerp: 0.2,
          duration: 1,
          wheelMultiplier: 2.5,
          smoothWheel: true,
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        {/* ── PAGE HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-1">
            Explore Subjects
          </h1>
          <p className="text-gray-500 text-sm">
            Discover comprehensive courses designed for every learner
          </p>
        </motion.div>

        {/* ── SEARCH + FILTERS BAR ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="bg-[#111318] border border-[#222530] rounded-xl p-5 mb-6"
        >
          {/* Search input */}
          <div className="relative mb-4">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
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
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for courses, subjects, or topics…"
              className="w-full bg-[#0c0e14] border border-[#222530] rounded-lg py-2.5 pl-10 pr-4 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FilterSelect
              label="Category"
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={CATEGORIES}
            />
            <FilterSelect
              label="Price"
              value={selectedPrice}
              onChange={setSelectedPrice}
              options={PRICES}
            />
            <FilterSelect
              label="Sort by"
              value={sortBy}
              onChange={setSortBy}
              options={SORTS}
            />
          </div>
        </motion.div>

        {/* ── RESULTS META ── */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-gray-500 text-sm">
            Showing{" "}
            <span className="text-white font-medium">
              {filteredCourses.length}
            </span>{" "}
            course{filteredCourses.length !== 1 ? "s" : ""}
            {searchQuery && (
              <>
                {" "}
                for "<span className="text-cyan-400">{searchQuery}</span>"
              </>
            )}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-lg hover:bg-cyan-500/10 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* ── ERROR BANNER ── */}
        {error && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3 text-yellow-400 text-sm mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* ── COURSE GRID ── */}
        <AnimatePresence mode="wait">
          {filteredCourses.length > 0 ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              {filteredCourses.map((course, i) => (
                <motion.div
                  key={course._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.35 }}
                  whileHover={{ y: -4 }}
                  className="bg-[#111318] border border-[#222530] rounded-xl overflow-hidden hover:border-[#3a3d4a] transition-colors flex flex-col"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video relative overflow-hidden bg-[#1a1d27]">
                    {course.thumbnail?.url ? (
                      <img
                        src={course.thumbnail.url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-700">
                        <svg
                          className="w-10 h-10"
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
                    {/* badges */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <span
                      className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded ${course.price === 0 ? "bg-emerald-500 text-white" : "bg-cyan-500 text-black"}`}
                    >
                      {course.price === 0 ? "Free" : `₹${course.price}`}
                    </span>
                    {course.level && (
                      <span className="absolute top-2 left-2 text-xs bg-black/60 text-gray-300 px-2 py-0.5 rounded">
                        {course.level}
                      </span>
                    )}
                    <span className="absolute bottom-2 left-2 text-xs text-cyan-300 font-medium">
                      {course.category}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-white text-sm font-semibold leading-snug line-clamp-2 mb-1">
                      {course.title}
                    </h3>
                    <p className="text-gray-500 text-xs line-clamp-2 mb-3 flex-1">
                      {course.description}
                    </p>

                    {/* meta row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Stars rating={course.averageRating} />
                        <span className="text-gray-600 text-xs">
                          ({course.averageRating?.toFixed(1) || "—"})
                        </span>
                      </div>
                      {course.duration && (
                        <span className="text-gray-600 text-xs">
                          ⏱ {course.duration}
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 text-xs mb-4">
                      By {course.createdBy?.name || "Unknown"}
                      {course.totalStudents
                        ? ` · ${course.totalStudents.toLocaleString()} students`
                        : ""}
                    </p>

                    {/* actions */}
                    <div className="space-y-2 mt-auto">
                      <button
                        onClick={() => navigate(`/course/${course._id}`)}
                        className="w-full py-2 rounded-lg text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-colors"
                      >
                        View Details
                      </button>
                      {course.price > 0 && (
                        <button
                          onClick={() => handleAddToCart(course._id)}
                          className="w-full py-2 rounded-lg text-xs font-medium text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 transition-colors"
                        >
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-white text-lg font-medium mb-1">
                No courses found
              </p>
              <p className="text-gray-600 text-sm mb-6">
                Try adjusting your search or filters
              </p>
              <button
                onClick={clearFilters}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2 px-6 rounded-lg text-sm transition-colors"
              >
                Clear Filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-12" />
      </div>
    </div>
  );
};

export default ExploreCourses;
