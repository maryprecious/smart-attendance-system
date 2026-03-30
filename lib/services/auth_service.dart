import '../models/auth_response.dart';
import 'api_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthService {
  final ApiService apiService;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  AuthService({required this.apiService});

  Future<AuthResponse> login(String email, String password) async {
    try {
      final response = await apiService.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      if (response.data['success'] == true) {
        final authResponse = AuthResponse.fromJson(response.data);
        if (authResponse.accessToken != null) {
          await _storage.write(key: 'accessToken', value: authResponse.accessToken);
          await _storage.write(key: 'refreshToken', value: authResponse.refreshToken);
        }
        return authResponse;
      } else {
        return AuthResponse(success: false, message: response.data['message']);
      }
    } catch (e) {
      return AuthResponse(success: false, message: e.toString());
    }
  }

  Future<AuthResponse> register({
    required String username,
    required String email,
    required String password,
    String? role,
    String? department,
  }) async {
    try {
      final response = await apiService.post('/auth/register', data: {
        'username': username,
        'email': email,
        'password': password,
        'role': role ?? 'member',
        'department': department,
      });

      if (response.data['success'] == true) {
        final authResponse = AuthResponse.fromJson(response.data);
        if (authResponse.accessToken != null) {
          await _storage.write(key: 'accessToken', value: authResponse.accessToken);
          await _storage.write(key: 'refreshToken', value: authResponse.refreshToken);
        }
        return authResponse;
      } else {
        return AuthResponse(success: false, message: response.data['message']);
      }
    } catch (e) {
      return AuthResponse(success: false, message: e.toString());
    }
  }

  Future<AuthResponse> forgotPassword(String email) async {
    try {
      // TODO: Implement backend endpoint for forgot password
      // final response = await apiService.post('/auth/forgot-password', data: {'email': email});
      await Future.delayed(const Duration(seconds: 1)); // Mock delay
      return AuthResponse(success: true, message: 'OTP sent to your email');
    } catch (e) {
      return AuthResponse(success: false, message: e.toString());
    }
  }

  Future<AuthResponse> verifyOTP(String email, String otp) async {
    try {
      // TODO: Implement backend endpoint for OTP verification
      await Future.delayed(const Duration(seconds: 1));
      return AuthResponse(success: true, message: 'OTP verified');
    } catch (e) {
      return AuthResponse(success: false, message: e.toString());
    }
  }

  Future<AuthResponse> resetPassword(String email, String otp, String newPassword) async {
    try {
      // TODO: Implement backend endpoint for password reset
      await Future.delayed(const Duration(seconds: 1));
      return AuthResponse(success: true, message: 'Password reset successful');
    } catch (e) {
      return AuthResponse(success: false, message: e.toString());
    }
  }

  Future<void> logout() async {
    await _storage.deleteAll();
  }

  Future<bool> isAuthenticated() async {
    final token = await _storage.read(key: 'accessToken');
    return token != null;
  }

  Future<bool> hasSeenOnboarding() async {
    final seen = await _storage.read(key: 'hasSeenOnboarding');
    return seen == 'true';
  }

  Future<void> setOnboardingComplete() async {
    await _storage.write(key: 'hasSeenOnboarding', value: 'true');
  }
}
