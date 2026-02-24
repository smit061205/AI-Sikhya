import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { ExploreDropdownProvider } from "./context/ExploreDropdownContext"; // Import the provider
import PrivateRoute from "./components/PrivateRoute";
import AdminPrivateRoute from "./components/AdminPrivateRoute";
import About from "./components/About";
import Contact from "./components/Contact";
import LandingPage from "./components/LandingPage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Signup from "./components/Signup";
import Login from "./components/Login";
import SignupAdmin from "./components/SignupAdmin";
import LoginAdmin from "./components/LoginAdmin";
import ManageCourse from "./components/ManageCourse"; // Import the new component
import CreateCourse from "./components/CreateCourse"; // Import the create course component
import AdminDashboard from "./components/AdminDashboard";
import UserProfile from "./components/UserProfile";
import NavbarUser from "./components/NavbarUser";
import UserDashboard from "./components/UserDashboard";
import NavbarAdmin from "./components/NavbarAdmin";
import AdminProfile from "./components/AdminProfile";
import ExploreCourses from "./components/ExploreCourses"; // Import the ExploreCourses component
import CourseDetail from "./components/CourseDetail"; // Import the CourseDetail component

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <AdminAuthProvider>
          <ExploreDropdownProvider>
            <Router>
              <div className="bg-black min-h-screen">
                <Routes>
                  {/* Public routes without Navbar/Footer */}
                  <Route
                    path="/signup"
                    element={
                      <>
                        <Navbar />
                        <Signup />
                        <Footer />
                      </>
                    }
                  />
                  <Route
                    path="/login"
                    element={
                      <>
                        <Navbar />
                        <Login />
                        <Footer />
                      </>
                    }
                  />
                  <Route
                    path="/signupadmin"
                    element={
                      <>
                        <Navbar />
                        <SignupAdmin />
                        <Footer />
                      </>
                    }
                  />
                  <Route
                    path="/loginadmin"
                    element={
                      <>
                        <Navbar />
                        <LoginAdmin />
                        <Footer />
                      </>
                    }
                  />

                  {/* Protected routes without Navbar/Footer */}
                  <Route
                    path="/user-dashboard"
                    element={
                      <PrivateRoute>
                        <NavbarUser />
                        <UserDashboard />
                        <Footer />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/user-Profile"
                    element={
                      <PrivateRoute>
                        <NavbarUser />
                        <UserProfile />
                        <Footer />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/explore-courses"
                    element={
                      <PrivateRoute>
                        <NavbarUser />
                        <ExploreCourses />
                        <Footer />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/course/:courseId"
                    element={
                      <PrivateRoute>
                        <NavbarUser />
                        <CourseDetail />
                        <Footer />
                      </PrivateRoute>
                    }
                  />
                  {/* Admin Protected routes without Navbar/Footer */}
                  <Route
                    path="/admin-dashboard"
                    element={
                      <AdminPrivateRoute>
                        <NavbarAdmin />
                        <AdminDashboard />
                        <Footer />
                      </AdminPrivateRoute>
                    }
                  />
                  <Route
                    path="/admin/course/manage/:courseId"
                    element={
                      <AdminPrivateRoute>
                        <NavbarAdmin />
                        <ManageCourse />
                        <Footer />
                      </AdminPrivateRoute>
                    }
                  />
                  <Route
                    path="/admin/create-course"
                    element={
                      <AdminPrivateRoute>
                        <NavbarAdmin />
                        <CreateCourse />
                        <Footer />
                      </AdminPrivateRoute>
                    }
                  />
                  <Route
                    path="/admin/profile"
                    element={
                      <AdminPrivateRoute>
                        <NavbarAdmin />
                        <AdminProfile />
                        <Footer />
                      </AdminPrivateRoute>
                    }
                  />

                  {/* Public routes with Navbar/Footer */}
                  <Route
                    path="/"
                    element={
                      <>
                        <Navbar />
                        <main>
                          <LandingPage />
                        </main>
                        <Footer />
                      </>
                    }
                  />

                  <Route
                    path="/about"
                    element={
                      <>
                        <Navbar />
                        <main>
                          <About />
                        </main>
                        <Footer />
                      </>
                    }
                  />

                  <Route
                    path="/contact"
                    element={
                      <>
                        <Navbar />
                        <main>
                          <Contact />
                        </main>
                        <Footer />
                      </>
                    }
                  />
                </Routes>
              </div>
            </Router>
          </ExploreDropdownProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
