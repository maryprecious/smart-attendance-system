import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../controllers/auth/auth_bloc.dart';
import '../../controllers/auth/auth_state.dart';
import '../../controllers/attendance/attendance_bloc.dart';
import '../../controllers/attendance/attendance_event.dart';
import '../../controllers/attendance/attendance_state.dart';
import '../attendance/scan_screen.dart';
import '../auth/logout_screen.dart';

import '../attendance/history_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  static const Color primaryBlue = Color(0xFF2E31D6);

  @override
  void initState() {
    super.initState();
    context.read<AttendanceBloc>().add(AttendanceHistoryRequested());
  }

  void _showLogoutPopup(BuildContext context) {
    // Positioning the popup near the menu icon
    final RenderBox button = context.findRenderObject() as RenderBox;
    final RenderBox overlay = Navigator.of(context).overlay!.context.findRenderObject() as RenderBox;
    final RelativeRect position = RelativeRect.fromRect(
      Rect.fromPoints(
        button.localToGlobal(Offset.zero, ancestor: overlay),
        button.localToGlobal(button.size.bottomRight(Offset.zero), ancestor: overlay),
      ),
      Offset.zero & overlay.size,
    );

    showMenu(
      context: context,
      position: position,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      items: [
        PopupMenuItem(
          onTap: () {
            Future.delayed(Duration.zero, () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => const LogoutScreen()),
              );
            });
          },
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.red),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Icon(Icons.logout, color: Colors.red, size: 16),
              ),
              const SizedBox(width: 8),
              const Text(
                'Logout',
                style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.read<AuthBloc>().state;
    final user = authState is AuthAuthenticated ? authState.user : null;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Section
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.username ?? 'Olamide',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user?.id.toString() ?? '00137',
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                    ),
                    Builder(
                      builder: (context) => IconButton(
                        icon: const Icon(Icons.menu),
                        onPressed: () => _showLogoutPopup(context),
                      ),
                    ),
                  ],
                ),
              ),

              // Greeting Card
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: primaryBlue,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hello ${user?.username ?? "Olamide"} !',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Student ID: ${user?.id.toString() ?? "00137"}',
                        style: const TextStyle(fontSize: 14, color: Colors.white),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Track your attendance and never miss a thing',
                        style: TextStyle(fontSize: 13, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Stats Grid
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.4,
                  children: const [
                    _StatCard(
                      color: Color(0xFF2E7D32),
                      icon: Icons.trending_up,
                      value: '87%',
                      label: 'Attendance Rate',
                    ),
                    _StatCard(
                      color: Color(0xFF2E31D6),
                      icon: Icons.check_circle_outline,
                      value: '45',
                      label: 'Present',
                    ),
                    _StatCard(
                      color: Colors.red,
                      icon: Icons.cancel_outlined,
                      value: '12',
                      label: 'Absent',
                    ),
                    _StatCard(
                      color: Color(0xFF9C27B0),
                      icon: Icons.access_time,
                      value: '60',
                      label: 'Total Meetings',
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Today's Schedule Section
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  "Today's Schedule",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 12),

              BlocBuilder<AttendanceBloc, AttendanceState>(
                builder: (context, state) {
                  List<Widget> scheduleItems = [];
                  if (state is AttendanceLoading) {
                    scheduleItems = [const Center(child: CircularProgressIndicator())];
                  } else if (state is AttendanceHistoryLoaded && state.history.isNotEmpty) {
                    scheduleItems = state.history.map((item) {
                      return _ScheduleCard(
                        title: 'Session ${item.qrSessionId}',
                        room: item.status,
                        time: item.checkInTime.toString().substring(11, 16),
                        status: 'Done',
                      );
                    }).toList();
                  } else {
                    scheduleItems = const [
                      _ScheduleCard(
                        title: 'Product Design',
                        room: 'Room 120',
                        time: '09:00 AM',
                        status: 'Upcoming',
                      ),
                      _ScheduleCard(
                        title: 'Mobile App Dev',
                        room: 'Room 205',
                        time: '10:30 AM',
                        status: 'Upcoming',
                      ),
                      _ScheduleCard(
                        title: 'Front End Dev',
                        room: 'Room 333',
                        time: '01:30 PM',
                        status: 'Upcoming',
                      ),
                      _ScheduleCard(
                        title: 'Product Management',
                        room: 'Room 107',
                        time: '03:00 PM',
                        status: 'Upcoming',
                      ),
                    ];
                  }
                  return Column(children: scheduleItems);
                },
              ),

              const SizedBox(height: 24),

              // Recent Attendance Section
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  "Recent Attendance",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 12),
              const _RecentAttendanceCard(
                title: 'Mobile App Development',
                date: 'Mon, Dec 8',
                time: '03:00 PM',
                isPresent: true,
              ),
              const _RecentAttendanceCard(
                title: 'Product Design',
                date: 'Sat, Dec 6',
                time: '10:00 PM',
                isPresent: true,
              ),
              const _RecentAttendanceCard(
                title: 'Product Management',
                date: 'Fri, Dec 5',
                time: 'Absent', // Matches image behavior maybe?
                isPresent: false,
              ),
              const _RecentAttendanceCard(
                title: 'Front End Development',
                date: 'Thur, Dec 4',
                time: 'Absent',
                isPresent: false,
              ),

              const SizedBox(height: 24),

              // Quick Tip Section
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF9C4),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFFF176)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Quick Tip',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFFBC02D),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Make sure to scan the QR code within 60 seconds of it being displayed. The code expires quickly for security reasons.',
                        style: TextStyle(
                          fontSize: 13,
                          color: Color(0xFF9E9E00),
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: 0,
        selectedItemColor: primaryBlue,
        unselectedItemColor: Colors.grey,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
        onTap: (index) {
          if (index == 1) {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (context) => const ScanScreen()),
            );
          } else if (index == 2) {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (context) => const HistoryScreen()),
            );
          }
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(
            icon: Icon(Icons.qr_code_scanner_outlined),
            activeIcon: Icon(Icons.qr_code_scanner),
            label: 'Scan QR',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.history_outlined),
            activeIcon: Icon(Icons.history),
            label: 'History',
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String value;
  final String label;

  const _StatCard({
    required this.color,
    required this.icon,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.grey.withOpacity(0.2)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: Colors.white, size: 20),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: Colors.grey,
            ),
          ),
        ],
      ),
    );
  }
}

