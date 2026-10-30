import 'package:material_ui/material_ui.dart';

import '../../../core/format/money.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/odometer.dart';
import '../../../core/widgets/shimmer.dart';
import '../../../core/widgets/ticket_card.dart';
import '../../orders/domain/order.dart';

/// The quote rendered as a kitchen ticket, with amounts exactly as returned by
/// the API. Skeletons until the first quote; recalculations dim the previous
/// figures until the new ones roll in.
class QuoteSummary extends StatelessWidget {
  const QuoteSummary({
    super.key,
    required this.quote,
    this.loading = false,
    this.header,
    this.statusColor,
  });

  final Quote? quote;
  final bool loading;
  final Widget? header;
  final Color? statusColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final q = quote;
    final body = theme.textTheme.bodyMedium;
    final muted = body?.copyWith(color: AppColors.humo);

    Widget amount(int cents, {TextStyle? style}) =>
        Odometer(cents, style: style ?? body);

    Widget row(String label, Widget value, {TextStyle? style}) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(label, style: style ?? body)),
          const SizedBox(width: 12),
          value,
        ],
      ),
    );

    final List<Widget> content;
    if (q == null) {
      content = [
        Shimmer(
          child: Column(
            children: [
              for (final w in const [150.0, 120.0, 170.0])
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
                      const SkeletonBox(width: 22),
                      const SizedBox(width: 12),
                      SkeletonBox(width: w),
                      const Spacer(),
                      const SkeletonBox(width: 64),
                    ],
                  ),
                ),
              const TicketRule(),
              for (final w in const [80.0, 60.0])
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 5),
                  child: Row(
                    children: [
                      SkeletonBox(width: w),
                      const Spacer(),
                      const SkeletonBox(width: 56),
                    ],
                  ),
                ),
              const SizedBox(height: 6),
              const Row(
                children: [
                  SkeletonBox(width: 70, height: 22),
                  Spacer(),
                  SkeletonBox(width: 96, height: 22),
                ],
              ),
            ],
          ),
        ),
      ];
    } else {
      final totalStyle = AppFonts.mono(
        theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
      );
      content = [
        for (final line in q.lines)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 34,
                  child: Text('${line.quantity}×', style: AppFonts.mono(body)),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(line.name, style: body),
                      if (line.upgradeLarge || line.modifiers.isNotEmpty)
                        Text(
                          [
                            if (line.upgradeLarge) 'Agrandado',
                            ...line.modifiers.map((m) => m.name),
                          ].join(' · '),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.humo,
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  formatCents(line.lineTotalCents),
                  style: AppFonts.mono(body),
                ),
              ],
            ),
          ),
        const TicketRule(),
        row('Subtotal', amount(q.subtotalCents)),
        if (q.discountCents > 0)
          row(
            q.couponCode == null ? 'Descuento' : 'Descuento (${q.couponCode})',
            amount(
              -q.discountCents,
              style: body?.copyWith(color: AppColors.albahaca),
            ),
          ),
        if (q.deliveryFeeCents > 0)
          row('Envío a domicilio', amount(q.deliveryFeeCents)),
        const SizedBox(height: 6),
        row(
          'TOTAL',
          amount(q.totalCents, style: totalStyle),
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 1,
          ),
        ),
        row(
          'Base imponible',
          amount(q.taxBaseCents, style: muted),
          style: muted,
        ),
        row(
          'IVA incluido (12%)',
          amount(q.taxCents, style: muted),
          style: muted,
        ),
      ];
    }

    return TicketCard(
      statusColor: statusColor,
      child: AnimatedOpacity(
        duration: AppMotion.enter,
        opacity: loading ? 0.45 : 1,
        child: AnimatedSize(
          duration: AppMotion.enter,
          curve: AppMotion.curve,
          alignment: Alignment.topCenter,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ?header,
              if (header != null) const TicketRule(),
              ...content,
            ],
          ),
        ),
      ),
    );
  }
}
