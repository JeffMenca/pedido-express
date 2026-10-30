import 'package:material_ui/material_ui.dart';

import '../../../core/theme/app_theme.dart';

/// Live preview of the card being typed. Only the first and last four digits
/// are ever rendered; the middle is masked and nothing is stored.
class CardPreview extends StatelessWidget {
  const CardPreview({super.key, required this.digits, required this.expiry});

  final String digits;
  final String expiry;

  String get _network => switch (digits.isEmpty ? '' : digits[0]) {
    '4' => 'VISA',
    '5' => 'MASTERCARD',
    '3' => 'AMEX',
    _ => '',
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final slots = digits.length > 16 ? digits.length : 16;
    final numberStyle = AppFonts.mono(
      theme.textTheme.titleLarge?.copyWith(
        color: AppColors.ticket,
        fontWeight: FontWeight.w600,
        fontSize: 21,
      ),
    );
    final label = theme.textTheme.labelSmall?.copyWith(
      color: AppColors.faint,
      letterSpacing: 0.4,
    );
    return Semantics(
      label: digits.length >= 4
          ? 'Tarjeta terminada en ${digits.substring(digits.length - 4)}'
          : 'Vista previa de la tarjeta',
      excludeSemantics: true,
      child: AspectRatio(
        aspectRatio: 1.586,
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
          decoration: BoxDecoration(
            color: AppColors.ink,
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: AppColors.ink.withValues(alpha: 0.25),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    'Pedido Express',
                    style: AppFonts.display(
                      theme.textTheme.titleSmall?.copyWith(
                        color: AppColors.ticket,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const Spacer(),
                  AnimatedSwitcher(
                    duration: AppMotion.enter,
                    child: Text(
                      _network,
                      key: ValueKey(_network),
                      style: AppFonts.mono(
                        theme.textTheme.labelLarge?.copyWith(
                          color: AppColors.mostaza,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              const _Chip(),
              const SizedBox(height: 14),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Row(
                  children: [
                    for (var i = 0; i < slots; i++) ...[
                      if (i > 0 && i % 4 == 0) const SizedBox(width: 12),
                      _Slot(
                        char: _charAt(i),
                        typed: i < digits.length,
                        style: numberStyle,
                      ),
                    ],
                  ],
                ),
              ),
              const Spacer(),
              Text('Vence', style: label),
              const SizedBox(height: 2),
              Text(
                expiry.isEmpty ? 'MM/AA' : expiry.padRight(5, '·'),
                style: AppFonts.mono(
                  theme.textTheme.titleSmall?.copyWith(
                    color: expiry.isEmpty ? AppColors.humo : AppColors.ticket,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _charAt(int i) {
    if (i >= digits.length) return '•';
    final visible = i < 4 || i >= digits.length - 4 && digits.length > 8;
    return visible ? digits[i] : '•';
  }
}

class _Slot extends StatelessWidget {
  const _Slot({required this.char, required this.typed, required this.style});

  final String char;
  final bool typed;
  final TextStyle style;

  @override
  Widget build(BuildContext context) {
    final reduced = AppMotion.reduced(context);
    return ClipRect(
      child: AnimatedSwitcher(
        duration: reduced ? Duration.zero : const Duration(milliseconds: 180),
        transitionBuilder: (child, animation) => SlideTransition(
          position: Tween(
            begin: const Offset(0, 0.6),
            end: Offset.zero,
          ).animate(animation),
          child: FadeTransition(opacity: animation, child: child),
        ),
        child: Text(
          char,
          key: ValueKey('$char$typed'),
          style: style.copyWith(
            color: typed ? AppColors.ticket : AppColors.humo,
          ),
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 42,
      height: 30,
      child: CustomPaint(painter: _ChipPainter()),
    );
  }
}

class _ChipPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final rect = RRect.fromRectAndRadius(
      Offset.zero & size,
      const Radius.circular(6),
    );
    canvas.drawRRect(rect, Paint()..color = AppColors.mostaza);
    final line = Paint()
      ..color = AppColors.ink.withValues(alpha: 0.35)
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke;
    final w = size.width;
    final h = size.height;
    canvas
      ..drawLine(Offset(w * 0.33, 0), Offset(w * 0.33, h), line)
      ..drawLine(Offset(w * 0.67, 0), Offset(w * 0.67, h), line)
      ..drawLine(Offset(0, h * 0.5), Offset(w * 0.33, h * 0.5), line)
      ..drawLine(Offset(w * 0.67, h * 0.5), Offset(w, h * 0.5), line);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
