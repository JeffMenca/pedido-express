import 'package:material_ui/material_ui.dart';

import '../format/money.dart';
import '../theme/app_theme.dart';

/// Amount whose digits roll like an odometer when the value changes. Digits
/// are keyed from the right so units stay put when the amount grows.
class Odometer extends StatelessWidget {
  const Odometer(this.cents, {super.key, this.style});

  final int cents;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final text = formatCents(cents);
    final effective = AppFonts.mono(
      style ?? DefaultTextStyle.of(context).style,
    );
    final reduced = AppMotion.reduced(context);
    return Semantics(
      label: text,
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < text.length; i++)
            _OdometerChar(
              key: ValueKey(text.length - i),
              char: text[i],
              style: effective,
              reduced: reduced,
            ),
        ],
      ),
    );
  }
}

class _OdometerChar extends StatelessWidget {
  const _OdometerChar({
    super.key,
    required this.char,
    required this.style,
    required this.reduced,
  });

  final String char;
  final TextStyle style;
  final bool reduced;

  @override
  Widget build(BuildContext context) {
    final digit = int.tryParse(char);
    if (digit == null) return Text(char, style: style);
    return TweenAnimationBuilder<double>(
      tween: Tween(end: digit.toDouble()),
      duration: reduced ? Duration.zero : const Duration(milliseconds: 420),
      curve: AppMotion.curve,
      builder: (context, value, _) => _DigitColumn(value: value, style: style),
    );
  }
}

/// Renders the two digits around a fractional [value], offset vertically.
class _DigitColumn extends StatelessWidget {
  const _DigitColumn({required this.value, required this.style});

  final double value;
  final TextStyle style;

  @override
  Widget build(BuildContext context) {
    final lower = value.floor();
    final frac = value - lower;
    final current = Text('${lower % 10}', style: style);
    if (frac < 0.001) return current;
    return ClipRect(
      child: Stack(
        children: [
          Opacity(opacity: 0, child: current),
          Positioned.fill(
            child: FractionalTranslation(
              translation: Offset(0, -frac),
              child: Opacity(opacity: 1 - frac, child: current),
            ),
          ),
          Positioned.fill(
            child: FractionalTranslation(
              translation: Offset(0, 1 - frac),
              child: Opacity(
                opacity: frac,
                child: Text('${(lower + 1) % 10}', style: style),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
