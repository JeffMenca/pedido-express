import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/format/money.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/pressable_scale.dart';
import '../../../core/widgets/product_art.dart';
import '../../../core/widgets/quantity_stepper.dart';
import '../../../core/widgets/shimmer.dart';
import '../../orders/domain/order.dart';
import '../application/cart_controller.dart';
import '../domain/cart.dart';
import 'coupon_notice_card.dart';
import 'quote_summary.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final quote = ref.watch(quoteProvider);
    final theme = Theme.of(context);

    if (cart.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Tu carrito')),
        body: EmptyView(
          icon: Icons.shopping_bag_outlined,
          art: const SvgArt(Illustrations.fallback, size: 150),
          title: 'Tu carrito está vacío',
          message: 'Agrega productos o combos desde el menú.',
          action: OutlinedButton(
            onPressed: () => context.go('/'),
            child: const Text('Ver menú'),
          ),
        ),
      );
    }

    final current = quote.value?.quote;
    final couponNotice = quote.value?.couponNotice;
    final ready = !quote.isLoading && !quote.hasError && current != null;
    final error = quote.hasError && !quote.isLoading
        ? ApiException.from(quote.error!)
        : null;
    // Quote lines come back in cart order, so they can be matched by index.
    final lines = current != null && current.lines.length == cart.lines.length
        ? current.lines
        : null;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            const Text('Tu carrito'),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                cart.itemCount == 1
                    ? '1 artículo'
                    : '${cart.itemCount} artículos',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppFonts.mono(
                  theme.textTheme.bodySmall?.copyWith(color: AppColors.humo),
                ),
              ),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          for (final (i, line) in cart.lines.indexed)
            _maybeAnimate(
              context,
              i,
              Padding(
                key: ValueKey(line.id),
                padding: const EdgeInsets.only(bottom: 10),
                child: _CartLineTile(
                  line: line,
                  quoteLine: lines?[i],
                  updating: quote.isLoading,
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.only(top: 2, bottom: 16),
            child: Text(
              'Desliza a la izquierda para quitar un producto.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.faint,
              ),
            ),
          ),
          Text(
            'Tu comanda',
            style: AppFonts.display(
              theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 10),
          if (error != null) ...[
            InlineMessage(error.userMessage),
            const SizedBox(height: 12),
          ],
          AnimatedSize(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            child: couponNotice == null
                ? const SizedBox(width: double.infinity)
                : Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: CouponNoticeCard(
                      notice: couponNotice,
                      onRemove: () =>
                          ref.read(cartProvider.notifier).setCoupon(null),
                    ),
                  ),
          ),
          QuoteSummary(quote: current, loading: quote.isLoading),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: PressableScale(
            enabled: ready,
            child: FilledButton(
              onPressed: !ready ? null : () => context.push('/checkout'),
              child: const Text('Continuar'),
            ),
          ),
        ),
      ),
    );
  }
}

Widget _maybeAnimate(BuildContext context, int index, Widget child) {
  if (index >= 8 || AppMotion.reduced(context)) return child;
  return child
      .animate(delay: (40 * index).ms)
      .fadeIn(duration: AppMotion.enter)
      .moveY(
        begin: 12,
        end: 0,
        duration: AppMotion.enter,
        curve: AppMotion.curve,
      );
}

class _CartLineTile extends ConsumerWidget {
  const _CartLineTile({
    required this.line,
    required this.quoteLine,
    required this.updating,
  });

  final CartLine line;
  final QuoteLine? quoteLine;
  final bool updating;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final details = [if (line.upgradeLarge) 'Agrandado', ...line.modifierNames];
    final controller = ref.read(cartProvider.notifier);
    return Dismissible(
      key: ValueKey('dismiss-${line.id}'),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => controller.remove(line.id),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        decoration: BoxDecoration(
          color: AppColors.salsa,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Quitar',
              style: theme.textTheme.titleSmall?.copyWith(
                color: AppColors.ticket,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.delete_outline, color: AppColors.ticket),
          ],
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.ticket,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          children: [
            ArtTile(
              sku: line.sku,
              tint: CategoryTints.of(line.categoryCode),
              size: 72,
              radius: 14,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    line.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (details.isNotEmpty)
                    Text(
                      details.join(' · '),
                      maxLines: 2,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.humo,
                      ),
                    ),
                  const SizedBox(height: 6),
                  SizedBox(
                    height: 20,
                    child: quoteLine == null
                        ? const Align(
                            alignment: Alignment.centerLeft,
                            child: Shimmer(
                              child: SkeletonBox(width: 64, height: 14),
                            ),
                          )
                        : AnimatedOpacity(
                            opacity: updating ? 0.45 : 1,
                            duration: AppMotion.enter,
                            child: Text(
                              formatCents(quoteLine!.lineTotalCents),
                              style: AppFonts.mono(
                                theme.textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            QuantityStepper(
              value: line.quantity,
              compact: true,
              onChanged: (v) => controller.setQuantity(line.id, v),
              onRemove: () => controller.remove(line.id),
            ),
          ],
        ),
      ),
    );
  }
}
