import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../controllers/auth/auth_bloc.dart';
import '../../controllers/auth/auth_state.dart';
import '../../controllers/attendance/attendance_bloc.dart';
import '../../controllers/attendance/attendance_event.dart';
import '../../controllers/attendance/attendance_state.dart';
import '../auth/logout_screen.dart';
import 'scan_screen.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  static const Color primaryBlue = Color(0xFF2E31D6);
  String _selectedTab = 'All';

  @override
  void initState() {
    super.initState();
    context.read<AttendanceBloc>().add(AttendanceHistoryRequested());
  }

  void _showLogoutPopup(BuildContext context) {
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
    final authState = context.watch<AuthBloc>().state;
    final user = authState is AuthAuthenticated ? authState.user : null;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
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

              const SizedBox(height: 20),

              // Title and Download
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Attendance History',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: primaryBlue,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.download, color: Colors.white, size: 20),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Summary Card
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: primaryBlue,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.trending_up, color: Colors.white, size: 24),
                          const SizedBox(width: 8),
                          const Text(
                            'Overall Attendance',
                            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        '75%',
                        style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      // Progress Bar
                      Container(
                        height: 4,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(2),
                        ),
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: 0.75,
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _SummaryMetric(label: 'Total', value: '10'),
                          _SummaryMetric(label: 'Present', value: '6'),
                          _SummaryMetric(label: 'Absent', value: '3'),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Tabs
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    _TabButton(
                      label: 'All',
                      isSelected: _selectedTab == 'All',
                      onTap: () => setState(() => _selectedTab = 'All'),
                    ),
                    const SizedBox(width: 12),
                    _TabButton(
                      label: 'Present',
                      isSelected: _selectedTab == 'Present',
                      onTap: () => setState(() => _selectedTab = 'Present'),
                    ),
                    const SizedBox(width: 12),
                    _TabButton(
                      label: 'Absent',
                      isSelected: _selectedTab == 'Absent',
                      onTap: () => setState(() => _selectedTab = 'Absent'),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // History List
              BlocBuilder<AttendanceBloc, AttendanceState>(
                builder: (context, state) {
                  List<_HistoryItem> items = [];
                  if (state is AttendanceHistoryLoaded) {
                    // Actual history from Bloc if available
                    for (var record in state.history) {
                      bool isPresent = record.status == 'present';
                      if (_selectedTab == 'Present' && !isPresent) continue;
                      if (_selectedTab == 'Absent' && isPresent) continue;

                      items.add(_HistoryItem(
                        title: 'Session ${record.qrSessionId}',
                        date: record.checkInTime.toString().substring(0, 10),
                        time: record.checkInTime.toString().substring(11, 16),
                        room: 'Room N/A',
                        status: isPresent ? 'Present' : 'Absent',
                      ));
                    }
                  } else {
                    // Mock data to match image
                    items = [
                      const _HistoryItem(
                        title: 'Mobile App Development',
                        date: 'Tue, Dec 10, 2025',
                        time: '01:30 PM',
                        room: 'Room 205',
                        status: 'Present',
                      ),
                      const _HistoryItem(
                        title: 'Product Design',
                        date: 'Mon, Dec 9, 2025',
                        time: '09:00 AM',
                        room: 'Room 120',
                        status: 'Present',
                      ),
                      const _HistoryItem(
                        title: 'Front End Development',
                        date: 'Sat, Dec 7, 2025',
                        time: '--:-- --',
                        room: 'Room 333',
                        status: 'Absent',
                      ),
                      const _HistoryItem(
                        title: 'Product Management',
                        date: 'Fri, Dec 6, 2025',
                        time: '--:-- --',
                        room: 'Room 107',
                        status: 'Absent',
                      ),
                      const _HistoryItem(
                        title: 'Testing and Quality Assurance',
                        date: 'Thur, Dec 5, 2025',
                        time: '02:30 PM',
                        room: 'Room 407',
                        status: 'Present',
                      ),
                      const _HistoryItem(
                        title: 'Backend Services & API',
                        date: 'Wed, Dec 4, 2025',
                        time: '12:30 PM',
                        room: 'Room 202',
                        status: 'Late',
                      ),
                      const _HistoryItem(
                        title: 'Database Architecture',
                        date: 'Mon, Dec 2, 2025',
                        time: '10:30 AM',
                        room: 'Room 119',
                        status: 'Present',
                      ),
                    ];
                  }

                  // Filter mock items if no bloc data
                  if (state is! AttendanceHistoryLoaded) {
                    if (_selectedTab == 'Present') {
                      items = items.where((i) => i.status == 'Present' || i.status == 'Late').toList();
                    } else if (_selectedTab == 'Absent') {
                      items = items.where((i) => i.status == 'Absent').toList();
                    }
                  }

                  return Column(
                    children: items,
                  );
                },
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: 2,
        selectedItemColor: primaryBlue,
        unselectedItemColor: Colors.grey,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
        onTap: (index) {
          if (index == 0) {
            Navigator.of(context).pop();
          } else if (index == 1) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (context) => ScanScreen()),
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

class _SummaryMetric extends StatelessWidget {
  final String label;
  final String value;
  const _SummaryMetric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 14),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _TabButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? (label == 'Present' ? const Color(0xFF00C853) : (label == 'Absent' ? Colors.red : _HistoryScreenState.primaryBlue)) : Colors.grey.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.grey,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HistoryItem extends StatelessWidget {
  final String title;
  final String date;
  final String time;
  final String room;
  final String status;

  const _HistoryItem({
    required this.title,
    required this.date,
    required this.time,
    required this.room,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    Color statusBgColor;
    IconData statusIcon;

    if (status == 'Present') {
      statusColor = const Color(0xFF00BFA5);
      statusBgColor = const Color(0xFFA7FFEB);
      statusIcon = Icons.check_circle;
    } else if (status == 'Late') {
      statusColor = Colors.orange;
      statusBgColor = Colors.orange.withOpacity(0.2);
      statusIcon = Icons.access_time;
    } else {
      statusColor = Colors.red;
      statusBgColor = const Color(0xFFFFCDD2);
      statusIcon = Icons.cancel;
    }

    return Container(
      margin: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.grey.withOpacity(0.2)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBgColor,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(statusIcon, size: 14, color: statusColor),
                    const SizedBox(width: 4),
                    Text(
                      status,
                      style: TextStyle(
                        fontSize: 11,
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.calendar_today_outlined, size: 14, color: Colors.grey),
              const SizedBox(width: 4),
              Text(
                date,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const Spacer(),
              Text(
                time,
                style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w500),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            room,
            style: const TextStyle(fontSize: 13, color: Colors.grey),
          ),
        ],
      ),
    );
  }
}
