import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";
import Lenis from "lenis";

const CreateCourse = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    level: "Beginner",
    tags: "",
    duration: "",
    price: 0,
  });
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { adminToken } = useAdminAuth();

  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: "vertical",
      gestureDirection: "vertical",
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setError("Thumbnail size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }
      setThumbnail(file);
      setThumbnailPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formDataToSend = new FormData();

      // Add all form fields to FormData
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("category", formData.category);
      formDataToSend.append("level", formData.level);
      formDataToSend.append("tags", formData.tags);
      formDataToSend.append("duration", formData.duration);
      formDataToSend.append("price", formData.price);

      if (thumbnail) {
        formDataToSend.append("thumbnail", thumbnail);
      }

      const response = await adminApi.post("/admin/courses", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 201) {
        alert("Course created successfully!");
        navigate("/admin-dashboard");
      }
    } catch (err) {
      console.error("Course creation error:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to create course. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const key = e.target.id || e.target.name;
    setFormData({ ...formData, [key]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-black border border-gray-700 rounded-2xl p-8">
        <h2 className="text-3xl font-bold mb-6 text-center">
          Create New Course
        </h2>
        <form onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <div className="mb-4">
            <label
              htmlFor="title"
              className="block text-sm font-medium mb-2 text-gray-400"
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full p-3 bg-black rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-sm font-medium mb-2 text-gray-400"
            >
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-3 bg-black rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              required
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="category"
              className="block text-sm font-medium mb-2 text-gray-400"
            >
              Category
            </label>
            <input
              type="text"
              id="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full p-3 bg-black rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Course Level
            </label>
            <select
              name="level"
              value={formData.level}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-black border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div className="mb-6 mt-3">
            <label
              htmlFor="price"
              className="block text-sm font-medium mb-2 text-gray-400"
            >
              Price
            </label>
            <input
              type="number"
              id="price"
              value={formData.price}
              onChange={handleChange}
              className="w-full p-3 bg-black rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              required
            />
          </div>
          <div className="mb-6 mt-3">
            <label
              htmlFor="thumbnail"
              className="block text-sm font-medium mb-2 text-gray-400"
            >
              Thumbnail
            </label>
            <input
              type="file"
              id="thumbnail"
              onChange={handleThumbnailChange}
              className="w-full p-3 bg-black rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              required
            />
            {thumbnailPreview && (
              <img
                src={thumbnailPreview}
                alt="Thumbnail Preview"
                className="w-full h-48 object-cover mt-4"
              />
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-br from-cyan-200 to-cyan-300 text-black font-semibold py-2.5 px-4 rounded-2xl focus:outline-none disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Course"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateCourse;