class _ScheduleCard extends StatelessWidget {
  final String title;
  final String room;
  final String time;
  final String status;

  const _ScheduleCard({
    required this.title,
    required this.room,
    required this.time,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFF2E31D6).withOpacity(0.3)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                room,
                style: const TextStyle(
                  fontSize: 13,
                  color: Colors.grey,
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                time,
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF2E31D6),
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF2E31D6).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  'Upcoming',
                  style: TextStyle(
                    fontSize: 11,
                    color: Color(0xFF2E31D6),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RecentAttendanceCard extends StatelessWidget {
  final String title;
  final String date;
  final String time;
  final bool isPresent;

  const _RecentAttendanceCard({
    required this.title,
    required this.date,
    required this.time,
    required this.isPresent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.grey.withOpacity(0.2)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                date,
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isPresent ? const Color(0xFFA7FFEB) : const Color(0xFFFFCDD2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isPresent ? Icons.check_circle : Icons.cancel,
                      size: 14,
                      color: isPresent ? const Color(0xFF00BFA5) : Colors.red,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isPresent ? 'Present' : 'Absent',
                      style: TextStyle(
                        fontSize: 11,
                        color: isPresent ? const Color(0xFF00BFA5) : Colors.red,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                time == 'Absent' ? '--:-- --' : time,
                style: const TextStyle(
                  fontSize: 11,
                  color: Colors.grey,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

