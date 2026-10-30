import 'package:material_ui/material_ui.dart';

import '../theme/app_theme.dart';

/// Scales its child to 0.97 while a pointer is down. Uses a [Listener] so the
/// child keeps its own tap handling and ink.
class PressableScale extends StatefulWidget {
  const PressableScale({
    super.key,
    required this.child,
    this.enabled = true,
    this.scale = 0.97,
  });

  final Widget child;
  final bool enabled;
  final double scale;

  @override
  State<PressableScale> createState() => _PressableScaleState();
}

class _PressableScaleState extends State<PressableScale> {
  bool _down = false;

  void _set(bool down) {
    if (_down != down) setState(() => _down = down);
  }

  @override
  Widget build(BuildContext context) {
    final active = widget.enabled && !AppMotion.reduced(context);
    return Listener(
      onPointerDown: active ? (_) => _set(true) : null,
      onPointerUp: (_) => _set(false),
      onPointerCancel: (_) => _set(false),
      child: AnimatedScale(
        scale: _down && active ? widget.scale : 1,
        duration: AppMotion.press,
        curve: Curves.easeOut,
        child: widget.child,
      ),
    );
  }
}
