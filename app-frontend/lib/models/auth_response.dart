import 'package:json_annotation/json_annotation.dart';
import 'user_model.dart';

part 'auth_response.g.dart';

@JsonSerializable()
class AuthResponse {
  final bool success;
  final String? accessToken;
  final String? refreshToken;
  final String? message;
  final UserModel? user;

  AuthResponse({
    required this.success,
    this.accessToken,
    this.refreshToken,
    this.message,
    this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) => _$AuthResponseFromJson(json);
  Map<String, dynamic> toJson() => _$AuthResponseToJson(this);
}
