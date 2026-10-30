import 'package:material_ui/material_ui.dart';

import '../../../core/format/money.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/pressable_scale.dart';
import '../domain/menu.dart';

String _wholeQuetzales(int cents) {
  final text = formatCents(cents);
  return text.endsWith('.00') ? text.substring(0, text.length - 3) : text;
}

/// Short plain description, e.g. "15 % en pedidos desde Q100".
String promotionSummary(Promotion p) {
  final String benefit;
  if (p.type == PromotionType.porcentaje) {
    final whole = p.value ~/ 100;
    final rest = p.value % 100;
    final pct = rest == 0
        ? '$whole'
        : '$whole.${rest.toString().padLeft(2, '0').replaceAll(RegExp(r'0$'), '')}';
    benefit = '$pct % de descuento';
  } else {
    benefit = '${_wholeQuetzales(p.value)} de descuento';
  }
  if (p.minimumCents <= 0) return benefit;
  final short = p.type == PromotionType.porcentaje
      ? benefit.replaceFirst(' de descuento', '')
      : benefit;
  return '$short en pedidos desde ${_wholeQuetzales(p.minimumCents)}';
}

String? _validity(String? validTo) {
  final m = RegExp(r'^\d{4}-(\d{2})-(\d{2})').firstMatch(validTo ?? '');
  if (m == null) return null;
  return 'Válido hasta el ${m.group(2)}/${m.group(1)}';
}

class PromoBanner extends StatelessWidget {
  const PromoBanner({
    super.key,
    required this.promotions,
    required this.appliedCode,
    required this.onUse,
  });

  final List<Promotion> promotions;
  final String? appliedCode;
  final ValueChanged<Promotion> onUse;

  @override
  Widget build(BuildContext context) {
    if (promotions.length == 1) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: _CouponStub(
          promotion: promotions.first,
          applied: appliedCode == promotions.first.code,
          onUse: onUse,
        ),
      );
    }
    return SizedBox(
      height: _CouponStub.height,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        physics: const BouncingScrollPhysics(),
        itemCount: promotions.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, i) => SizedBox(
          width: MediaQuery.sizeOf(context).width - 56,
          child: _CouponStub(
            promotion: promotions[i],
            applied: appliedCode == promotions[i].code,
            onUse: onUse,
          ),
        ),
      ),
    );
  }
}

/// Ink coupon stub: perforation splits the code from the action, with
/// half-circle bites at both ends of the tear line.
class _CouponStub extends StatelessWidget {
  const _CouponStub({
    required this.promotion,
    required this.applied,
    required this.onUse,
  });

  static const height = 116.0;
  static const _actionWidth = 104.0;

  final Promotion promotion;
  final bool applied;
  final ValueChanged<Promotion> onUse;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final validity = _validity(promotion.validTo);
    return SizedBox(
      height: height,
      child: ClipPath(
        clipper: const _StubClipper(actionWidth: _actionWidth),
        child: ColoredBox(
          color: AppColors.ink,
          child: Row(
            children: [
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(18, 14, 12, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        promotion.code,
                        style: AppFonts.mono(
                          theme.textTheme.titleLarge?.copyWith(
                            color: AppColors.mostaza,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.5,
                            fontSize: 22,
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        promotionSummary(promotion),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppColors.ticket,
                          fontWeight: FontWeight.w500,
                          height: 1.25,
                        ),
                      ),
                      if (validity != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          validity,
                          style: AppFonts.mono(
                            theme.textTheme.labelSmall?.copyWith(
                              color: AppColors.faint,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(
                width: 1,
                height: height - 28,
                child: CustomPaint(painter: _VerticalDashPainter()),
              ),
              SizedBox(
                width: _actionWidth - 1,
                child: PressableScale(
                  enabled: !applied,
                  child: Semantics(
                    button: true,
                    label: applied
                        ? 'Cupón ${promotion.code} guardado'
                        : 'Usar cupón ${promotion.code}',
                    excludeSemantics: true,
                    child: InkWell(
                      onTap: applied ? null : () => onUse(promotion),
                      child: AnimatedSwitcher(
                        duration: AppMotion.enter,
                        child: Column(
                          key: ValueKey(applied),
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: applied
                                    ? AppColors.albahaca
                                    : AppColors.mostaza,
                              ),
                              child: Icon(
                                applied ? Icons.check : Icons.add,
                                size: 20,
                                color: applied
                                    ? AppColors.ticket
                                    : AppColors.ink,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              applied ? 'Guardado' : 'Usar cupón',
                              style: theme.textTheme.labelLarge?.copyWith(
                                color: AppColors.ticket,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StubClipper extends CustomClipper<Path> {
  const _StubClipper({required this.actionWidth});

  final double actionWidth;

  @override
  Path getClip(Size size) {
    final body = Path()
      ..addRRect(
        RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(18)),
      );
    final x = size.width - actionWidth;
    final bites = Path()
      ..addOval(Rect.fromCircle(center: Offset(x, 0), radius: 9))
      ..addOval(Rect.fromCircle(center: Offset(x, size.height), radius: 9));
    return Path.combine(PathOperation.difference, body, bites);
  }

  @override
  bool shouldReclip(covariant _StubClipper old) =>
      old.actionWidth != actionWidth;
}

class _VerticalDashPainter extends CustomPainter {
  const _VerticalDashPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.humo
      ..strokeWidth = 1;
    for (double y = 0; y < size.height; y += 7) {
      canvas.drawLine(Offset(0, y), Offset(0, y + 4), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
