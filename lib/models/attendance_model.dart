import 'package:json_annotation/json_annotation.dart';

part 'attendance_model.g.dart';

@JsonSerializable()
class AttendanceModel {
  final int id;
  @JsonKey(name: 'user_id')
  final int userId;
  @JsonKey(name: 'qrsession_id')
  final int qrSessionId;
  final String status;
  @JsonKey(name: 'check_in_time')
  final DateTime checkInTime;
  @JsonKey(name: 'check_out_time')
  final DateTime? checkOutTime;
  final double? latitude;
  final double? longitude;
  @JsonKey(name: 'device_id')
  final String? deviceId;

  AttendanceModel({
    required this.id,
    required this.userId,
    required this.qrSessionId,
    required this.status,
    required this.checkInTime,
    this.checkOutTime,
    this.latitude,
    this.longitude,
    this.deviceId,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) => _$AttendanceModelFromJson(json);
  Map<String, dynamic> toJson() => _$AttendanceModelToJson(this);
}
