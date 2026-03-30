# Smart Attendance System

![Flutter](https://img.shields.io/badge/Flutter-%2302569B.svg?style=for-the-badge&logo=Flutter&logoColor=white)
![Dart](https://img.shields.io/badge/dart-%230175C2.svg?style=for-the-badge&logo=dart&logoColor=white)
![Bloc](https://img.shields.io/badge/BLoC-blue?style=for-the-badge&logo=flutter)

A professional, state-of-the-art attendance management system built with **Flutter** and **BLoC** architecture. Designed for high performance, reliability, and ease of use, featuring real-time QR code scanning and comprehensive administrative dashboards.

---

## Key Features

### Authentication & Onboarding
- **Seamless Login/Registration**: User authentication with session persistence using `flutter_secure_storage`.
- **Guided Onboarding**: Engaging onboarding screens to introduce new users to the platform's core functionalities.

### Dashboard & Monitoring
- **Real-time Overview**: Quick access to attendance summaries and recent activities.
- **Beautiful UI/UX**: Crafted with a premium design system featuring modern typography ("Outfit"/"Roboto") and smooth transitions.

### Smart Attendance Tracking
- **High-Performance QR Scanner**: Integrated with `mobile_scanner` for lightning-fast attendance logging.
- **Check-in/Check-out Logic**: Structured workflows to handle daily schedules, breaks, and session-based entries.
- **Attendance History**: A detailed log of past occurrences with advanced filtering options.

### Administrative Excellence
- **User Management**: Centralized hub for administrators to oversee users and attendance records.
- **Data Analytics**: Insightful visualizations to monitor attendance trends and compliance.

---

## Design System

Our application follows a premium aesthetic with a carefully selected color palette:

- **Primary**: `#2E31D6` (Elegant Blue)
- **Dark Accent**: `#23C2ED` (Modern Cyan)
- **Backgrounds**: Surface white (#FFFFFF) and Sleek Dark (#18191D) for dark mode support.

---

## Architecture & Stack

This project follows **Clean Architecture** principles and the **BLoC (Business Logic Component)** pattern to ensure scalability and testability.

| Layer | Responsibility |
|-------|----------------|
| **Views** | UI screens and widgets using `flutter_screenutil` for responsiveness. |
| **Controllers (BLoC)** | State management and business logic handling. |
| **Services** | API communication (via `dio`) and local data storage. |
| **Models** | Type-safe data structures with `json_serializable`. |

---

## Getting Started

### Prerequisites
- [Flutter SDK](https://docs.flutter.dev/get-started/install) (Stable)
- [Dart SDK](https://dart.dev/get-dart)
- Android Studio / VS Code with Flutter extension

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   ```

2. **Install dependencies:**
   ```bash
   flutter pub get
   ```

3. **Generate Models (if needed):**
   ```bash
   dart run build_runner build --delete-conflicting-outputs
   ```

4. **Run the application:**
   ```bash
   flutter run
   ```

---

## Configuration

The project uses several key libraries to provide a premium experience:
- `flutter_bloc`: The gold standard for Flutter state management.
- `dio`: Robust networking layer for API integration.
- `flutter_screenutil`: Ensuring UI consistency across all device sizes.
- `shared_preferences` & `flutter_secure_storage`: Secure data persistence.
