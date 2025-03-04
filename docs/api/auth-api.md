# Authentication API Documentation

This document outlines the authentication API endpoints used in the SWOC Social Listening application.

## Base URL

All API endpoints are relative to the base URL of the application.

## Authentication

Most endpoints require authentication via JWT token. The token should be included in the `Authorization` header as follows:

```
Authorization: Bearer <token>
```

## Endpoints

### Login

Authenticates a user and returns a JWT token.

- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Authentication Required**: No

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "admin",
    "password_changed": true
  }
}
```

#### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "message": "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
}
```

### Change Password

Changes the password for an authenticated user.

- **URL**: `/api/auth/change-password`
- **Method**: `POST`
- **Authentication Required**: Yes

#### Request Headers

```
Authorization: Bearer <token>
```

#### Request Body

```json
{
  "userId": "user-id",
  "newPassword": "new-password123"
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "เปลี่ยนรหัสผ่านสำเร็จ"
}
```

#### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "message": "ไม่พบข้อมูลการยืนยันตัวตน"
}
```

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "message": "ไม่พบข้อมูลผู้ใช้"
}
```

## First-time Login Flow

When a user logs in for the first time with a system-generated password, the `password_changed` field in the user object will be `false`. The frontend should redirect the user to the password change page.

After the user successfully changes their password, the `password_changed` field will be updated to `true`, and the user will be able to access protected routes.

## Error Handling

All API endpoints return a consistent error format:

```json
{
  "success": false,
  "message": "Error message here"
}
```

## Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication failed or token invalid
- `403 Forbidden`: User does not have permission to access the resource
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error 