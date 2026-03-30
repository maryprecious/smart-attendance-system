import 'package:equatable/equatable.dart';
import '../../models/attendance_model.dart';

abstract class AttendanceEvent extends Equatable {
  const AttendanceEvent();

  @override
  List<Object?> get props => [];
}

class AttendanceMarkRequested extends AttendanceEvent {
  final String qrData;

  const AttendanceMarkRequested({required this.qrData});

  @override
  List<Object?> get props => [qrData];
}

class AttendanceHistoryRequested extends AttendanceEvent {}
