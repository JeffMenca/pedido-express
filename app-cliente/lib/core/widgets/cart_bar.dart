import 'package:material_ui/material_ui.dart';

import '../theme/app_theme.dart';
import 'odometer.dart';
import 'pressable_scale.dart';
import 'product_art.dart';

typedef CartThumb = ({String sku, Color tint});

/// Floating ink bar with the latest items, count and API total. Bumps
/// (1 → 1.04 → 1) whenever the item count grows.
class CartBar extends StatefulWidget {
  const CartBar({
    super.key,
    required this.count,
    required this.thumbs,
    required this.totalCents,
    required this.onTap,
    this.targetKey,
    this.updating = false,
  });

  final int count;
  final List<CartThumb> thumbs;

  /// Null until the first quote arrives.
  final int? totalCents;
  final bool updating;
  final VoidCallback onTap;

  /// Marks where flying thumbnails land.
  final GlobalKey? targetKey;

  @override
  State<CartBar> createState() => _CartBarState();
}

class _CartBarState extends State<CartBar> with SingleTickerProviderStateMixin {
  late final AnimationController _bump = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 320),
  );
  late final Animation<double> _scale = TweenSequence([
    TweenSequenceItem(
      tween: Tween(
        begin: 1.0,
        end: 1.04,
      ).chain(CurveTween(curve: Curves.easeOut)),
      weight: 40,
    ),
    TweenSequenceItem(
      tween: Tween(
        begin: 1.04,
        end: 1.0,
      ).chain(CurveTween(curve: Curves.easeIn)),
      weight: 60,
    ),
  ]).animate(_bump);

  @override
  void didUpdateWidget(CartBar old) {
    super.didUpdateWidget(old);
    if (widget.count > old.count &&
        old.count > 0 &&
        !AppMotion.reduced(context)) {
      _bump.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _bump.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final visible = widget.count > 0;
    final reduced = AppMotion.reduced(context);
    final label = widget.count == 1
        ? '1 artículo'
        : '${widget.count} artículos';
    return AnimatedSlide(
      offset: visible ? Offset.zero : const Offset(0, 1.6),
      duration: reduced ? Duration.zero : const Duration(milliseconds: 320),
      curve: AppMotion.curve,
      child: AnimatedOpacity(
        opacity: visible ? 1 : 0,
        duration: AppMotion.enter,
        child: IgnorePointer(
          ignoring: !visible,
          child: ScaleTransition(
            scale: _scale,
            child: PressableScale(
              child: Semantics(
                button: true,
                label: 'Ver carrito, $label',
                child: Material(
                  color: AppColors.ink,
                  borderRadius: BorderRadius.circular(AppRadii.bar),
                  elevation: 8,
                  shadowColor: AppColors.ink.withValues(alpha: 0.4),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AppRadii.bar),
                    onTap: widget.onTap,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
                      child: Row(
                        children: [
                          _Thumbs(
                            thumbs: widget.thumbs,
                            targetKey: widget.targetKey,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  label,
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: AppColors.faint,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                AnimatedOpacity(
                                  opacity: widget.updating ? 0.5 : 1,
                                  duration: AppMotion.enter,
                                  child: widget.totalCents == null
                                      ? Container(
                                          width: 72,
                                          height: 18,
                                          margin: const EdgeInsets.only(top: 2),
                                          decoration: BoxDecoration(
                                            color: AppColors.inkLine,
                                            borderRadius: BorderRadius.circular(
                                              4,
                                            ),
                                          ),
                                        )
                                      : FittedBox(
                                          fit: BoxFit.scaleDown,
                                          alignment: Alignment.centerLeft,
                                          child: Odometer(
                                            widget.totalCents!,
                                            style: theme.textTheme.titleMedium
                                                ?.copyWith(
                                                  color: AppColors.ticket,
                                                  fontWeight: FontWeight.w700,
                                                ),
                                          ),
                                        ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            'Ver carrito',
                            style: theme.textTheme.titleSmall?.copyWith(
                              color: AppColors.ticket,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Container(
                            width: 36,
                            height: 36,
                            decoration: const BoxDecoration(
                              color: AppColors.mostaza,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.arrow_forward,
                              size: 18,
                              color: AppColors.ink,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Thumbs extends StatelessWidget {
  const _Thumbs({required this.thumbs, this.targetKey});

  static const _size = 40.0;
  static const _overlap = 24.0;

  final List<CartThumb> thumbs;
  final GlobalKey? targetKey;

  @override
  Widget build(BuildContext context) {
    final shown = thumbs.take(3).toList();
    final width = shown.isEmpty ? _size : _size + (shown.length - 1) * _overlap;
    return AnimatedContainer(
      key: targetKey,
      duration: AppMotion.enter,
      curve: AppMotion.curve,
      width: width,
      height: _size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          for (var i = shown.length - 1; i >= 0; i--)
            AnimatedPositioned(
              key: ValueKey('${shown[i].sku}-$i'),
              duration: AppMotion.enter,
              curve: AppMotion.curve,
              left: i * _overlap,
              top: 0,
              child: ArtTile(
                sku: shown[i].sku,
                tint: shown[i].tint,
                size: _size,
                circle: true,
                border: Border.all(color: AppColors.ink, width: 2),
              ),
            ),
        ],
      ),
    );
  }
}
