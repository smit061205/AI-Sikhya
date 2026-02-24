import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { AnimatePresence, motion } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import adminApi from "../api/adminApi";

const LoginAdmin = () => {
  const navigate = useNavigate();
  const { adminLogin, adminGoogleLogin } = useAdminAuth();

  // ref for password input and state for visibility
  const passRef = useRef(null);
  const [canSee, setCanSee] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password (OTP) states
  const [showForgot, setShowForgot] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpConfirmPassword, setFpConfirmPassword] = useState("");
  const [fpStep, setFpStep] = useState(1); // 1: send OTP, 2: reset password
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMessage, setFpMessage] = useState("");
  const [fpSee1, setFpSee1] = useState(false);
  const [fpSee2, setFpSee2] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
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

  const handleToggle = () => {
    setCanSee(!canSee);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      console.log("Attempting admin login with:", formData.email);
      const result = await adminLogin(formData.email, formData.password);
      console.log("Admin login result:", result);

      if (result && result.success) {
        console.log("Admin login successful, navigating to admin dashboard");
        navigate("/admin-dashboard");
      } else {
        console.log("Admin login failed:", result?.error);
        setErrors({ submit: result?.error || "Admin login failed" });
      }
    } catch (err) {
      console.error("Admin login error:", err);
      setErrors({ submit: err.message || "Admin login failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google OAuth Success
  const handleGoogleSuccess = async (credentialResponse) => {
    console.log(
      "🔍 Admin Google Login - Credential Response:",
      credentialResponse
    );

    if (credentialResponse.credential) {
      const result = await adminGoogleLogin(credentialResponse.credential);

      if (result.success) {
        console.log("✅ Admin Google login successful, redirecting...");
        navigate("/admin-dashboard");
      } else {
        console.error("❌ Admin Google login failed:", result.error);
        setErrors({ submit: result.error });
      }
    } else {
      console.error("❌ No credential received from Google");
      setErrors({ submit: "Google authentication failed" });
    }
  };

  // Handle Google OAuth Error
  const handleGoogleError = () => {
    console.error("❌ Admin Google Login Error");
    setErrors({ submit: "Google authentication failed" });
  };

  // --- Admin Forgot Password Flow ---
  const openForgotPanel = () => {
    setShowForgot(true);
    setFpEmail(formData.email || "");
    setErrors({});
    setFpMessage("");
    setFpStep(1);
  };

  const backToLogin = () => {
    setShowForgot(false);
    setFpStep(1);
    setFpMessage("");
    setErrors({});
  };

  const handleSendOtp = async () => {
    try {
      setFpMessage("");
      if (!fpEmail) {
        setErrors({ submit: "Email is required" });
        return;
      }
      setFpLoading(true);
      await adminApi.post("/admin/forgot-password/send-otp", {
        email: fpEmail,
      });
      setFpMessage("OTP sent to your email.");
      setFpStep(2);
    } catch (err) {
      console.error("Send OTP error:", err);
      setErrors({ submit: err.response?.data?.error || "Failed to send OTP" });
    } finally {
      setFpLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      setFpMessage("");
      if (!fpOtp || !fpNewPassword || !fpConfirmPassword) {
        setErrors({ submit: "All fields are required" });
        return;
      }
      if (fpNewPassword !== fpConfirmPassword) {
        setErrors({ submit: "Passwords do not match" });
        return;
      }
      setFpLoading(true);
      await adminApi.put("/admin/forgot-password/reset", {
        email: fpEmail,
        otp: fpOtp,
        newPassword: fpNewPassword,
      });
      setSuccessMsg("Password changed successfully. Please log in.");
      setShowForgot(false);
      setFormData((prev) => ({ ...prev, email: fpEmail, password: "" }));
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err) {
      console.error("Reset password error:", err);
      setErrors({
        submit: err.response?.data?.error || "Failed to reset password",
      });
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <div className="w-[50%]">
        {!showForgot ? (
          <>
            <h1 className="text-white mt-40 text-5xl text-center">
              Admin Login
            </h1>
            {successMsg && (
              <div className="flex justify-center mt-3">
                <p className="text-green-400 text-sm w-[50%] text-center">
                  {successMsg}
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="flex justify-center mt-10">
                <div className="w-[50%]">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="text-gray-300 outline-none w-full h-[50px] pl-3 border-b-[0.5px] border-b-gray-600 mt-6 focus:border-b-cyan-300 bg-transparent"
                    placeholder="Admin Email"
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
                    type={canSee ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="text-gray-300 outline-none w-full h-[50px] pl-3 pr-10 border-b-[0.5px] border-b-gray-600 mt-6 focus:border-b-cyan-300 bg-transparent"
                    placeholder="Your Password"
                    required
                    ref={passRef}
                  />
                  <motion.button
                    type="button"
                    onClick={handleToggle}
                    aria-label={canSee ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-cyan-300 transition-colors duration-300 cursor-pointer mt-4"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={canSee ? "visible" : "hidden"}
                        initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                      >
                        {canSee ? <LuEye /> : <LuEyeClosed />}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>

                  {errors.password && (
                    <p className="text-red-400 text-sm mt-1">
                      {errors.password}
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
                  Don't have an admin account?
                </h1>
                <Link
                  to="/signupadmin"
                  className="hover:text-cyan-300 transition-colors duration-300 text-white mt-5 ml-2"
                >
                  Signup
                </Link>
              </div>

              <div className="flex justify-center">
                <h1 className="text-white mt-3 text-center">
                  Are you a student?
                </h1>
                <Link
                  to="/login"
                  className="hover:text-cyan-300 transition-colors duration-300 text-white mt-3 ml-2"
                >
                  Login here
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
                    {isSubmitting ? "Logging in..." : "Login"}
                  </h1>
                </motion.button>
              </div>

              {/* Google OAuth Login */}
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

              {/* Forgot Password trigger */}
              <div className="flex justify-center items-center mt-5 gap-2">
                <span className="text-white">Forgot Password?</span>
                <button
                  type="button"
                  onClick={openForgotPanel}
                  className="text-cyan-300 hover:text-cyan-200 transition-colors duration-300"
                >
                  Click here
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-white mt-40 text-5xl text-center">
              Forgot Password
            </h1>
            <div className="flex justify-center mt-10">
              <div className="w-[50%] bg-black border border-gray-700 p-5 rounded-2xl">
                {fpStep === 1 ? (
                  <div>
                    <input
                      type="email"
                      value={fpEmail}
                      onChange={(e) => setFpEmail(e.target.value)}
                      className="text-gray-300 outline-none w-full h-[50px] pl-3 border-b-[0.5px] border-b-gray-600 mt-6 focus:border-b-cyan-300 bg-transparent"
                      placeholder="Email"
                      required
                    />
                    {errors.submit && (
                      <p className="text-red-400 text-sm mt-1">
                        {errors.submit}
                      </p>
                    )}
                    <motion.button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={fpLoading}
                      className={`mt-6 cursor-pointer bg-gradient-to-br from-cyan-200 to-cyan-300 p-1 px-3 text-black rounded-2xl w-full h-10 flex items-center justify-center ${
                        fpLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      initial={{ scale: 1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <h1 className="text-2xl text-center">
                        {fpLoading ? "Sending OTP..." : "Send OTP"}
                      </h1>
                    </motion.button>
                    <p className="text-white text-sm mt-2">{fpMessage}</p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={fpOtp}
                      onChange={(e) => setFpOtp(e.target.value)}
                      className="text-gray-300 outline-none w-full h-[50px] pl-3 border-b-[0.5px] border-b-gray-600 mt-6 focus:border-b-cyan-300 bg-transparent"
                      placeholder="OTP"
                      required
                    />
                    <div className="relative">
                      <input
                        type={fpSee1 ? "text" : "password"}
                        value={fpNewPassword}
                        onChange={(e) => setFpNewPassword(e.target.value)}
                        className="text-gray-300 outline-none w-full h-[50px] pl-3 pr-10 border-b-[0.5px] border-b-gray-600 mt-6 focus:border-b-cyan-300 bg-transparent"
                        placeholder="New Password"
                        required
                      />
                      <motion.button
                        type="button"
                        onClick={() => setFpSee1((p) => !p)}
                        aria-label={fpSee1 ? "Hide password" : "Show password"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-cyan-300 transition-colors duration-300 cursor-pointer mt-3"
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={fpSee1 ? "visible" : "hidden"}
                            initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                          >
                            {fpSee1 ? <LuEye /> : <LuEyeClosed />}
                          </motion.span>
                        </AnimatePresence>
                      </motion.button>
                    </div>

                    <div className="relative">
                      <input
                        type={fpSee2 ? "text" : "password"}
                        value={fpConfirmPassword}
                        onChange={(e) => setFpConfirmPassword(e.target.value)}
                        className="text-gray-300 outline-none w-full h-[50px] pl-3 pr-10 border-b-[0.5px] border-b-gray-600 mt-6 focus:border-b-cyan-300 bg-transparent"
                        placeholder="Confirm Password"
                        required
                      />
                      <motion.button
                        type="button"
                        onClick={() => setFpSee2((p) => !p)}
                        aria-label={fpSee2 ? "Hide password" : "Show password"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-cyan-300 transition-colors duration-300 cursor-pointer mt-3"
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={fpSee2 ? "visible" : "hidden"}
                            initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                          >
                            {fpSee2 ? <LuEye /> : <LuEyeClosed />}
                          </motion.span>
                        </AnimatePresence>
                      </motion.button>
                    </div>
                    {errors.submit && (
                      <p className="text-red-400 text-sm mt-1">
                        {errors.submit}
                      </p>
                    )}
                    <motion.button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={fpLoading}
                      className={`mt-6 cursor-pointer bg-gradient-to-br from-cyan-200 to-cyan-300 p-1 px-3 text-black rounded-2xl w-full h-10 flex items-center justify-center ${
                        fpLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      initial={{ scale: 1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <h1 className="text-2xl text-center">
                        {fpLoading ? "Resetting Password..." : "Reset Password"}
                      </h1>
                    </motion.button>
                    <p className="text-white text-sm mt-2">{fpMessage}</p>
                  </div>
                )}
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={backToLogin}
                    className="text-white hover:text-cyan-300 transition-colors duration-300"
                  >
                    ← Back to login
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginAdmin;
