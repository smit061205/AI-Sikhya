import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

const AdminPrivateRoute = ({ children }) => {
  const { isAdminAuthenticated, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl font-poppins">Loading...</div>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    // Redirect to admin login page with return url
    return <Navigate to="/loginadmin" state={{ from: location }} replace />;
  }

  return children;
};

export default AdminPrivateRoute;
