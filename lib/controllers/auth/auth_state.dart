import 'package:equatable/equatable.dart';
import '../../models/user_model.dart';

abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class AuthAuthenticated extends AuthState {
  final UserModel user;

  const AuthAuthenticated({required this.user});

  @override
  List<Object?> get props => [user];
}

class AuthUnauthenticated extends AuthState {}

class AuthOnboardingRequired extends AuthState {}

class AuthFailure extends AuthState {
  final String message;

  const AuthFailure({required this.message});

  @override
  List<Object?> get props => [message];
}

class AuthForgotPasswordSuccess extends AuthState {
  final String message;
  final String email;

  const AuthForgotPasswordSuccess({required this.message, required this.email});

  @override
  List<Object?> get props => [message, email];
}

class AuthOTPSuccess extends AuthState {
  final String message;
  final String email;
  final String otp;

  const AuthOTPSuccess({required this.message, required this.email, required this.otp});

  @override
  List<Object?> get props => [message, email, otp];
}

class AuthResetPasswordSuccess extends AuthState {
  final String message;

  const AuthResetPasswordSuccess({required this.message});

  @override
  List<Object?> get props => [message];
}
