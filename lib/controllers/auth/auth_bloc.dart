import 'package:flutter_bloc/flutter_bloc.dart';
import 'auth_event.dart';
import 'auth_state.dart';
import '../../services/auth_service.dart';
import '../../models/user_model.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthService authService;

  // Toggle this to false to reconnect to the real backend
  static const bool useMockAuth = true;

  AuthBloc({required this.authService}) : super(AuthInitial()) {
    on<AuthLoginRequested>(_onLoginRequested);
    on<AuthRegisterRequested>(_onRegisterRequested);
    on<AuthOnboardingCompleted>(_onOnboardingCompleted);
    on<AuthCheckRequested>(_onCheckRequested);
    on<AuthForgotPasswordRequested>(_onForgotPasswordRequested);
    on<AuthVerifyOTPRequested>(_onVerifyOTPRequested);
    on<AuthResetPasswordRequested>(_onResetPasswordRequested);
    on<AuthLogoutRequested>(_onLogoutRequested);
  }

  Future<void> _onOnboardingCompleted(AuthOnboardingCompleted event, Emitter<AuthState> emit) async {
    await authService.setOnboardingComplete();
    emit(AuthUnauthenticated());
  }

  Future<void> _onCheckRequested(AuthCheckRequested event, Emitter<AuthState> emit) async {
    final hasSeenOnboarding = await authService.hasSeenOnboarding();
    if (!hasSeenOnboarding) {
      emit(AuthOnboardingRequired());
      return;
    }

    final isAuthenticated = await authService.isAuthenticated();
    if (isAuthenticated) {
      // For now, we remain unauthenticated until we have a proper 'me' endpoint
      emit(AuthUnauthenticated());
    } else {
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onLoginRequested(AuthLoginRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());

    if (useMockAuth) {
      // Bypassing backend for dev: success with any credentials
      await Future.delayed(const Duration(milliseconds: 800));
      emit(AuthAuthenticated(user: UserModel(
        id: 1,
        username: 'Admin User',
        email: event.email,
        role: 'admin',
      )));
      return;
    }

    try {
      final response = await authService.login(event.email, event.password);
      if (response.success && response.user != null) {
        emit(AuthAuthenticated(user: response.user!));
      } else {
        emit(AuthFailure(message: response.message ?? 'Login failed'));
      }
    } catch (e) {
      emit(AuthFailure(message: e.toString()));
    }
  }

  Future<void> _onRegisterRequested(AuthRegisterRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());

    if (useMockAuth) {
      // Bypassing backend for dev
      await Future.delayed(const Duration(milliseconds: 800));
      emit(AuthAuthenticated(user: UserModel(
        id: 1,
        username: event.username,
        email: event.email,
        role: event.role ?? 'member', // Default to member if null
        department: event.department,
      )));
      return;
    }

    try {
      final response = await authService.register(
        username: event.username,
        email: event.email,
        password: event.password,
        role: event.role,
        department: event.department,
      );
      if (response.success && response.user != null) {
        emit(AuthAuthenticated(user: response.user!));
      } else {
        emit(AuthFailure(message: response.message ?? 'Registration failed'));
      }
    } catch (e) {
      emit(AuthFailure(message: e.toString()));
    }
  }

  Future<void> _onForgotPasswordRequested(AuthForgotPasswordRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final response = await authService.forgotPassword(event.email);
      if (response.success) {
        emit(AuthForgotPasswordSuccess(message: response.message ?? 'OTP sent', email: event.email));
      } else {
        emit(AuthFailure(message: response.message ?? 'Forgot password failed'));
      }
    } catch (e) {
      emit(AuthFailure(message: e.toString()));
    }
  }

  Future<void> _onVerifyOTPRequested(AuthVerifyOTPRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final response = await authService.verifyOTP(event.email, event.otp);
      if (response.success) {
        emit(AuthOTPSuccess(message: response.message ?? 'OTP verified', email: event.email, otp: event.otp));
      } else {
        emit(AuthFailure(message: response.message ?? 'OTP verification failed'));
      }
    } catch (e) {
      emit(AuthFailure(message: e.toString()));
    }
  }

  Future<void> _onResetPasswordRequested(AuthResetPasswordRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final response = await authService.resetPassword(event.email, event.otp, event.newPassword);
      if (response.success) {
        emit(AuthResetPasswordSuccess(message: response.message ?? 'Password reset successful'));
      } else {
        emit(AuthFailure(message: response.message ?? 'Reset password failed'));
      }
    } catch (e) {
      emit(AuthFailure(message: e.toString()));
    }
  }

  Future<void> _onLogoutRequested(AuthLogoutRequested event, Emitter<AuthState> emit) async {
    await authService.logout();
    emit(AuthUnauthenticated());
  }
}
