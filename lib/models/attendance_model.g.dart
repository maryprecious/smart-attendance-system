// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'attendance_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AttendanceModel _$AttendanceModelFromJson(Map<String, dynamic> json) =>
    AttendanceModel(
      id: (json['id'] as num).toInt(),
      userId: (json['user_id'] as num).toInt(),
      qrSessionId: (json['qrsession_id'] as num).toInt(),
      status: json['status'] as String,
      checkInTime: DateTime.parse(json['check_in_time'] as String),
      checkOutTime: json['check_out_time'] == null
          ? null
          : DateTime.parse(json['check_out_time'] as String),
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      deviceId: json['device_id'] as String?,
    );

Map<String, dynamic> _$AttendanceModelToJson(AttendanceModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'user_id': instance.userId,
      'qrsession_id': instance.qrSessionId,
      'status': instance.status,
      'check_in_time': instance.checkInTime.toIso8601String(),
      'check_out_time': instance.checkOutTime?.toIso8601String(),
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'device_id': instance.deviceId,
    };
