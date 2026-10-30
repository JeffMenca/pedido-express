import 'package:material_ui/material_ui.dart';

import '../theme/app_theme.dart';

class QuantityStepper extends StatelessWidget {
  const QuantityStepper({
    super.key,
    required this.value,
    required this.onChanged,
    this.min = 1,
    this.max = 20,
    this.onRemove,
    this.onDark = false,
    this.compact = false,
  });

  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  /// When set, the decrement button turns into "remove" at the minimum.
  final VoidCallback? onRemove;
  final bool onDark;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final fg = onDark ? AppColors.ticket : AppColors.ink;
    final disabled = onDark ? AppColors.humo : AppColors.faint;
    final style = AppFonts.mono(
      Theme.of(context).textTheme.titleMedium
          ?.copyWith(fontWeight: FontWeight.w700, color: fg),
    );
    final removing = value <= min && onRemove != null;
    final reduced = AppMotion.reduced(context);
    final buttonSize = compact ? 36.0 : 44.0;
    Widget button({
      required String tooltip,
      required IconData icon,
      VoidCallback? onPressed,
      Color? color,
    }) => IconButton(
      tooltip: tooltip,
      constraints: BoxConstraints.tight(Size(buttonSize, buttonSize)),
      padding: EdgeInsets.zero,
      iconSize: compact ? 18 : 22,
      color: color ?? fg,
      disabledColor: disabled,
      icon: AnimatedSwitcher(
        duration: AppMotion.press,
        child: Icon(icon, key: ValueKey(icon)),
      ),
      onPressed: onPressed,
    );
    return Container(
      decoration: BoxDecoration(
        color: onDark ? AppColors.inkSoft : AppColors.steel,
        borderRadius: BorderRadius.circular(compact ? 12 : 14),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          removing
              ? button(
                  tooltip: 'Quitar del carrito',
                  icon: Icons.delete_outline,
                  color: AppColors.salsa,
                  onPressed: onRemove,
                )
              : button(
                  tooltip: 'Disminuir cantidad',
                  icon: Icons.remove,
                  onPressed: value > min ? () => onChanged(value - 1) : null,
                ),
          SizedBox(
            width: compact ? 24 : 30,
            child: ClipRect(
              child: AnimatedSwitcher(
                duration: reduced ? Duration.zero : AppMotion.enter,
                transitionBuilder: (child, animation) => SlideTransition(
                  position: Tween(
                    begin: const Offset(0, 0.5),
                    end: Offset.zero,
                  ).animate(animation),
                  child: FadeTransition(opacity: animation, child: child),
                ),
                child: Text(
                  '$value',
                  key: ValueKey(value),
                  textAlign: TextAlign.center,
                  style: style,
                ),
              ),
            ),
          ),
          button(
            tooltip: 'Aumentar cantidad',
            icon: Icons.add,
            onPressed: value < max ? () => onChanged(value + 1) : null,
          ),
        ],
      ),
    );
  }
}
