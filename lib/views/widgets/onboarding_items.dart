import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class BlobPainter1 extends CustomPainter {
  final Color color;
  BlobPainter1({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    Paint paint = Paint()..color = color;
    Path path = Path();
    
    // Smooth organic blob for the top-left
    path.moveTo(0, 0);
    path.lineTo(size.width * 0.7, 0);
    path.cubicTo(
      size.width * 0.65, size.height * 0.3,
      size.width * 0.45, size.height * 0.5,
      size.width * 0.2, size.height * 0.4,
    );
    path.quadraticBezierTo(
      size.width * 0.05, size.height * 0.35,
      0, size.height * 0.55,
    );
    path.close();
    
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class BlobPainter2 extends CustomPainter {
  final Color color;
  BlobPainter2({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    Paint paint = Paint()..color = color;
    Path path = Path();
    
    // Flowing wavy shape for the background
    path.moveTo(size.width * 0.3, 0);
    path.lineTo(size.width, 0);
    path.quadraticBezierTo(
      size.width, size.height * 0.4,
      size.width * 0.85, size.height * 0.6,
    );
    path.cubicTo(
      size.width * 0.7, size.height * 0.85,
      size.width * 0.3, size.height * 0.85,
      0, size.height * 0.95,
    );
    path.lineTo(0, 0);
    path.close();
    
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class OnboardItem extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String description;
  final Color waveColor1;
  final Color waveColor2;
  final bool isFlipped;

  const OnboardItem({
    super.key,
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.description,
    required this.waveColor1,
    required this.waveColor2,
    this.isFlipped = false,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        children: [
          // Header blobs
          SizedBox(
            height: 240, // Reduced from 280 to save space
            width: double.infinity,
            child: Transform.scale(
              scaleX: isFlipped ? -1 : 1,
              child: Stack(
                children: [
                  // Light blue wave (Blob 2)
                  Positioned.fill(
                    child: CustomPaint(
                      painter: BlobPainter2(color: waveColor1),
                    ),
                  ),
                  // Dark blue blob (Blob 1)
                  Positioned(
                    top: 0,
                    left: 0,
                    width: 260, // Slightly smaller
                    height: 260,
                    child: CustomPaint(
                      painter: BlobPainter1(color: waveColor2),
                    ),
                  ),
                ],
              ),
            ),
          ),
    
          const SizedBox(height: 20),
    
          // Icon
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 70, color: iconColor), // Slightly smaller icon
          ),
    
          const SizedBox(height: 30),
    
          // Title
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              title,
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 24, // Slightly smaller font
                fontWeight: FontWeight.w800,
                color: waveColor2,
                letterSpacing: -0.5,
              ),
            ),
          ),
    
          const SizedBox(height: 12),
    
          // Description
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              description,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14, // Slightly smaller font
                height: 1.5,
                color: Colors.black87,
                fontWeight: FontWeight.w400,
              ),
            ),
          ),
          
          const SizedBox(height: 40), // Fixed spacing at the bottom
        ],
      ),
    );
  }
}
