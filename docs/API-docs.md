# Lost Trace API Endpoints for Frontend Integration

This document provides a user-friendly overview of the Lost Trace API endpoints, designed to assist frontend developers in integrating with the backend. All endpoints are prefixed with `/api`.

## 1. Authentication Endpoints

These endpoints handle user registration, login, and password management.

### `POST /api/auth/register`

- **Description**: Registers a new user account.
- **Request Body**:
  ```json
  {
    "name": "string",
    "email": "string (email format)",
    "password": "string (min 8 chars, strong password)"
  }
  ```
- **Success Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "token": "string (JWT)",
    "user": {
      /* User object */
    }
  }
  ```
- **Error Responses**: `400 Bad Request` (Invalid input), `409 Conflict` (Email already exists)

### `POST /api/auth/login`

- **Description**: Authenticates a user and returns a JWT token.
- **Request Body**:
  ```json
  {
    "email": "string (email format)",
    "password": "string"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "User logged in successfully",
    "token": "string (JWT)",
    "user": {
      /* User object */
    }
  }
  ```
- **Error Responses**: `400 Bad Request` (Invalid credentials)

### `POST /api/auth/forgot-password`

- **Description**: Initiates a password reset process by sending a reset email.
- **Request Body**:
  ```json
  {
    "email": "string (email format)"
  }
  ```
- **Success Response**: `200 OK`
- **Error Responses**: `400 Bad Request`

### `POST /api/auth/reset-password`

- **Description**: Resets the user's password using a valid reset token.
- **Request Body**:
  ```json
  {
    "token": "string",
    "password": "string (new strong password)"
  }
  ```
- **Success Response**: `200 OK`
- **Error Responses**: `400 Bad Request` (Invalid or expired token)

### `POST /api/auth/verify-email`

- **Description**: Verifies a user's email address using a verification token.
- **Request Body**:
  ```json
  {
    "token": "string"
  }
  ```
- **Success Response**: `200 OK`
- **Error Responses**: `400 Bad Request` (Invalid or expired token)

## 2. User Management Endpoints

These endpoints allow authenticated users to manage their profiles.

### `GET /api/user/profile`

- **Description**: Retrieves the authenticated user's profile information.
- **Authentication**: Requires JWT in `Authorization` header.
- **Success Response**: `200 OK`
  ```json
  {
    /* User object */
  }
  ```
- **Error Responses**: `401 Unauthorized`

### `PUT /api/user/profile`

- **Description**: Updates the authenticated user's profile information.
- **Authentication**: Requires JWT in `Authorization` header.
- **Request Body**:
  ```json
  {
    "name"?: "string",
    "email"?: "string (email format)"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    /* Updated User object */
  }
  ```
- **Error Responses**: `400 Bad Request`, `401 Unauthorized`

### `DELETE /api/user/account`

- **Description**: Deletes the authenticated user's account.
- **Authentication**: Requires JWT in `Authorization` header.
- **Success Response**: `204 No Content`
- **Error Responses**: `401 Unauthorized`

## 3. Reports Management Endpoints

These endpoints handle the creation, retrieval, update, and deletion of lost/found person reports.

### `GET /api/report`

- **Description**: Retrieves a list of reports with optional filtering and pagination.
- **Authentication**: Requires JWT in `Authorization` header.
- **Query Parameters**:
  - `page`: (Optional) Page number (default: 1)
  - `limit`: (Optional) Number of items per page (default: 10, max: 100)
  - `type`: (Optional) `LOST` or `FOUND`
  - `status`: (Optional) `PENDING`, `APPROVED`, `REJECTED`, `MATCHED`, `CLOSED`
  - `gender`: (Optional) `MALE`, `FEMALE`, `OTHER`, `UNKNOWN`
  - `minAge`: (Optional) Minimum age
  - `maxAge`: (Optional) Maximum age
  - `location`: (Optional) Search by location (partial match)
  - `priority`: (Optional) Report priority (1-5)
  - `submittedBy`: (Optional) User ID who submitted the report
  - `dateFrom`: (Optional) ISO date string for start of creation date range
  - `dateTo`: (Optional) ISO date string for end of creation date range
- **Success Response**: `200 OK`
  ```json
  [
    {
      /* Report object */
    },
    {
      /* Report object */
    }
  ]
  ```
- **Error Responses**: `401 Unauthorized`

### `POST /api/report`

- **Description**: Creates a new lost or found person report.
- **Authentication**: Requires JWT in `Authorization` header.
- **Request Body**:
  ```json
  {
    "type"?: "string (LOST or FOUND, default: LOST)",
    "personName"?: "string",
    "contactNumber"?: "string (E.164 format, e.g., +15551234567)",
    "age"?: "integer",
    "gender"?: "string (MALE, FEMALE, OTHER, UNKNOWN)",
    "description": "string (required, min 10 chars)",
    "location"?: "string",
    "lat"?: "number (latitude)",
    "lon"?: "number (longitude)",
    "priority"?: "integer (1-5, default: 1)",
    "tags"?: "array of strings"
  }
  ```
- **File Upload**: This endpoint also supports image uploads. The image should be sent as `multipart/form-data` with the field name `image`.
- **Success Response**: `201 Created`
  ```json
  {
    /* Created Report object */
  }
  ```
- **Error Responses**: `400 Bad Request`, `401 Unauthorized`

### `GET /api/report/{id}`

- **Description**: Retrieves a single report by its ID.
- **Authentication**: Requires JWT in `Authorization` header.
- **Path Parameters**:
  - `id`: Report ID (UUID format)
- **Success Response**: `200 OK`
  ```json
  {
    /* Report object */
  }
  ```
- **Error Responses**: `401 Unauthorized`, `404 Not Found`

### `PUT /api/report/{id}`

- **Description**: Updates an existing report by its ID. Only the report owner or an admin/police can update.
- **Authentication**: Requires JWT in `Authorization` header.
- **Path Parameters**:
  - `id`: Report ID (UUID format)
- **Request Body**: (Partial update, any field from `ReportCreate` can be updated)
  ```json
  {
    "personName"?: "string",
    "status"?: "string (PENDING, APPROVED, REJECTED, MATCHED, CLOSED)"
    // ... other fields
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    /* Updated Report object */
  }
  ```
- **Error Responses**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### `DELETE /api/report/{id}`

- **Description**: Deletes a report by its ID. Only the report owner or an admin/police can delete.
- **Authentication**: Requires JWT in `Authorization` header.
- **Path Parameters**:
  - `id`: Report ID (UUID format)
- **Success Response**: `204 No Content`
- **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### `POST /api/report/{id}/match`

- **Description**: Triggers facial recognition matching for a specific report.
- **Authentication**: Requires JWT in `Authorization` header.
- **Path Parameters**:
  - `id`: Report ID (UUID format)
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Matching process initiated",
    "matches": [
      /* Array of potential match objects */
    ]
  }
  ```
