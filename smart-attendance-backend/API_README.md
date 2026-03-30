# Smart Attendance API Documentation

## Base URL
`http://localhost:3000`

## Authentication (`/auth`)
| Method | Endpoint | Description | Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Create a new account | `{ username, email, password, role }` |
| `POST` | `/auth/login` | Login and get tokens | `{ email, password, fcmToken }` |
| `POST` | `/auth/refresh` | Get new Access Token | `{ refreshToken }` |
| `POST` | `/auth/logout` | Logout | `{ refreshToken }` |

## User Management (`/users`) *Header: Authorization: Bearer <token>*
| Method | Endpoint | Description | Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/users/me/profile` | Get my own profile | All |
| `GET` | `/users/:id` | Get user details | Self/Admin |
| `PUT` | `/users/:id` | Update profile | Self/Admin |
| `POST` | `/users/:id/change-password` | Change password | Self |
| `GET` | `/users` | List all users | Admin/Staff |
| `POST` | `/users` | Create user (by Admin) | Admin |
| `PATCH` | `/users/:id/role` | Change user role | Admin |
| `PATCH` | `/users/:id/status` | Activate/Deactivate | Admin |
| `DELETE` | `/users/:id` | Delete user | Admin |
| `POST` | `/users/bulk/upload` | Bulk upload users | Admin |
| `GET` | `/users/export/csv` | Export users as CSV | Admin |

## QR Codes (`/qr`) *Header: Authorization: Bearer <token>*
| Method | Endpoint | Description | Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/qr` | Create QR Session | `{ session_type, department, duration_minutes }` |
| `GET` | `/qr` | List Active Sessions | - |
| `GET` | `/qr/:id` | Get Session Details | - |
| `PATCH` | `/qr/:id/stop` | Stop Session | - |
| `POST` | `/qr/regenerate` | Regenerate QR (Anti-screenshot) | `{ session_id }` |
| `POST` | `/qr/validate/code` | **SCAN QR** (Mobile) | `{ encrypted_qr_data, device_info }` |
| `GET` | `/qr/:id/stats` | Session Statistics | - |

## Attendance (`/attendance`) *Header: Authorization: Bearer <token>*
| Method | Endpoint | Description | Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/attendance/mark` | Mark Attendance | `{ encrypted_qr_data, location }` |
| `GET` | `/attendance/my-history` | Get My History | - |
| `GET` | `/attendance/history` | Get All History (with filters) | Admin/Staff |
| `POST` | `/attendance/batch-mark` | Manual/Batch Attendance | `[{ user_id, status, ... }]` |

## Analytics (`/analytics`) *Header: Authorization: Bearer <token>*
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/analytics/dashboard` | Main Dashboard Stats |
| `GET` | `/analytics/trends` | Attendance Trends (7/30 days) |
| `GET` | `/analytics/department` | Department-wise Stats |
| `GET` | `/analytics/staff-vs-members` | Compare Groups |
| `GET` | `/analytics/user/:id` | Specific User Stats |
| `GET` | `/analytics/export` | Export Analytics CSV |

## Notifications (`/notifications`) *Header: Authorization: Bearer <token>*
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/notifications` | Get My Notifications |
| `PATCH` | `/notifications/:id/read` | Mark as Read |
| `PATCH` | `/notifications/read-all` | Mark All Read |

## Admin Adjustments (`/admin`) *Header: Authorization: Bearer <token>*
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/admin/attendance` | Add/Edit Attendance Record |
| `DELETE` | `/admin/attendance/:id` | Delete Record |

---

# Query Parameters Cheat Sheet
Use these parameters to Filter, Sort, and Paginate your GET requests.

### 📌 PAGINATION
*Works on: `/users`, `/attendance/history`*
- `?page=1` (First page)
- `?limit=10` (10 results per page)
- `?page=2&limit=20` (Page 2 with 20 results)

### 🔍 FILTERING
**By Role**
- `?role=student`
- `?role=staff`
- `?role=admin`

**By Status**
- `?status=active` (For users)
- `?status=present`, `?status=late`, `?status=absent` (For attendance)

**By Department**
- `?department=Computer Science`
- `?department=Engineering`

**By Date Range**
- `?from=2024-01-01` (Start Date)
- `?to=2024-02-03` (End Date)

**By Search**
- `?search=john` (Search by username or email)

### 📊 COMMON USE CASES
**1. Admin Dashboard**
- `GET /analytics/trends?period=7`
- `GET /admin/attendance?status=late`

**2. Student View**
- `GET /attendance/my-history?from=2024-01-01&to=2024-01-31`
- `GET /notifications?unread_only=true`

### ⚙️ IN POSTMAN
**Where to Add:**
1.  **Params Tab**: Add Key (`page`) and Value (`1`).
2.  **URL Direct**: `{{url}}/users?page=1&limit=10`

---

# How to Test in Postman

1.  **Create an Environment**:
    *   Variable: `url` -> Value: `http://localhost:3000`
    *   Variable: `token` -> Leave blank for now.

2.  **Step 1: Register/Login**:
    *   Create a request: `POST {{url}}/auth/login`
    *   Body (JSON): `{ "email": "admin@example.com", "password": "password123" }`
    *   **Action**: Copy the `accessToken` from the response.

3.  **Step 2: Authenticate**:
    *   Go to your next request (e.g., `GET {{url}}/users/me/profile`).
    *   Go to **Authorization** tab.
    *   Type: **Bearer Token**.
    *   Paste the `accessToken`.

    *   **Student**: Call `POST {{qr}}/validate/code` with `{ "encrypted_qr_data": "PASTE_HERE" }`.

---

# ⚡ Pro Tip: Auto-Save Tokens (The "Magic Script")
Using this script means you **never have to copy-paste a token again**.

### 1. The Script
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("token", response.accessToken);
    pm.environment.set("refreshToken", response.refreshToken);
    pm.environment.set("userId", response.user.id);
    console.log("✅ Tokens saved!");
}
```

### 2. Where to put it?
1.  Click on your **Login** request (`POST /auth/login`).
2.  Click the **Scripts** tab (sometimes called **Tests**).
3.  Paste the code into the **"Post-response"** box.
4.  **Save** the request.

### 3. What it does
*   **Before**: You login -> Copy token -> Go to next tab -> Paste token.
*   **After**: You click **Send** on Login. The script instantly grabs the token and updates your `{{token}}` variable automatically. You can just go to the next tab and click Send immediately.
