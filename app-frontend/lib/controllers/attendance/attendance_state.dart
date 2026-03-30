import 'package:equatable/equatable.dart';
import '../../models/attendance_model.dart';

abstract class AttendanceState extends Equatable {
  const AttendanceState();

  @override
  List<Object?> get props => [];
}

class AttendanceInitial extends AttendanceState {}

class AttendanceLoading extends AttendanceState {}

class AttendanceSuccess extends AttendanceState {
  final AttendanceModel attendance;

  const AttendanceSuccess({required this.attendance});

  @override
  List<Object?> get props => [attendance];
}

class AttendanceHistoryLoaded extends AttendanceState {
  final List<AttendanceModel> history;

  const AttendanceHistoryLoaded({required this.history});

  @override
  List<Object?> get props => [history];
}

class AttendanceFailure extends AttendanceState {
  final String message;

  const AttendanceFailure({required this.message});

  @override
  List<Object?> get props => [message];
}