- **Error Responses**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`

## 4. Notifications Endpoints

These endpoints manage user notifications.

### `GET /api/notifications`

- **Description**: Retrieves all notifications for the authenticated user.
- **Authentication**: Requires JWT in `Authorization` header.
- **Success Response**: `200 OK`
  ```json
  [
    {
      /* Notification object */
    },
    {
      /* Notification object */
    }
  ]
  ```
- **Error Responses**: `401 Unauthorized`

### `PUT /api/notifications/{id}/read`

- **Description**: Marks a specific notification as read.
- **Authentication**: Requires JWT in `Authorization` header.
- **Path Parameters**:
  - `id`: Notification ID (UUID format)
- **Success Response**: `200 OK`
- **Error Responses**: `401 Unauthorized`, `404 Not Found`

### `DELETE /api/notifications/{id}`

- **Description**: Deletes a specific notification.
- **Authentication**: Requires JWT in `Authorization` header.
- **Path Parameters**:
  - `id`: Notification ID (UUID format)
- **Success Response**: `204 No Content`
- **Error Responses**: `401 Unauthorized`, `404 Not Found`

## 5. Admin Endpoints (Requires ADMIN/POLICE Role)

These endpoints are for administrative and police users to manage the system.

### `GET /api/admin/users`

- **Description**: Retrieves a list of all users.
- **Authentication**: Requires JWT in `Authorization` header (ADMIN/POLICE role).
- **Success Response**: `200 OK`
  ```json
  [
    {
      /* User object */
    },
    {
      /* User object */
    }
  ]
  ```
- **Error Responses**: `401 Unauthorized`, `403 Forbidden`

### `PUT /api/admin/users/{id}/role`

- **Description**: Updates a user's role.
- **Authentication**: Requires JWT in `Authorization` header (ADMIN role).
- **Path Parameters**:
  - `id`: User ID (UUID format)
- **Request Body**:
  ```json
  {
    "role": "string (ADMIN, POLICE, or USER)"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    /* Updated User object */
  }
  ```
- **Error Responses**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### `GET /api/admin/reports`

- **Description**: Retrieves a list of all reports with administrative view (e.g., including sensitive details).
- **Authentication**: Requires JWT in `Authorization` header (ADMIN/POLICE role).
- **Query Parameters**: (Same as `GET /api/report`)
- **Success Response**: `200 OK`
  ```json
  [
    {
      /* Report object with admin details */
    },
    {
      /* Report object with admin details */
    }
  ]
  ```
- **Error Responses**: `401 Unauthorized`, `403 Forbidden`

### `PUT /api/admin/reports/{id}/status`

- **Description**: Updates the status of a specific report.
- **Authentication**: Requires JWT in `Authorization` header (ADMIN/POLICE role).
- **Path Parameters**:
  - `id`: Report ID (UUID format)
- **Request Body**:
  ```json
  {
    "status": "string (PENDING, APPROVED, REJECTED, MATCHED, CLOSED)",
    "reason"?: "string (required if status is REJECTED or CLOSED)"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    /* Updated Report object */
  }
  ```
- **Error Responses**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

## 6. Health Check Endpoint

### `GET /api/healthz`

- **Description**: Checks the health and status of the API.
- **Success Response**: `200 OK`
  ```json
  {
    "status": "success",
    "message": "API is running",
    "timestamp": "ISO date-time string"
  }
  ```
- **Error Responses**: `500 Internal Server Error`

---

**Note**: This documentation provides a high-level overview. For detailed request/response schemas and error codes, please refer to the `openapi.yaml` file in this directory.
