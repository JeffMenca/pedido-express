import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../theme/app_theme.dart';

/// Flies [child] in an arc from [from] to [to] (or to [fallbackTarget] when
/// [to] is not laid out) and completes when it lands. Resolves immediately
/// under reduced motion.
Future<void> flyToTarget({
  required BuildContext context,
  required GlobalKey from,
  required GlobalKey to,
  required Widget child,
  Offset? fallbackTarget,
}) {
  final overlay = Overlay.maybeOf(context, rootOverlay: true);
  final source = _rectOf(from);
  final target =
      _rectOf(to) ??
      (fallbackTarget == null
          ? null
          : Rect.fromCenter(center: fallbackTarget, width: 40, height: 40));
  if (overlay == null ||
      source == null ||
      target == null ||
      AppMotion.reduced(context)) {
    return Future.value();
  }
  final done = Completer<void>();
  late final OverlayEntry entry;
  entry = OverlayEntry(
    builder: (_) => _Flight(
      source: source,
      target: Rect.fromCenter(center: target.center, width: 40, height: 40),
      onDone: () {
        entry.remove();
        if (!done.isCompleted) done.complete();
      },
      child: child,
    ),
  );
  overlay.insert(entry);
  return done.future;
}

Rect? _rectOf(GlobalKey key) {
  final box = key.currentContext?.findRenderObject();
  if (box is! RenderBox || !box.hasSize || !box.attached) return null;
  return box.localToGlobal(Offset.zero) & box.size;
}

class _Flight extends StatefulWidget {
  const _Flight({
    required this.source,
    required this.target,
    required this.onDone,
    required this.child,
  });

  final Rect source;
  final Rect target;
  final VoidCallback onDone;
  final Widget child;

  @override
  State<_Flight> createState() => _FlightState();
}

class _FlightState extends State<_Flight> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: AppMotion.flight,
  )..forward().whenComplete(widget.onDone);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) {
          final t = Curves.easeInOutCubic.transform(_c.value);
          final s = widget.source;
          final e = widget.target;
          // Quadratic bezier lifted above both points for a visible arc.
          final control = Offset(
            s.center.dx,
            (s.center.dy < e.center.dy ? s.center.dy : e.center.dy) - 80,
          );
          final p = Offset(
            _bezier(s.center.dx, control.dx, e.center.dx, t),
            _bezier(s.center.dy, control.dy, e.center.dy, t),
          );
          final size = Size.lerp(s.size, e.size, t)!;
          return Stack(
            children: [
              Positioned(
                left: p.dx - size.width / 2,
                top: p.dy - size.height / 2,
                width: size.width,
                height: size.height,
                child: Opacity(
                  opacity: _c.value > 0.9 ? (1 - _c.value) * 10 : 1,
                  child: widget.child,
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  static double _bezier(double a, double b, double c, double t) =>
      (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
}
