import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../controllers/auth/auth_event.dart';
import '../../controllers/auth/auth_bloc.dart';
import '../widgets/onboarding_items.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _controller = PageController();
  int currentIndex = 0;
  final Color primaryColor = const Color(0xFF2E31D6); // Matching mockup blue
  final Color waveColor1 = const Color(0xFF6CA7FF); // Matching mockup light blue
  final Color waveColor2 = const Color(0xFF2E31D6);

  @override
  void initState() {
    super.initState();
    // Professional look: Hide status bar for onboarding
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    // Restore status bar
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  void nextPage() {
    if (currentIndex < 3) {
      _controller.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      context.read<AuthBloc>().add(AuthOnboardingCompleted());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: PageView(
                    controller: _controller,
                    onPageChanged: (index) {
                      setState(() {
                        currentIndex = index;
                      });
                    },
                    children: [
                      OnboardItem(
                        icon: Icons.check_circle_outline,
                        iconColor: primaryColor,
                        waveColor1: waveColor1,
                        waveColor2: waveColor2,
                        title: 'Smart Attendance System',
                        description: 'Welcome to your modern digital attendance platform',
                      ),
                      OnboardItem(
                        icon: Icons.qr_code_2,
                        iconColor: primaryColor,
                        waveColor1: waveColor1,
                        waveColor2: waveColor2,
                        title: 'Smart QR Attendance',
                        description: 'Scan QR to mark your attendance quickly and securely. Each session expires after 60 seconds.',
                      ),
                      OnboardItem(
                        icon: Icons.groups_outlined,
                        iconColor: const Color(0xFF00B050),
                        waveColor1: waveColor1,
                        waveColor2: waveColor2,
                        title: 'Easy User Management',
                        description: 'Admins can manage students and staff with bulk upload capabilities, using Excel files.',
                      ),
                      OnboardItem(
                        icon: Icons.schedule_outlined,
                        iconColor: const Color(0xFFF24822),
                        waveColor1: waveColor1,
                        waveColor2: waveColor2,
                        isFlipped: true,
                        title: 'Real-Time Tracking',
                        description: 'Track attendance in real-time with instant notifications and comprehensive reports.',
                      ),
                    ],
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(4, (index) {
                    return Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      height: 8,
                      width: currentIndex == index ? 24 : 8,
                      decoration: BoxDecoration(
                        color: currentIndex == index ? primaryColor : Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(10),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 20),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 40),
                  child: SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: nextPage,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            currentIndex < 3 ? 'NEXT' : 'GET STARTED',
                            style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(
                            currentIndex < 3 ? Icons.chevron_right : Icons.check,
                            color: Colors.white,
                            size: 20,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 40),
                RichText(
                  text: TextSpan(
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      color: Colors.black87,
                      fontWeight: FontWeight.w500,
                    ),
                    children: [
                      const TextSpan(text: 'A '),
                      TextSpan(
                        text: 'Conclase Academy',
                        style: GoogleFonts.outfit(
                          color: primaryColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const TextSpan(text: ' Project'),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
