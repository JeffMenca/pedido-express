import 'package:material_ui/material_ui.dart';

import '../theme/app_theme.dart';

/// Diagonal 1.2 s sweep painted over every [SkeletonBox] below it. One
/// controller drives the whole subtree so all blocks stay in phase. Static
/// under reduced motion.
class Shimmer extends StatefulWidget {
  const Shimmer({super.key, required this.child});

  final Widget child;

  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (AppMotion.reduced(context)) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (AppMotion.reduced(context)) return widget.child;
    return AnimatedBuilder(
      animation: _controller,
      child: widget.child,
      builder: (context, child) {
        final t = _controller.value;
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) => LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: const [
              AppColors.skeleton,
              AppColors.shimmerHighlight,
              AppColors.skeleton,
            ],
            stops: const [0.35, 0.5, 0.65],
            transform: _SlideGradient(t),
          ).createShader(bounds),
          child: child,
        );
      },
    );
  }
}

class _SlideGradient extends GradientTransform {
  const _SlideGradient(this.t);

  final double t;

  @override
  Matrix4 transform(Rect bounds, {TextDirection? textDirection}) =>
      Matrix4.translationValues(bounds.width * (t * 2 - 1), 0, 0);
}

/// Placeholder block with the shape of the content it stands in for.
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    super.key,
    this.width = 72,
    this.height = 16,
    this.radius = 4,
    this.circle = false,
  });

  final double? width;
  final double height;
  final double radius;
  final bool circle;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppColors.skeleton,
        shape: circle ? BoxShape.circle : BoxShape.rectangle,
        borderRadius: circle ? null : BorderRadius.circular(radius),
      ),
    );
  }
}
