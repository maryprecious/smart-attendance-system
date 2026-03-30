import 'package:equatable/equatable.dart';
import '../../models/user_model.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class AuthLoginRequested extends AuthEvent {
  final String email;
  final String password;

  const AuthLoginRequested({required this.email, required this.password});

  @override
  List<Object?> get props => [email, password];
}

class AuthLogoutRequested extends AuthEvent {}

class AuthCheckRequested extends AuthEvent {}

class AuthOnboardingCompleted extends AuthEvent {}

class AuthRegisterRequested extends AuthEvent {
  final String username;
  final String email;
  final String password;
  final String? role;
  final String? department;

  const AuthRegisterRequested({
    required this.username,
    required this.email,
    required this.password,
    this.role,
    this.department,
  });

  @override
  List<Object?> get props => [username, email, password, role, department];
}

class AuthForgotPasswordRequested extends AuthEvent {
  final String email;

  const AuthForgotPasswordRequested({required this.email});

  @override
  List<Object?> get props => [email];
}

class AuthVerifyOTPRequested extends AuthEvent {
  final String email;
  final String otp;

  const AuthVerifyOTPRequested({required this.email, required this.otp});

  @override
  List<Object?> get props => [email, otp];
}

class AuthResetPasswordRequested extends AuthEvent {
  final String email;
  final String otp;
  final String newPassword;

  const AuthResetPasswordRequested({
    required this.email,
    required this.otp,
    required this.newPassword,
  });

  @override
  List<Object?> get props => [email, otp, newPassword];
}
