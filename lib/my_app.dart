import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'services/attendance_service.dart';
import 'controllers/auth/auth_bloc.dart';
import 'controllers/auth/auth_event.dart';
import 'controllers/auth/auth_state.dart';
import 'controllers/attendance/attendance_bloc.dart';
import 'views/onboarding/onboarding_screen.dart';
import 'views/auth/login_screen.dart';
import 'views/dashboard/dashboard_screen.dart';

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider(
          create: (context) => ApiService(baseUrl: 'http://localhost:3000'),
        ),
        RepositoryProvider(
          create: (context) => AuthService(
            apiService: RepositoryProvider.of<ApiService>(context),
          ),
        ),
        RepositoryProvider(
          create: (context) => AttendanceService(
            apiService: RepositoryProvider.of<ApiService>(context),
          ),
        ),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider(
            create: (context) => AuthBloc(
              authService: RepositoryProvider.of<AuthService>(context),
            )..add(AuthCheckRequested()),
          ),
          BlocProvider(
            create: (context) => AttendanceBloc(
              attendanceService: RepositoryProvider.of<AttendanceService>(context),
            ),
          ),
        ],
        child: MaterialApp(
          title: 'Smart Attendance',
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            useMaterial3: true,
            textTheme: GoogleFonts.interTextTheme(),
          ),
          home: BlocBuilder<AuthBloc, AuthState>(
            builder: (context, state) {
              if (state is AuthAuthenticated) {
                return const DashboardScreen();
              } else if (state is AuthOnboardingRequired || state is AuthInitial) {
                return const OnboardingScreen();
              } else {
                return const LoginScreen();
              }
            },
          ),
        ),
      ),
    );
  }
}