import 'api_service.dart';
import '../models/attendance_model.dart';

class AttendanceService {
  final ApiService apiService;

  AttendanceService({required this.apiService});

  Future<AttendanceModel?> markAttendance({
    required String qrData,
    double? latitude,
    double? longitude,
    String? deviceId,
  }) async {
    try {
      final response = await apiService.post('/attendance/mark', data: {
        'qrData': qrData,
        'latitude': latitude,
        'longitude': longitude,
        'deviceId': deviceId,
      });

      if (response.data['success'] == true) {
        return AttendanceModel.fromJson(response.data['data']);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<List<AttendanceModel>> getHistory() async {
    try {
      final response = await apiService.get('/attendance/history');
      if (response.data['success'] == true) {
        final List lists = response.data['data'];
        return lists.map((e) => AttendanceModel.fromJson(e)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}
