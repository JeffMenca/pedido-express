import 'package:material_ui/material_ui.dart';

import '../theme/app_theme.dart';

/// Thermal kitchen ticket: perforated top edge, rounded foot and an optional
/// 4 px status bar on the left.
class TicketCard extends StatelessWidget {
  const TicketCard({super.key, required this.child, this.statusColor});

  final Widget child;
  final Color? statusColor;

  @override
  Widget build(BuildContext context) {
    return ClipPath(
      clipper: const _TicketClipper(),
      child: AnimatedContainer(
        duration: AppMotion.enter,
        decoration: BoxDecoration(
          color: AppColors.ticket,
          border: statusColor == null
              ? null
              : Border(left: BorderSide(color: statusColor!, width: 4)),
        ),
        padding: const EdgeInsets.fromLTRB(18, 22, 18, 18),
        child: child,
      ),
    );
  }
}

class _TicketClipper extends CustomClipper<Path> {
  const _TicketClipper();

  static const _notch = 4.0;
  static const _pitch = 14.0;
  static const _radius = AppRadii.card;

  @override
  Path getClip(Size size) {
    final path = Path()..moveTo(0, 0);
    final count = (size.width / _pitch).floor();
    final offset = (size.width - count * _pitch) / 2;
    path.lineTo(offset, 0);
    for (var i = 0; i < count; i++) {
      final x = offset + i * _pitch + _pitch / 2;
      path
        ..lineTo(x - _notch, 0)
        ..arcToPoint(
          Offset(x + _notch, 0),
          radius: const Radius.circular(_notch),
          clockwise: false,
        );
    }
    path
      ..lineTo(size.width, 0)
      ..lineTo(size.width, size.height - _radius)
      ..arcToPoint(
        Offset(size.width - _radius, size.height),
        radius: const Radius.circular(_radius),
      )
      ..lineTo(_radius, size.height)
      ..arcToPoint(
        Offset(0, size.height - _radius),
        radius: const Radius.circular(_radius),
      )
      ..close();
    return path;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

/// Dashed rule between receipt sections.
class TicketRule extends StatelessWidget {
  const TicketRule({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 12),
      child: SizedBox(
        height: 1,
        width: double.infinity,
        child: CustomPaint(painter: _DashPainter()),
      ),
    );
  }
}

class _DashPainter extends CustomPainter {
  const _DashPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.faint
      ..strokeWidth = 1;
    for (double x = 0; x < size.width; x += 7) {
      canvas.drawLine(Offset(x, 0), Offset(x + 4, 0), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Reveals its child top to bottom, like a ticket coming out of the printer.
/// Falls back to a fade when the platform asks for reduced motion.
class PrintIn extends StatelessWidget {
  const PrintIn({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final reduced = AppMotion.reduced(context);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: AppMotion.print,
      curve: AppMotion.curve,
      child: child,
      builder: (_, v, child) => reduced
          ? Opacity(opacity: v, child: child)
          : ClipRect(
              child: Align(
                alignment: Alignment.topCenter,
                heightFactor: v,
                child: child,
              ),
            ),
    );
  }
}
