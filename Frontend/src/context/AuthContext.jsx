import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

// Set up axios base URL
axios.defaults.baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );

  // Set up axios interceptor for automatic token inclusion
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          // Verify token with backend
          const response = await axios.get("/user/profile");
          console.log(" AuthContext - Profile response:", response.data);

          // Extract user data properly - backend returns user data directly
          const userData = {
            username: response.data.username,
            email: response.data.email,
            profileImageUrl: response.data.profileImageUrl,
            // Include other fields as needed
            fullName: response.data.fullName,
            country: response.data.country,
            profession: response.data.profession,
            dateOfBirth: response.data.dateOfBirth,
          };

          console.log(" AuthContext - Setting user data:", userData);
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          // Token is invalid, remove it
          console.log("Token invalid, logging out");
          logout();
        }
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post("/user/login", {
        email,
        password,
      });

      const { token: newToken, username, email: userEmail } = response.data;

      localStorage.setItem("token", newToken);
      setToken(newToken);
      setUser({ username, email: userEmail });
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Login failed",
      };
    }
  };

  const signup = async (name, email, password) => {
    try {
      setLoading(true);
      const response = await axios.post("/user/signup", {
        name,
        email,
        password,
      });
      return { success: true, message: response.data.success };
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Signup failed";
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (credential) => {
    try {
      setLoading(true);
      const response = await axios.post("/user/google-auth", { credential });

      const { token, email, username, profilePicture, profileImageUrl } =
        response.data;

      // Store token and user data
      
      localStorage.setItem("token", token);
      setToken(token); // Add this line!
      setUser({
        email,
        username,
        profilePicture: profileImageUrl || profilePicture || null,
      });
      setIsAuthenticated(true);

      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Google login failed";
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    delete axios.defaults.headers.common["Authorization"];
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    signup,
    googleLogin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
