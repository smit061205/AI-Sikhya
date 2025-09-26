# Comprehensive Backend Documentation: Course-Selling Platform

This document provides a detailed overview of the backend API for the course-selling platform. It covers authentication, data models, and all available endpoints for both `Admin` and `User` roles.

---

## **Table of Contents**

1.  [**Core Concepts**](#core-concepts)
    -   [Authentication (JWT)](#authentication-jwt)
    -   [User Roles](#user-roles)
    -   [Error Handling](#error-handling)
2.  [**Data Models**](#data-models)
    -   [Admin](#admin-model)
    -   [User](#user-model)
    -   [Course](#course-model)
    -   [Coupon](#coupon-model)
3.  [**API Endpoints**](#api-endpoints)
    -   [Module: Admin (`/admin`)](#module-admin-admin)
    -   [Module: User (`/users`)](#module-user-users)
    -   [Module: Public Courses (`/courses`)](#module-public-courses-courses)
    -   [Module: Payment (`/payment`)](#module-payment-payment)
    -   [Module: Course Q&A](#module-course-qa)
    -   [Module: Student Progress Tracking](#module-student-progress-tracking)
    -   [Module: Notification Center](#module-notification-center)

---

## **Core Concepts**

### **Authentication (JWT)**

All protected routes require a `Bearer` token in the `Authorization` header.

`Authorization: Bearer <your_jwt_token>`

Tokens are generated upon successful login (`/admin/login`, `/users/login`) and should be stored securely on the client-side.

### **User Roles**

-   **Admin**: Manages courses, coupons, and views platform-wide analytics. Has full control over their own created content.
-   **User**: Purchases and consumes courses, leaves reviews, and manages their own profile.

### **Error Handling**

The API returns standard HTTP status codes. Error responses follow this format:

```json
{
  "error": "A descriptive error message."
}
```

---

## **Data Models**

### **Admin Model**

-   `name` (String, required)
-   `email` (String, required, unique)
-   `password` (String, required)
-   `headline` (String)
-   `bio` (String)
-   `socialLinks` (Object: `website`, `twitter`, `linkedin`)
-   `profilePhoto` (Object: `public_id`, `url`)
-   `country` (String)
-   `profession` (String)

### **User Model**

-   `username` (String, required)
-   `email` (String, required, unique)
-   `password` (String, required)
-   `profilePhoto` (Object: `public_id`, `url`)
-   `purchasedCourses` (Array of `ObjectId` refs to `Course`)
-   `bookmarkedCourses` (Array of `ObjectId` refs to `Course`)
-   `cart` (Array of `ObjectId` refs to `Course`)
-   `country` (String)
-   `profession` (String)
-   `dateOfBirth` (Date)

### **Course Model**

-   `title` (String, required)
-   `description` (String, required)
-   `price` (Number, required)
-   `category` (String, required)
-   `language` (String, required)
-   `level` (String, required, enum: `Beginner`, `Intermediate`, `Advanced`, `All Levels`)
-   `thumbnail` (Object: `public_id`, `url`)
-   `videos` (Array of Objects: `title`, `url`, `duration`)
-   `reviews` (Array of Objects: `user`, `rating`, `comment`)
-   `averageRating` (Number)
-   `createdBy` (`ObjectId` ref to `Admin`)

### **Coupon Model**

-   `code` (String, required, unique)
-   `discountPercentage` (Number, required)
-   `expiryDate` (Date, required)
-   `isActive` (Boolean, default: `true`)
-   `createdBy` (`ObjectId` ref to `Admin`)

---

## **API Endpoints**

### **Module: Admin (`/admin`)**

#### **Admin Authentication**

-   **Endpoint**: `POST /admin/signup`
-   **Endpoint**: `POST /admin/login`
-   **Endpoint**: `DELETE /admin/DeleteAccount`

#### **Course Management**

-   **Endpoint**: `POST /admin/courses`
    -   **Use Case**: An admin creates a new course.
    -   **Frontend Integration Guide**:
        -   **Method**: `POST`
        -   **URL**: `/admin/courses`
        -   **Headers**: `Authorization: Bearer <admin_jwt_token>`
        -   **Body**: Use `FormData` to handle both JSON fields and file uploads.

-   **Endpoint**: `PUT /admin/courses/:courseId`
    -   **Use Case**: An admin updates a course's details.

-   **Endpoint**: `DELETE /admin/courses/:courseId`
    -   **Use Case**: An admin deletes a course.

#### **Coupon Management**

-   **Endpoint**: `POST /admin/coupons`
    -   **Use Case**: An admin creates a new discount coupon.
    -   **Frontend Integration Guide**:
        -   **Method**: `POST`
        -   **URL**: `/admin/coupons`
        -   **Headers**: `Content-Type: application/json`, `Authorization: Bearer <admin_jwt_token>`
        -   **Body**:
            ```json
            {
              "code": "SUMMER50",
              "discountPercentage": 50,
              "expiryDate": "2024-09-01"
            }
            ```

-   **Endpoint**: `GET /admin/coupons`
    -   **Use Case**: An admin views all coupons they have created.

-   **Endpoint**: `PATCH /admin/coupons/:couponId/toggle`
    -   **Use Case**: An admin activates or deactivates a coupon.
    -   **Frontend Integration Guide**:
        -   **Method**: `PATCH`
        -   **URL**: `/admin/coupons/<coupon_id_to_toggle>/toggle`
        -   **Headers**: `Content-Type: application/json`, `Authorization: Bearer <admin_jwt_token>`
        -   **Body**: 
            ```json
            {
              "isActive": false
            }
            ```

-   **Endpoint**: `DELETE /admin/coupons/:couponId`
    -   **Use Case**: An admin deletes a coupon.

#### **Admin Profile Management**

-   **Endpoint**: `GET /admin/profile`
-   **Endpoint**: `PUT /admin/profile`
-   **Endpoint**: `PUT /admin/profile/photo`

#### **Admin Analytics**

-   **Endpoint**: `GET /admin/dashboard-stats`

---

### **Module: User (`/users`)**

#### **User Authentication**

-   **Endpoints**: `POST /users/signup`, `POST /users/login`, `DELETE /users/DeleteAccount`

#### **User Profile Management**

-   **Endpoint**: `GET /users/profile`
-   **Endpoint**: `PUT /users/profile`
-   **Endpoint**: `PUT /users/profile/photo`

#### **User Course Interaction**

-   **Endpoint**: `POST /users/courses/:courseId/bookmark`
-   **Endpoint**: `POST /users/courses/:courseId/reviews`

#### **User Shopping Cart & Coupons**

-   **Endpoint**: `GET /users/cart`
-   **Endpoint**: `POST /users/cart/:courseId`
-   **Endpoint**: `DELETE /users/cart/:courseId`
-   **Endpoint**: `POST /users/cart/apply-coupon`

---

### **Module: Public Courses (`/courses`)**

-   **Endpoint**: `GET /search`

---

### **Module: Payment (`/payment`)**

-   **Endpoint**: `POST /payment/create-order`
-   **Endpoint**: `POST /payment/verify`

---

### **Module: Course Q&A**

These endpoints are nested under `/users/courses/:courseId/`.

-   **Endpoint**: `POST /users/courses/:courseId/questions`
    -   **Use Case**: A user who has purchased a course asks a new question.
    -   **Authentication**: `User`
    -   **Frontend Integration Guide**:
        -   **Method**: `POST`
        -   **URL**: `/users/courses/<course_id>/questions`
        -   **Headers**: `Content-Type: application/json`, `Authorization: Bearer <user_jwt_token>`
        -   **Body**:
            ```json
            {
              "title": "Having an issue with lecture 5",
              "content": "Could you please clarify the concept of closures?"
            }
            ```

-   **Endpoint**: `GET /users/courses/:courseId/questions`
    -   **Use Case**: A user or admin retrieves all questions and answers for a course.
    -   **Authentication**: `User` or `Admin`
    -   **Frontend Integration Guide**:
        -   **Method**: `GET`
        -   **URL**: `/users/courses/<course_id>/questions?page=1&limit=10`
        -   **Headers**: `Authorization: Bearer <jwt_token>`

-   **Endpoint**: `POST /users/courses/:courseId/questions/:questionId/answers`
    -   **Use Case**: A user or the course instructor adds an answer to a question.
    -   **Authentication**: `User` or `Admin`
    -   **Frontend Integration Guide**:
        -   **Method**: `POST`
        -   **URL**: `/users/courses/<course_id>/questions/<question_id>/answers`
        -   **Headers**: `Content-Type: application/json`, `Authorization: Bearer <jwt_token>`
        -   **Body**:
            ```json
            {
              "content": "Of course! A closure gives you access to an outer function's scope from an inner function."
            }
            ```

---

### **Module: Student Progress Tracking**

These endpoints are nested under `/users/courses/:courseId/`.

-   **Endpoint**: `POST /users/courses/:courseId/progress/init`
    -   **Use Case**: Initializes the progress record for a user when they first start a course.
    -   **Authentication**: `User`
    -   **Frontend Integration Guide**:
        -   **Method**: `POST`
        -   **URL**: `/users/courses/<course_id>/progress/init`
        -   **Headers**: `Authorization: Bearer <user_jwt_token>`

-   **Endpoint**: `PUT /users/courses/:courseId/progress/videos/:videoId`
    -   **Use Case**: Updates a user's progress for a specific video (e.g., marks it as complete).
    -   **Authentication**: `User`
    -   **Frontend Integration Guide**:
        -   **Method**: `PUT`
        -   **URL**: `/users/courses/<course_id>/progress/videos/<video_id>`
        -   **Headers**: `Content-Type: application/json`, `Authorization: Bearer <user_jwt_token>`
        -   **Body**:
            ```json
            {
              "isCompleted": true,
              "watchTime": 360
            }
            ```

-   **Endpoint**: `GET /users/courses/:courseId/progress`
    -   **Use Case**: Retrieves the detailed progress for a user in a specific course.
    -   **Authentication**: `User`
    -   **Frontend Integration Guide**:
        -   **Method**: `GET`
        -   **URL**: `/users/courses/<course_id>/progress`
        -   **Headers**: `Authorization: Bearer <user_jwt_token>`

-   **Endpoint**: `GET /users/progress/me`
    -   **Use Case**: Retrieves all course progress records for the logged-in user (for a dashboard view).
    -   **Authentication**: `User`
    -   **Frontend Integration Guide**:
        -   **Method**: `GET`
        -   **URL**: `/users/progress/me`
        -   **Headers**: `Authorization: Bearer <user_jwt_token>`

---

### **Module: Notification Center**

-   **Endpoint**: `GET /notifications`
    -   **Use Case**: Retrieves all notifications for the logged-in user or admin.
    -   **Authentication**: `User` or `Admin`
    -   **Frontend Integration Guide**:
        -   **Method**: `GET`
        -   **URL**: `/notifications?page=1&limit=15&unread=true`
        -   **Headers**: `Authorization: Bearer <jwt_token>`

-   **Endpoint**: `PATCH /notifications/:notificationId/read`
    -   **Use Case**: Marks a single notification as read.
    -   **Authentication**: `User` or `Admin`
    -   **Frontend Integration Guide**:
        -   **Method**: `PATCH`
        -   **URL**: `/notifications/<notification_id>/read`
        -   **Headers**: `Authorization: Bearer <jwt_token>`

-   **Endpoint**: `PATCH /notifications/read-all`
    -   **Use Case**: Marks all of the user's unread notifications as read.
    -   **Authentication**: `User` or `Admin`
    -   **Frontend Integration Guide**:
        -   **Method**: `PATCH`
        -   **URL**: `/notifications/read-all`
        -   **Headers**: `Authorization: Bearer <jwt_token>`

-   **Endpoint**: `DELETE /notifications/:notificationId`
    -   **Use Case**: Deletes a notification.
    -   **Authentication**: `User` or `Admin`
    -   **Frontend Integration Guide**:
        -   **Method**: `DELETE`
        -   **URL**: `/notifications/<notification_id>`
        -   **Headers**: `Authorization: Bearer <jwt_token>`
