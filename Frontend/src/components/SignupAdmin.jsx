import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import { useAdminAuth } from "../context/AdminAuthContext";
import { LuEye, LuEyeClosed } from "react-icons/lu";

const SignupAdmin = () => {
  const navigate = useNavigate();
  const { adminSignup, adminGoogleLogin } = useAdminAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for toggling password visibility
  const [canSeePassword, setCanSeePassword] = useState(false);
  const [canSeeConfirmPassword, setCanSeeConfirmPassword] = useState(false);

  // Client-side validation matching backend requirements
  const validateForm = () => {
    const newErrors = {};

    // Full Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    } else if (formData.email.length < 8 || formData.email.length > 32) {
      newErrors.email = "Email must be between 8-32 characters";
    }

    // Password validation (matching backend Zod schema)
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else {
      if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters long";
      } else if (formData.password.length > 32) {
        newErrors.password = "Password must not exceed 32 characters";
      } else if (!/^(?=.*[a-z])/.test(formData.password)) {
        newErrors.password = "Must include lowercase";
      } else if (!/^(?=.*[A-Z])/.test(formData.password)) {
        newErrors.password = "Must include uppercase";
      } else if (!/^(?=.*\d)/.test(formData.password)) {
        newErrors.password = "Must include a number";
      } else if (
        !/^(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?])/.test(formData.password)
      ) {
        newErrors.password = "Must include special char";
      }
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    const result = await adminSignup(
      formData.fullName,
      formData.email,
      formData.password
    );

    if (result.success) {
      alert("Admin account created successfully! Please login.");
      navigate("/loginadmin");
    } else {
      setErrors({ submit: result.error });
    }

    setIsSubmitting(false);
  };

  // Handle Google OAuth Success
  const handleGoogleSuccess = async (credentialResponse) => {
    console.log(
      "🔍 Admin Google Signup - Credential Response:",
      credentialResponse
    );

    if (credentialResponse.credential) {
      const result = await adminGoogleLogin(credentialResponse.credential);

      if (result.success) {
        console.log("✅ Admin Google signup successful, redirecting...");
        navigate("/admin-dashboard");
      } else {
        console.error("❌ Admin Google signup failed:", result.error);
        setErrors({ submit: result.error });
      }
    } else {
      console.error("❌ No credential received from Google");
      setErrors({ submit: "Google authentication failed" });
    }
  };

  // Handle Google OAuth Error
  const handleGoogleError = () => {
    console.error("❌ Admin Google Signup Error");
    setErrors({ submit: "Google authentication failed" });
  };

  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-[50%]">
        <h1 className="text-white mt-40 text-5xl text-center">Admin Signup</h1>

        <form onSubmit={handleSubmit}>
          <div className="flex justify-center mt-10">
            <div className="w-[50%]">
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="text-gray-300 outline-none w-full h-[50px] pl-3 border-b-[0.5px] border-b-gray-600 mt-6 focus:border-b-cyan-300 bg-transparent"
                placeholder="Your Full Name"
                required
              />
              {errors.fullName && (
                <p className="text-red-400 text-sm mt-1">{errors.fullName}</p>
              )}
            </div>
          </div>

          <div className="flex justify-center mt-1">
            <div className="w-[50%]">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="text-gray-300 outline-none w-full h-[50px] pl-3 border-b-[0.5px] border-b-gray-600 mt-6 focus:border-b-cyan-300 bg-transparent"
                placeholder="Your Email"
                required
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          <div className="flex justify-center mt-1">
            <div className="w-[50%] relative">
              <input
                type={canSeePassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="text-gray-300 outline-none w-full h-[50px] pl-3 border-b-[0.5px] border-b-gray-600 mt-6 focus:border-b-cyan-300 bg-transparent pr-10"
                placeholder="Your Password"
                required
              />
              <AnimatePresence mode="wait" initial={false}>
                <motion.button
                  type="button"
                  aria-label={
                    canSeePassword ? "Hide password" : "Show password"
                  }
                  key={canSeePassword ? "eyeopen" : "eyeclosed"}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-3 text-xl text-gray-400 focus:outline-none hover:cursor-pointer hover:text-cyan-300"
                  onClick={() => setCanSeePassword((prev) => !prev)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  {canSeePassword ? <LuEyeClosed /> : <LuEye />}
                </motion.button>
              </AnimatePresence>
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password}</p>
              )}
            </div>
          </div>

          <div className="flex justify-center mt-1">
            <div className="w-[50%] relative">
              <input
                type={canSeeConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="text-gray-300 outline-none w-full h-[50px] pl-3 border-b-[0.5px] border-b-gray-600 mt-6 focus:border-b-cyan-300 bg-transparent pr-10 focus:outline-none"
                placeholder="Confirm Password"
                required
              />
              <AnimatePresence mode="wait" initial={false}>
                <motion.button
                  type="button"
                  onClick={() => setCanSeeConfirmPassword((prev) => !prev)}
                  aria-label={
                    canSeeConfirmPassword ? "Hide password" : "Show password"
                  }
                  key={canSeeConfirmPassword ? "eyeopen" : "eyeclosed"}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-3 text-xl text-gray-400 focus:outline-none hover:cursor-pointer hover:text-cyan-300"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  {canSeeConfirmPassword ? <LuEyeClosed /> : <LuEye />}
                </motion.button>
              </AnimatePresence>
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="flex justify-center mt-2">
              <p className="text-red-400 text-sm w-[50%] text-center">
                {errors.submit}
              </p>
            </div>
          )}

          <div className="flex justify-center">
            <h1 className="text-white mt-5 text-center">
              Already have an admin account?
            </h1>
            <Link
              to="/loginadmin"
              className="hover:text-cyan-300 transition-colors duration-300 text-white mt-5 ml-2"
            >
              Login
            </Link>
          </div>

          <div className="flex justify-center">
            <h1 className="text-white mt-5 text-center">Are you a student?</h1>
            <Link
              to="/signup"
              className="hover:text-cyan-300 transition-colors duration-300 text-white mt-5 ml-2"
            >
              Signup here
            </Link>
          </div>

          <div className="flex justify-center mt-5">
            <motion.button
              type="submit"
              disabled={isSubmitting}
              className={`cursor-pointer bg-gradient-to-br from-cyan-200 to-cyan-300 p-1 px-3 text-black rounded-2xl w-[50%] h-10 flex items-center justify-center ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
              initial={{ scale: 1 }}
              whileTap={{ scale: 0.95 }}
            >
              <h1 className="text-2xl text-center">
                {isSubmitting ? "Creating..." : "Signup"}
              </h1>
            </motion.button>
          </div>

          {/* Google OAuth Signup */}
          <div className="flex justify-center ">
            <div className="w-[100%]">
                          <div className="flex items-center w-[60%] mx-auto my-5 text-white text-lg">
                            <div className="flex-1 border-t border-gray-200"></div>
                            <span className="px-3">OR</span>
                            <div className="flex-1 border-t border-gray-200"></div>
                          </div>
            
                          <div className="flex justify-center mt-5 font-poppins">
                            <GoogleLogin
                              onSuccess={handleGoogleSuccess}
                              onError={handleGoogleError}
                            />
                          </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupAdmin;
