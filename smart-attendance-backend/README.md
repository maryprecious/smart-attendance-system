# Attendance Management System Backend

## Project Overview
The **Smart Attendance Backend** is a production-ready API designed to power the [Smart Attendance System](file:///c:/Users/Amaka/Documents/All-apps/monie-app-cv/smart_attendance_system/app-frontend/README.md) mobile application. It automates attendance tracking using dynamic QR code scanning and features secure authentication, real-time notifications, and comprehensive administrative dashboards.

The system is built to serve **Flutter-based mobile clients** with a focus on security, single-session enforcement, and real-time validation.

### Core Stack
- **Runtime**: Node.js (LTS)
- **Framework**: Express
- **ORM**: Sequelize (PostgreSQL)
- **Security**: JWT (Access/Refresh), Argon2, Zod, Helmet, Rate-limiting
- **Integrations**: Firebase Admin (FCM), Nodemailer/SendGrid



## Architecture
The backend follows a layered Clean Architecture pattern to ensure scalability and maintainability:

- **Middleware**: Security (Helmet), CORS, Rate Limiting, Input Validation (Zod), Authentication (JWT).
- **Controllers**: Handle HTTP routing and request/response lifecycle.
- **Services**: Encapsulate core business logic (e.g., QR generation, session management).
- **Models**: Sequelize-defined schemas for PostgreSQL.
- **Utilities**: Helpers for encryption, logging (Winston), and notifications.

### Frontend Integration
This backend is specifically designed to integrate with the [Flutter Mobile Frontend](file:///c:/Users/Amaka/Documents/All-apps/monie-app-cv/smart_attendance_system/app-frontend/README.md).
- **Client**: Flutter (Mobile)
- **Communication**: RESTful APIs over HTTPS
- **State Management**: BLoC / Dio
- **Authentication**: Bearer JWT tokens with secure local storage



## Folder Structure
```text
attendance-backend/
├── src/
│   ├── config/             # Database and Firebase setup
│   ├── controllers/        # Request handlers
│   ├── services/           # Business logic
│   ├── models/             # Sequelize database models
│   ├── middlewares/        # Auth, error handling, validation
│   ├── utils/              # Logging and helpers
│   ├── migrations/         # Database schema versions
│   ├── routes/             # API endpoint definitions
│   └── app.js              # Application entry point
├── logs/                   # Application runtime logs (ignored by git)
├── .env.example            # Environment template
└── README.md
```



## Security Philosophy
Security is integrated at every layer using a "Zero Trust" and "Defense in Depth" approach:
- **Single active session per user**: New logins automatically invalidate previous sessions.
- **JWT database validation**: Every request checks the JWT against an active session table.
- **Immutable Audit Trail**: All administrative changes are logged for accountability.
- **Encrypted QR Payloads**: Prevents QR code tampering or manual logging.
- **Strict CORS**: Only authorized origins (e.g., the Flutter web build or specific domains) can communicate with the API.



## Environment Variables
Create a `.env` file based on `.env.example`. Key variables include:
- `PORT`: Server port (default 3000)
- `DB_*`: PostgreSQL connection details
- `JWT_*_SECRET`: Secrets for token generation
- `ENCRYPTION_KEY`: 32-byte key for QR code payload encryption
- `ALLOWED_ORIGINS`: Commas-separated list of authorized domains



## Getting Started

### Prerequisites
- Node.js LTS
- PostgreSQL 14+
- Firebase Project (for notifications)

### Installation
1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Setup Database**: 
   - Create a PostgreSQL database.
   - Run migrations: `npx sequelize-cli db:migrate`
4. **Configure Environment**: Copy `.env.example` to `.env` and fill in your secrets.
5. **Run the server**: `npm run dev`



## Monitoring & Logs
Runtime logs are stored in the `logs/` directory:
- `all.log`: General activity history.
- `error.log`: Only error-level messages for quick troubleshooting.
