import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

// Set up axios base URL
axios.defaults.baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
};

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [adminToken, setAdminToken] = useState(
    localStorage.getItem("adminToken")
  );
  const [loading, setLoading] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
    !!localStorage.getItem("adminToken")
  );

  // Set up axios interceptor for automatic token inclusion
  useEffect(() => {
    if (adminToken) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${adminToken}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [adminToken]);

  // Check if admin is authenticated on app load
  useEffect(() => {
    const checkAdminAuth = async () => {
      if (adminToken) {
        try {
          // Verify token with backend
          const response = await axios.get("/admin/profile");
          setAdmin(response.data);
          setIsAdminAuthenticated(true);
        } catch (error) {
          // Token is invalid, remove it
          console.log("Admin token invalid, logging out");
          adminLogout();
        }
      } else {
        setIsAdminAuthenticated(false);
      }
      setLoading(false);
    };

    checkAdminAuth();
  }, [adminToken]);

  const adminLogin = async (email, password) => {
    try {
      const response = await axios.post("/admin/Login", {
        email,
        password,
      });

      const { token, adminInfo } = response.data;

      localStorage.setItem("adminToken", token);
      setAdminToken(token);
      setAdmin(adminInfo);
      setIsAdminAuthenticated(true);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Admin login failed",
      };
    }
  };

  const adminSignup = async (fullName, email, password) => {
    try {
      setLoading(true);
      const response = await axios.post("/admin/Signup", {
        fullName,
        email,
        password,
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Admin signup failed";
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Admin Google OAuth Login
  const adminGoogleLogin = async (credential) => {
    try {
      console.log("🔍 Admin Google Login - Starting authentication...");
      console.log(
        "📧 Credential received:",
        credential ? "✅ Present" : "❌ Missing"
      );

      const response = await axios.post(
        `${axios.defaults.baseURL}/admin/google-auth`,
        {
          credential,
        }
      );

      console.log("🎉 Admin Google Auth Response:", response.data);

      if (response.data.token) {
        const { token, adminInfo } = response.data;

        // Store admin token
        localStorage.setItem("adminToken", token);

        // Update admin state
        setAdmin(adminInfo);
        setIsAdminAuthenticated(true);

        console.log("✅ Admin Google login successful:", adminInfo);
        return { success: true };
      } else {
        console.error("❌ No token received from admin Google auth");
        return { success: false, error: "Authentication failed" };
      }
    } catch (error) {
      console.error("❌ Admin Google Login Error:", error);
      const errorMessage =
        error.response?.data?.error || "Google authentication failed";
      return { success: false, error: errorMessage };
    }
  };

  const adminLogout = () => {
    localStorage.removeItem("adminToken");
    setAdminToken(null);
    setAdmin(null);
    setIsAdminAuthenticated(false);
    delete axios.defaults.headers.common["Authorization"];
  };

  const value = {
    admin,
    adminToken,
    isAdminAuthenticated,
    loading,
    adminLogin,
    adminSignup,
    adminGoogleLogin,
    adminLogout,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};
