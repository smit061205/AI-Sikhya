import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "./PasswordInput";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AnimatePresence, motion } from "framer-motion";
import { ReactLenis, useLenis } from "lenis/react";
const UserProfile = () => {
  const [profilePicture, setProfilePicture] = useState(null);
  const [activeSection, setActiveSection] = useState("Profile");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(null);

  // Photo upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    headline: "",
    country: "",
    profession: "",
    dateOfBirth: "",
    gender: "",
    socialLinks: {
      x: "",
      linkedin: "",
      github: "",
      website: "",
    },
  });

  // State for Security Section
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);

  const { user, logout } = useAuth();

  const toggleCountryDropdown = () => {
    setIsCountryDropdownOpen(!isCountryDropdownOpen);
    setFocusedIndex(-1);
    setSearchTerm("");
  };

  const handleCountrySelect = (countryObj) => {
    setFormData((prev) => ({
      ...prev,
      country: countryObj.name,
    }));
    setIsCountryDropdownOpen(false);
    setFocusedIndex(-1);
    setSearchTerm("");
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isCountryDropdownOpen) return;

    const key = e.key.toLowerCase();

    // Handle letter keys for jumping to countries
    if (key.match(/[a-z]/)) {
      e.preventDefault();
      const firstCountryIndex = countries.findIndex((country) =>
        country.name.toLowerCase().startsWith(key),
      );

      if (firstCountryIndex !== -1) {
        setFocusedIndex(firstCountryIndex);
        // Scroll to the focused item
        const dropdownElement = dropdownRef.current;
        if (dropdownElement) {
          const itemHeight = 40; // Approximate height of each item
          dropdownElement.scrollTop = firstCountryIndex * itemHeight;
        }
      }
      return;
    }

    // Handle arrow keys
    if (key === "arrowdown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < countries.length - 1 ? prev + 1 : 0));
    } else if (key === "arrowup") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : countries.length - 1));
    } else if (key === "enter") {
      e.preventDefault();
      if (focusedIndex >= 0) {
        handleCountrySelect(countries[focusedIndex]);
      }
    } else if (key === "escape") {
      e.preventDefault();
      setIsCountryDropdownOpen(false);
      setFocusedIndex(-1);
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && dropdownRef.current) {
      const dropdownElement = dropdownRef.current;
      const itemHeight = 40;
      const scrollTop = dropdownElement.scrollTop;
      const dropdownHeight = dropdownElement.clientHeight;
      const itemTop = focusedIndex * itemHeight;
      const itemBottom = itemTop + itemHeight;

      if (itemTop < scrollTop) {
        dropdownElement.scrollTop = itemTop;
      } else if (itemBottom > scrollTop + dropdownHeight) {
        dropdownElement.scrollTop = itemBottom - dropdownHeight;
      }
    }
  }, [focusedIndex]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem("token");

        if (!token) {
          return;
        }

        // Use axios - interceptor will automatically add Authorization header
        const response = await axios.get("/user/profile");


        // Use unified field first, fallback to old fields
        const imageUrl =
          response.data.profileImageUrl ||
          response.data.profilePicture ||
          response.data.profilePhoto?.url;

        setProfilePicture(imageUrl);

        // Pre-populate form data with existing user data
        setFormData({
          username: response.data.username || "",
          headline: response.data.headline || "",
          country: response.data.country || "",
          profession: response.data.profession || "",
          dateOfBirth: response.data.dateOfBirth
            ? new Date(response.data.dateOfBirth).toISOString().split("T")[0]
            : "",
          gender: response.data.gender || "",
          socialLinks: {
            x: response.data.socialLinks?.x || "",
            linkedin: response.data.socialLinks?.linkedin || "",
            github: response.data.socialLinks?.github || "",
            website: response.data.socialLinks?.website || "",
          },
        });
      } catch (error) {

        // If token is invalid, logout user
        if (error.response?.status === 401) {
          logout();
        }
      }
    };

    fetchProfile();
  }, [logout]);

  useEffect(() => {
    const updateProfile = async () => {
      const res = await axios.put(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
        }/api/users/profile`,
      );
    };
  });

  const renderSection = () => {
    switch (activeSection) {
      case "Profile":
        return (
          <div>
            <ReactLenis
              root
              options={{
                lerp: 0.1, // snappier scroll (0.1–0.2 is ideal)
                duration: 1, // faster animation duration
                wheelMultiplier: 2.5, // scroll farther per mouse wheel gesture
                smoothWheel: true, // enable smooth wheel scroll
                smoothTouch: true,
              }}
            />
            <h1 className="text-white text-3xl text-center mt-5 border-b-[1px] pb-3 border-gray-600">
              User Profile
            </h1>
            <form onSubmit={handleSubmit}>
              <div className="flex justify-center mt-10">
                <h1 className="text-white text-lg mt-2 ">Username :</h1>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="username"
                  className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200 ml-2"
                />
              </div>
              <div className="flex justify-center mt-5 ml-4">
                <h1 className="text-white text-lg mt-2 pr-1 mr-2">
                  Headline :
                </h1>
                <textarea
                  name="headline"
                  value={formData.headline}
                  onChange={handleInputChange}
                  placeholder="Your professional headline"
                  className="bg-gray-950 text-white p-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200 resize-none"
                ></textarea>
              </div>
              <div className="flex justify-center mt-5">
                <h1 className="text-white text-lg mt-2 mr-1">Country :</h1>
                <div className="relative">
                  <button
                    type="button"
                    onClick={toggleCountryDropdown}
                    onKeyDown={handleKeyDown}
                    className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200 ml-2 text-left flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      {formData.country ? (
                        <>
                          <span className="mr-2 text-lg">
                            {
                              countries.find((c) => c.name === formData.country)
                                ?.flag
                            }
                          </span>
                          {formData.country}
                        </>
                      ) : (
                        "Select a country"
                      )}
                    </span>
                    <svg
                      className={`w-4 h-4 mr-2 transition-transform duration-200 ${
                        isCountryDropdownOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isCountryDropdownOpen && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-10 w-96 mt-1 ml-2 bg-gray-900 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
                      onKeyDown={handleKeyDown}
                      tabIndex={-1}
                    >
                      {countries.map((countryObj, index) => (
                        <button
                          key={countryObj.name}
                          type="button"
                          onClick={() => handleCountrySelect(countryObj)}
                          className={`w-full text-left px-3 py-2 text-white hover:bg-cyan-500 hover:text-black transition-colors duration-200 border-b border-gray-700 last:border-b-0 flex items-center ${
                            index === focusedIndex
                              ? "bg-cyan-500 text-black"
                              : ""
                          }`}
                        >
                          <span className="mr-3 text-lg">
                            {countryObj.flag}
                          </span>
                          {countryObj.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center mt-5 ml-2">
                <h1 className="text-white text-lg mt-2">Profession :</h1>
                <input
                  type="text"
                  name="profession"
                  value={formData.profession}
                  onChange={handleInputChange}
                  placeholder="Your profession"
                  className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200 ml-3"
                />
              </div>

              <div className="flex justify-center mt-5">
                <h1 className="text-white text-lg mt-2 mr-1">
                  Date of Birth :
                </h1>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200 ml-2"
                />
              </div>

              <div className="flex justify-center mt-5">
                <h1 className="text-white text-lg mt-2 ml-10 mr-1">Gender :</h1>
                <div className="relative mr-3">
                  <button
                    type="button"
                    onClick={() =>
                      setIsGenderDropdownOpen(!isGenderDropdownOpen)
                    }
                    className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200 ml-2 text-left flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      {formData.gender ? (
                        <>
                          <span className="mr-2 text-lg">
                            {
                              genderOptions.find(
                                (g) => g.value === formData.gender,
                              )?.icon
                            }
                          </span>
                          {formData.gender}
                        </>
                      ) : (
                        "Select a gender"
                      )}
                    </span>
                    <svg
                      className={`w-4 h-4 mr-2 transition-transform duration-200 ${
                        isGenderDropdownOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isGenderDropdownOpen && (
                    <div className="absolute z-10 w-96 mt-1 ml-2 bg-gray-900 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {genderOptions.map((genderOption) => (
                        <button
                          key={genderOption.value}
                          type="button"
                          onClick={() => handleGenderSelect(genderOption)}
                          className={`w-full text-left px-3 py-2 text-white hover:bg-cyan-500 hover:text-black transition-colors duration-200 border-b border-gray-700 last:border-b-0 flex items-center`}
                        >
                          <span className="mr-3 text-lg">
                            {genderOption.icon}
                          </span>
                          {genderOption.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Social Links Section */}
              <div className="mt-8 border-t border-gray-600 pt-6">
                <h2 className="text-white text-xl text-center mb-6">
                  Social Links
                </h2>

                <div className="flex justify-center mt-5">
                  <h1 className="text-white text-lg mt-2">Twitter/X :</h1>
                  <input
                    type="url"
                    name="socialLinks.x"
                    value={formData.socialLinks.x}
                    onChange={handleInputChange}
                    placeholder="https://twitter.com/username"
                    className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200 ml-3"
                  />
                </div>

                <div className="flex justify-center mt-5">
                  <h1 className="text-white text-lg mt-2">LinkedIn :</h1>
                  <input
                    type="url"
                    name="socialLinks.linkedin"
                    value={formData.socialLinks.linkedin}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/in/username"
                    className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200 ml-3"
                  />
                </div>

                <div className="flex justify-center mt-5">
                  <h1 className="text-white text-lg mt-2">GitHub :</h1>
                  <input
                    type="url"
                    name="socialLinks.github"
                    value={formData.socialLinks.github}
                    onChange={handleInputChange}
                    placeholder="https://github.com/username"
                    className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200 ml-3"
                  />
                </div>

                <div className="flex justify-center mt-5">
                  <h1 className="text-white text-lg mt-2">Website :</h1>
                  <input
                    type="url"
                    name="socialLinks.website"
                    value={formData.socialLinks.website}
                    onChange={handleInputChange}
                    placeholder="https://your-website.com"
                    className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200 ml-3"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex flex-col items-center mt-8 mb-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-96 h-12 rounded-2xl font-semibold text-xl transition-all duration-200 ${
                    isSubmitting
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-br from-cyan-200 to-cyan-300 text-black hover:bg-cyan-400 focus:scale-95"
                  }`}
                >
                  {isSubmitting ? "Updating Profile..." : "Update Profile"}
                </button>
              </div>
            </form>
          </div>
        );
      case "Photo":
        return (
          <div>
            <h1 className="text-white text-3xl text-center mt-5 border-b-[1px] pb-3 border-gray-600">
              Profile Photo
            </h1>

            <div className="flex flex-col items-center mt-10">
              {/* Current Profile Photo */}
              <div className="mb-8">
                <h2 className="text-white text-xl text-center mb-4">
                  Current Photo
                </h2>
                <div className="w-40 h-40 rounded-full border-2 border-gray-600 overflow-hidden bg-gray-800 flex items-center justify-center">
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt="Current Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-sm">No photo</span>
                  )}
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="w-full max-w-md">
                <h2 className="text-white text-xl text-center mb-4">
                  Upload New Photo
                </h2>

                {/* File Input */}
                <div className="mb-6">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="block w-full p-4 border-2 border-dashed border-gray-600 rounded-lg text-center cursor-pointer hover:border-cyan-300 transition-colors duration-200"
                  >
                    <span className="text-white">
                      {selectedFile
                        ? selectedFile.name
                        : "Click to select a photo"}
                    </span>
                    <p className="text-gray-400 text-sm mt-2">
                      Supports: JPG, PNG, GIF (Max: 5MB)
                    </p>
                  </label>
                </div>

                {/* Photo Preview */}
                {previewUrl && (
                  <div className="mb-6">
                    <h3 className="text-white text-lg text-center mb-3">
                      Preview
                    </h3>
                    <div className="w-32 h-32 rounded-full border-2 border-cyan-300 overflow-hidden mx-auto">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <div className="flex justify-center space-x-4">
                  {selectedFile && (
                    <button
                      onClick={handlePhotoUpload}
                      disabled={isUploading}
                      className={`px-6 py-2 rounded-md font-semibold transition-all duration-200 ${
                        isUploading
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-cyan-500 text-black hover:bg-cyan-400"
                      }`}
                    >
                      {isUploading ? "Uploading..." : "Update Photo"}
                    </button>
                  )}

                  {selectedFile && (
                    <button
                      onClick={handleClearSelection}
                      className="px-6 py-2 rounded-md font-semibold bg-gray-600 text-white hover:bg-gray-500 transition-colors duration-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case "Account Security":
        return (
          <div>
            <h1 className="text-white text-3xl text-center mt-5 border-b-[1px] pb-3 border-gray-600">
              Account Security
            </h1>

            {/* Change Password Form */}
            <div className="mt-8">
              <h2 className="text-white text-xl text-center mb-6">
                Change Password
              </h2>
              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <div className="flex justify-center items-center">
                  <h1 className="text-white text-lg w-40 text-right mr-4">
                    Old Password :
                  </h1>
                  <PasswordInput
                    name="oldPassword"
                    value={passwordData.oldPassword}
                    onChange={handlePasswordChange}
                    className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200"
                  />
                </div>
                <div className="flex justify-center items-center">
                  <h1 className="text-white text-lg w-40 text-right mr-4">
                    New Password :
                  </h1>
                  <PasswordInput
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200"
                  />
                </div>
                <div className="flex justify-center items-center">
                  <h1 className="text-white text-lg w-40 text-right mr-4">
                    Confirm New :
                  </h1>
                  <PasswordInput
                    name="confirmNewPassword"
                    value={passwordData.confirmNewPassword}
                    onChange={handlePasswordChange}
                    className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200"
                  />
                </div>
                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    disabled={securityLoading}
                    className={`w-[28rem] h-12 rounded-2xl font-semibold text-xl transition-all duration-200 ${
                      securityLoading
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-br from-cyan-200 to-cyan-300 text-black hover:bg-cyan-400 focus:scale-95"
                    }`}
                  >
                    {securityLoading ? "Saving..." : "Save Password"}
                  </button>
                </div>
              </form>
            </div>

            {/* Forgot Password Form */}
            <div className="mt-8 border-t border-gray-600 pt-6">
              <h2 className="text-white text-xl text-center mb-6">
                Forgot Your Password?
              </h2>
              <div className="space-y-5">
                <div className="flex justify-center items-center">
                  <h1 className="text-white text-lg w-40 text-right mr-4">
                    Enter Your Email :
                  </h1>
                  <div className="flex items-center w-96">
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="bg-gray-950 text-white pl-2 flex-grow h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200"
                      disabled={otpSent}
                    />
                    <button
                      onClick={handleSendOtp}
                      disabled={securityLoading || otpSent}
                      className="ml-4 py-2 px-4 bg-gradient-to-br from-cyan-200 to-cyan-300 text-black rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:bg-cyan-400 focus:scale-95"
                    >
                      {securityLoading ? "..." : "Send OTP"}
                    </button>
                  </div>
                </div>

                {otpSent && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-5"
                    >
                      <div className="flex justify-center items-center">
                        <h1 className="text-white text-lg w-40 text-right mr-4">
                          Enter OTP :
                        </h1>
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="6-digit code"
                          className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200"
                        />
                      </div>
                      <div className="flex justify-center items-center">
                        <h1 className="text-white text-lg w-40 text-right mr-4">
                          New Password :
                        </h1>
                        <PasswordInput
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200"
                        />
                      </div>
                      <div className="flex justify-center items-center">
                        <h1 className="text-white text-lg w-40 text-right mr-4">
                          Confirm New :
                        </h1>
                        <PasswordInput
                          name="confirmNewPassword"
                          value={passwordData.confirmNewPassword}
                          onChange={handlePasswordChange}
                          className="bg-gray-950 text-white pl-2 w-96 h-10 focus:outline-none border-b-[1px] border-white focus:border-cyan-300 transition-colors duration-200"
                        />
                      </div>
                      <div className="flex justify-center pt-4">
                        <button
                          onClick={handleResetPassword}
                          disabled={securityLoading}
                          className={`w-[28rem] h-12 rounded-2xl font-semibold text-lg transition-all duration-200 ${
                            securityLoading
                              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                              : "bg-gradient-to-br from-cyan-200 to-cyan-300 text-black hover:bg-cyan-400 focus:scale-95"
                          }`}
                        >
                          {securityLoading ? "Resetting..." : "Reset Password"}
                        </button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        );
      case "Logout":
        // Call logout function and maybe show a message or redirect
        logout();
        return (
          <h1 className="text-white text-3xl">You have been logged out.</h1>
        );
      default:
        return <h1 className="text-white text-3xl">User Profile</h1>;
    }
  };

  const genderOptions = [
    { value: "Male", label: "Male", icon: "" },
    { value: "Female", label: "Female", icon: "" },
    { value: "Other", label: "Other", icon: "" },
    { value: "Prefer not to say", label: "Prefer not to say", icon: "" },
  ];

  const handleGenderSelect = (genderOption) => {
    setFormData((prev) => ({ ...prev, gender: genderOption.value }));
    setIsGenderDropdownOpen(false);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      // Handle nested objects like socialLinks
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Submit form data to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await axios.put("/user/profile", formData);

    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  // Photo upload handlers
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("profilePhoto", selectedFile);

      const response = await axios.put("/user/profile-photo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Update profile picture with new URL
      setProfilePicture(response.data.profileImageUrl);
      setFormData((prev) => ({
        ...prev,
        profileImageUrl: response.data.profileImageUrl,
      }));

      // Clear selection
      setSelectedFile(null);
      setPreviewUrl(null);

      // Reset file input
      document.getElementById("photo-upload").value = "";

    } catch (error) {
      alert(
        error.response?.data?.error ||
          "Failed to upload photo. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    document.getElementById("photo-upload").value = "";
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setSecurityLoading(true);
    try {
      const response = await axios.put("/user/change-password", {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success(response.data.message);
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (error) {
      toast.error(error.response?.data?.error || "An error occurred.");
    }
    setSecurityLoading(false);
  };

  const handleSendOtp = async () => {
    if (!resetEmail) {
      toast.error("Please enter your email address.");
      return;
    }
    setSecurityLoading(true);
    try {
      const response = await axios.post("/user/forgot-password/send-otp", {
        email: resetEmail,
      });
      toast.success(response.data.message);
      setOtpSent(true);
    } catch (error) {
      toast.error(error.response?.data?.error || "An error occurred.");
    }
    setSecurityLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setSecurityLoading(true);
    try {
      const response = await axios.put("/user/forgot-password/reset", {
        email: resetEmail,
        otp,
        newPassword: passwordData.newPassword,
      });
      toast.success(response.data.message);
      setOtpSent(false);
      setOtp("");
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (error) {
      toast.error(error.response?.data?.error || "An error occurred.");
    }
    setSecurityLoading(false);
  };

  const countries = [
    { name: "Afghanistan", flag: "" },
    { name: "Albania", flag: "" },
    { name: "Algeria", flag: "" },
    { name: "Argentina", flag: "" },
    { name: "Armenia", flag: "" },
    { name: "Australia", flag: "" },
    { name: "Austria", flag: "" },
    { name: "Azerbaijan", flag: "" },
    { name: "Bahrain", flag: "" },
    { name: "Bangladesh", flag: "" },
    { name: "Belarus", flag: "" },
    { name: "Belgium", flag: "" },
    { name: "Bolivia", flag: "" },
    { name: "Bosnia and Herzegovina", flag: "" },
    { name: "Brazil", flag: "" },
    { name: "Bulgaria", flag: "" },
    { name: "Cambodia", flag: "" },
    { name: "Canada", flag: "" },
    { name: "Chile", flag: "" },
    { name: "China", flag: "" },
    { name: "Colombia", flag: "" },
    { name: "Costa Rica", flag: "" },
    { name: "Croatia", flag: "" },
    { name: "Czech Republic", flag: "" },
    { name: "Denmark", flag: "" },
    { name: "Dominican Republic", flag: "" },
    { name: "Ecuador", flag: "" },
    { name: "Egypt", flag: "" },
    { name: "Estonia", flag: "" },
    { name: "Ethiopia", flag: "" },
    { name: "Finland", flag: "" },
    { name: "France", flag: "" },
    { name: "Georgia", flag: "" },
    { name: "Germany", flag: "" },
    { name: "Ghana", flag: "" },
    { name: "Greece", flag: "" },
    { name: "Guatemala", flag: "" },
    { name: "Honduras", flag: "" },
    { name: "Hungary", flag: "" },
    { name: "Iceland", flag: "" },
    { name: "India", flag: "" },
    { name: "Indonesia", flag: "" },
    { name: "Iran", flag: "" },
    { name: "Iraq", flag: "" },
    { name: "Ireland", flag: "" },
    { name: "Israel", flag: "" },
    { name: "Italy", flag: "" },
    { name: "Japan", flag: "" },
    { name: "Jordan", flag: "" },
    { name: "Kazakhstan", flag: "" },
    { name: "Kenya", flag: "" },
    { name: "Kuwait", flag: "" },
    { name: "Latvia", flag: "" },
    { name: "Lebanon", flag: "" },
    { name: "Lithuania", flag: "" },
    { name: "Luxembourg", flag: "" },
    { name: "Malaysia", flag: "" },
    { name: "Mexico", flag: "" },
    { name: "Morocco", flag: "" },
    { name: "Netherlands", flag: "" },
    { name: "New Zealand", flag: "" },
    { name: "Nigeria", flag: "" },
    { name: "Norway", flag: "" },
    { name: "Pakistan", flag: "" },
    { name: "Peru", flag: "" },
    { name: "Philippines", flag: "" },
    { name: "Poland", flag: "" },
    { name: "Portugal", flag: "" },
    { name: "Qatar", flag: "" },
    { name: "Romania", flag: "" },
    { name: "Russia", flag: "" },
    { name: "Saudi Arabia", flag: "" },
    { name: "Singapore", flag: "" },
    { name: "Slovakia", flag: "" },
    { name: "Slovenia", flag: "" },
    { name: "South Africa", flag: "" },
    { name: "South Korea", flag: "" },
    { name: "Spain", flag: "" },
    { name: "Sri Lanka", flag: "" },
    { name: "Sweden", flag: "" },
    { name: "Switzerland", flag: "" },
    { name: "Thailand", flag: "" },
    { name: "Turkey", flag: "" },
    { name: "Ukraine", flag: "" },
    { name: "United Arab Emirates", flag: "" },
    { name: "United Kingdom", flag: "" },
    { name: "United States", flag: "" },
    { name: "Uruguay", flag: "" },
    { name: "Venezuela", flag: "" },
    { name: "Vietnam", flag: "" },
  ];

  return (
    <div className="h-screen flex w-full mb-20">
      <div className="border-[1px] border-gray-700 w-[20%] ml-28 flex flex-col mt-10">
        <div className="flex items-center justify-center w-full  mt-6">
          <img
            src={profilePicture}
            alt="Profile Picture"
            className="w-28 h-28 rounded-full "
          />
        </div>
        <h1 className="text-white text-center text-xl mt-3">
          {user?.username}
        </h1>
        <h1 className="text-white text-center text-sm mt-1">{user?.email}</h1>
        <div className="w-full mt-10 space-y-1 pb-2">
          <button
            onClick={() => setActiveSection("Profile")}
            className={`text-white text-start py-1 pl-12 w-full text-md hover:bg-cyan-500 hover:text-black ${
              activeSection === "Profile" ? "bg-cyan-500 text-black" : ""
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveSection("Photo")}
            className={`text-white text-start py-1 pl-12 w-full text-md hover:bg-cyan-500 hover:text-black ${
              activeSection === "Photo" ? "bg-cyan-500 text-black" : ""
            }`}
          >
            Photo
          </button>
          <button
            onClick={() => setActiveSection("Account Security")}
            className={`text-white text-start py-1 pl-12 w-full text-md hover:bg-cyan-500 hover:text-black ${
              activeSection === "Account Security"
                ? "bg-cyan-500 text-black"
                : ""
            }`}
          >
            Account Security
          </button>
          <button
            onClick={() => setActiveSection("Logout")}
            className={`text-white text-start py-1 pl-12 w-full text-md hover:bg-cyan-500 hover:text-black ${
              activeSection === "Logout" ? "bg-cyan-500 text-black" : ""
            }`}
          >
            Logout
          </button>
        </div>
      </div>
      <div className="w-[84%] mr-10 mt-10 px-2 border-[1px] border-gray-700">
        {renderSection()}
      </div>
      <ToastContainer />
    </div>
  );
};

export default UserProfile;
