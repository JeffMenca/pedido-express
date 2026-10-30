import 'package:material_ui/material_ui.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/quantity_stepper.dart';
import '../application/cart_controller.dart';
import '../domain/cart.dart';
import 'quote_summary.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final quote = ref.watch(quoteProvider);

    if (cart.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Tu carrito')),
        body: EmptyView(
          icon: Icons.shopping_bag_outlined,
          title: 'Tu carrito está vacío',
          message: 'Agrega productos o combos desde el menú.',
          action: OutlinedButton(
            onPressed: () => context.go('/'),
            child: const Text('Ver menú'),
          ),
        ),
      );
    }

    final current = quote.value;
    final ready = !quote.isLoading && !quote.hasError && current != null;
    final error = quote.hasError && !quote.isLoading
        ? ApiException.from(quote.error!)
        : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Tu carrito')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          for (final (i, line) in cart.lines.indexed)
            _maybeAnimate(
              context,
              i,
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _CartLineTile(key: ValueKey(line.id), line: line),
              ),
            ),
          const SizedBox(height: 12),
          Text(
            'TU COMANDA',
            style: Theme.of(context).textTheme.labelLarge
                ?.copyWith(color: AppColors.humo, letterSpacing: 1),
          ),
          const SizedBox(height: 8),
          if (error != null) ...[
            InlineMessage(error.userMessage),
            const SizedBox(height: 12),
          ],
          const SizedBox(height: 8),
          QuoteSummary(quote: current, loading: quote.isLoading),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton(
            onPressed: !ready ? null : () => context.push('/checkout'),
            child: const Text('Continuar'),
          ),
        ),
      ),
    );
  }
}

Widget _maybeAnimate(BuildContext context, int index, Widget child) {
  if (index >= 8) return child;
  if (AppMotion.reduced(context)) {
    return child.animate().fadeIn(duration: AppMotion.enter);
  }
  return child
      .animate(delay: (35 * index).ms)
      .fadeIn(duration: AppMotion.enter)
      .moveY(
        begin: 8,
        end: 0,
        duration: AppMotion.enter,
        curve: AppMotion.curve,
      );
}

class _CartLineTile extends ConsumerWidget {
  const _CartLineTile({super.key, required this.line});

  final CartLine line;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final details = [if (line.upgradeLarge) 'Agrandado', ...line.modifierNames];
    final controller = ref.read(cartProvider.notifier);
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 4, 10),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    line.name,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (details.isNotEmpty)
                    Text(
                      details.join(' · '),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.humo,
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            QuantityStepper(
              value: line.quantity,
              onChanged: (v) => controller.setQuantity(line.id, v),
            ),
            IconButton(
              tooltip: 'Quitar del carrito',
              icon: const Icon(Icons.delete_outline, color: AppColors.humo),
              onPressed: () => controller.remove(line.id),
            ),
          ],
        ),
      ),
    );
  }
}
