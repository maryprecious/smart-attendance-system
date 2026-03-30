import 'package:flutter_bloc/flutter_bloc.dart';
import 'attendance_event.dart';
import 'attendance_state.dart';
import '../../services/attendance_service.dart';

class AttendanceBloc extends Bloc<AttendanceEvent, AttendanceState> {
  final AttendanceService attendanceService;

  AttendanceBloc({required this.attendanceService}) : super(AttendanceInitial()) {
    on<AttendanceMarkRequested>(_onMarkRequested);
    on<AttendanceHistoryRequested>(_onHistoryRequested);
  }

  Future<void> _onMarkRequested(AttendanceMarkRequested event, Emitter<AttendanceState> emit) async {
    emit(AttendanceLoading());
    try {
      final attendance = await attendanceService.markAttendance(qrData: event.qrData);
      if (attendance != null) {
        emit(AttendanceSuccess(attendance: attendance));
      } else {
        emit(AttendanceFailure(message: 'Failed to mark attendance'));
      }
    } catch (e) {
      emit(AttendanceFailure(message: e.toString()));
    }
  }

  Future<void> _onHistoryRequested(AttendanceHistoryRequested event, Emitter<AttendanceState> emit) async {
    emit(AttendanceLoading());
    try {
      final history = await attendanceService.getHistory();
      emit(AttendanceHistoryLoaded(history: history));
    } catch (e) {
      emit(AttendanceFailure(message: e.toString()));
    }
  }
}
