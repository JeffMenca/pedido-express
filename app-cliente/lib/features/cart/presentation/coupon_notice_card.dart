import 'package:material_ui/material_ui.dart';

import '../../../core/errors/error_messages.dart';
import '../../../core/format/money.dart';
import '../../../core/theme/app_theme.dart';
import '../application/cart_controller.dart';

/// Explains why the selected coupon is not applied yet, without blocking the cart.
class CouponNoticeCard extends StatelessWidget {
  const CouponNoticeCard({
    super.key,
    required this.notice,
    required this.onRemove,
  });

  final CouponNotice notice;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final missing = notice.missingCents;
    final pending =
        notice.errorCode == 'COUPON_MINIMUM_NOT_MET' &&
        missing != null &&
        missing > 0;
    final progress = pending
        ? (notice.subtotalCents! / notice.minimumCents!).clamp(0.0, 1.0)
        : 0.0;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 8, 12),
      decoration: BoxDecoration(
        color: AppColors.ticket,
        borderRadius: BorderRadius.circular(14),
        border: Border(
          left: BorderSide(
            color: pending ? AppColors.mostaza : AppColors.salsa,
            width: 4,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                pending ? Icons.local_offer_outlined : Icons.error_outline,
                size: 20,
                color: pending ? AppColors.warningText : AppColors.salsa,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: notice.code,
                        style: AppFonts.mono(
                          const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      TextSpan(
                        text: pending ? ' aún no aplica' : ' no se puede usar',
                      ),
                    ],
                  ),
                  style: theme.textTheme.titleSmall,
                ),
              ),
              TextButton(onPressed: onRemove, child: const Text('Quitar')),
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(left: 28, right: 8),
            child: Text(
              pending
                  ? 'Agrega ${formatCents(missing)} más y el descuento se aplica solo.'
                  : messageForCode(notice.errorCode),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.humo,
              ),
            ),
          ),
          if (pending) ...[
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.only(left: 28, right: 8),
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: progress),
                duration: const Duration(milliseconds: 500),
                curve: Curves.easeOutCubic,
                builder: (_, value, _) => ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: value,
                    minHeight: 6,
                    backgroundColor: AppColors.skeleton,
                    color: AppColors.mostaza,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.only(left: 28, right: 8),
              child: Text(
                '${formatCents(notice.subtotalCents!)} de ${formatCents(notice.minimumCents!)}',
                style: AppFonts.mono(
                  theme.textTheme.bodySmall?.copyWith(color: AppColors.humo),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
