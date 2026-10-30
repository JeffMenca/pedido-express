import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/errors/error_messages.dart';
import '../../../core/format/money.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/pressable_scale.dart';
import '../../cart/application/cart_controller.dart';
import '../../cart/domain/cart.dart';
import '../../cart/presentation/quote_summary.dart';
import '../application/order_controllers.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _address = TextEditingController();
  final _phone = TextEditingController();
  late final TextEditingController _coupon;
  PaymentMethod _method = PaymentMethod.tarjeta;

  @override
  void initState() {
    super.initState();
    _coupon = TextEditingController(text: ref.read(cartProvider).couponCode);
  }

  @override
  void dispose() {
    _address.dispose();
    _phone.dispose();
    _coupon.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final cart = ref.read(cartProvider);
    // A coupon that does not apply yet is left out so the order matches the quote shown.
    final couponApplies = ref.read(quoteProvider).value?.couponNotice == null;
    final body = {
      ...cart.toQuoteJson(includeCoupon: couponApplies),
      'paymentMethod': _method.api,
      if (cart.channel == Channel.domicilio)
        'delivery': {
          'address': _address.text.trim(),
          'phone': _phone.text.trim(),
        },
    };
    final order = await ref
        .read(checkoutControllerProvider.notifier)
        .submit(body);
    if (order == null || !mounted) return;
    ref.read(cartProvider.notifier).clear();
    ref.read(checkoutControllerProvider.notifier).reset();
    context.go(
      order.paymentMethod == PaymentMethod.tarjeta
          ? '/orders/${order.id}/pay'
          : '/orders/${order.id}',
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cart = ref.watch(cartProvider);
    final quote = ref.watch(quoteProvider);
    final submission = ref.watch(checkoutControllerProvider);
    final submitting = submission.isLoading;
    final controller = ref.read(cartProvider.notifier);

    if (cart.isEmpty && !submitting) {
      return Scaffold(
        appBar: AppBar(title: const Text('Confirmar pedido')),
        body: EmptyView(
          icon: Icons.shopping_bag_outlined,
          title: 'Tu carrito está vacío',
          action: OutlinedButton(
            onPressed: () => context.go('/'),
            child: const Text('Ver menú'),
          ),
        ),
      );
    }

    final quoteError = quote.hasError && !quote.isLoading
        ? ApiException.from(quote.error!)
        : null;
    final couponNotice = quote.value?.couponNotice;
    final couponError = couponNotice == null
        ? null
        : couponNotice.missingCents != null && couponNotice.missingCents! > 0
        ? 'Aún no aplica: agrega ${formatCents(couponNotice.missingCents!)} más. Tu pedido se cobrará sin descuento.'
        : '${messageForCode(couponNotice.errorCode)} Tu pedido se cobrará sin descuento.';
    final submitError = submission.hasError
        ? ApiException.from(submission.error!).userMessage
        : null;
    final isDelivery = cart.channel == Channel.domicilio;
    if (isDelivery && _method == PaymentMethod.efectivo) {
      _method = PaymentMethod.tarjeta;
    }
    final ready = !quote.isLoading && !quote.hasError && quote.value != null;
    final sectionStyle = AppFonts.display(
      theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Confirmar pedido')),
      body: Form(
        key: _formKey,
        child: AbsorbPointer(
          absorbing: submitting,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              Text('Cómo recibes tu pedido', style: sectionStyle),
              const SizedBox(height: 10),
              _OptionGrid(
                children: [
                  for (final c in Channel.values)
                    OptionCard(
                      icon: _channelIcon(c),
                      title: c.label,
                      subtitle: _channelHint(c),
                      selected: cart.channel == c,
                      onTap: () => controller.setChannel(c),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              AnimatedSize(
                duration: AppMotion.enter,
                curve: AppMotion.curve,
                alignment: Alignment.topCenter,
                child: isDelivery
                    ? Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Column(
                          children: [
                            TextFormField(
                              controller: _address,
                              decoration: const InputDecoration(
                                labelText: 'Dirección de entrega',
                              ),
                              textInputAction: TextInputAction.next,
                              validator: (v) =>
                                  (v == null || v.trim().length < 5)
                                  ? 'Ingresa una dirección completa.'
                                  : null,
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _phone,
                              decoration: const InputDecoration(
                                labelText: 'Teléfono',
                              ),
                              keyboardType: TextInputType.phone,
                              inputFormatters: [
                                FilteringTextInputFormatter.allow(
                                  RegExp(r'[0-9+ -]'),
                                ),
                              ],
                              validator: (v) {
                                final digits = (v ?? '').replaceAll(
                                  RegExp(r'\D'),
                                  '',
                                );
                                return digits.length < 8
                                    ? 'Ingresa un teléfono de al menos 8 dígitos.'
                                    : null;
                              },
                            ),
                          ],
                        ),
                      )
                    : const SizedBox(width: double.infinity),
              ),
              const SizedBox(height: 12),
              Text('Cupón', style: sectionStyle),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _coupon,
                      textCapitalization: TextCapitalization.characters,
                      style: AppFonts.mono(theme.textTheme.bodyLarge),
                      decoration: InputDecoration(
                        hintText: 'Código de cupón',
                        errorText: couponError,
                        helperText:
                            cart.couponCode != null &&
                                (quote.value?.quote.discountCents ?? 0) > 0
                            ? 'Cupón aplicado a tu comanda'
                            : null,
                        helperStyle: const TextStyle(color: AppColors.albahaca),
                        errorMaxLines: 2,
                      ),
                      onSubmitted: controller.setCoupon,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    height: 56,
                    child: cart.couponCode == null
                        ? OutlinedButton(
                            onPressed: () => controller.setCoupon(_coupon.text),
                            child: const Text('Aplicar'),
                          )
                        : OutlinedButton(
                            onPressed: () {
                              _coupon.clear();
                              controller.setCoupon(null);
                            },
                            child: const Text('Quitar'),
                          ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text('Método de pago', style: sectionStyle),
              const SizedBox(height: 10),
              _OptionGrid(
                children: [
                  for (final m in PaymentMethod.values)
                    OptionCard(
                      icon: m == PaymentMethod.tarjeta
                          ? Icons.credit_card
                          : Icons.payments_outlined,
                      title: m.label,
                      subtitle: isDelivery && m == PaymentMethod.efectivo
                          ? 'No disponible para entrega a domicilio'
                          : m == PaymentMethod.tarjeta
                          ? 'Paga ahora en la app'
                          : 'Paga al recoger tu pedido',
                      selected: _method == m,
                      enabled: !(isDelivery && m == PaymentMethod.efectivo),
                      onTap: () => setState(() => _method = m),
                    ),
                ],
              ),
              const SizedBox(height: 20),
              Text('Tu comanda', style: sectionStyle),
              const SizedBox(height: 10),
              const SizedBox(height: 8),
              if (quoteError != null && couponError == null) ...[
                InlineMessage(quoteError.userMessage),
                const SizedBox(height: 12),
              ],
              QuoteSummary(quote: quote.value?.quote, loading: quote.isLoading),
              if (submitError != null) ...[
                const SizedBox(height: 12),
                InlineMessage(submitError),
              ],
            ],
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: PressableScale(
            enabled: ready && !submitting,
            child: FilledButton(
              onPressed: ready && !submitting ? _submit : null,
              child: AnimatedSwitcher(
                duration: AppMotion.enter,
                child: submitting
                    ? const SizedBox(
                        key: ValueKey('busy'),
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(
                        _method == PaymentMethod.tarjeta
                            ? 'Confirmar y pagar con tarjeta'
                            : 'Confirmar pedido',
                        key: ValueKey(_method),
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

IconData _channelIcon(Channel c) => switch (c) {
  Channel.mostrador => Icons.storefront_outlined,
  Channel.kiosko => Icons.touch_app_outlined,
  Channel.autoservicio => Icons.directions_car_outlined,
  Channel.domicilio => Icons.delivery_dining_outlined,
};

String _channelHint(Channel c) => switch (c) {
  Channel.mostrador => 'Recoge en caja',
  Channel.kiosko => 'Pide desde el kiosko',
  Channel.autoservicio => 'Recoge desde tu auto',
  Channel.domicilio => 'Te lo llevamos',
};

class _OptionGrid extends StatelessWidget {
  const _OptionGrid({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const gap = 10.0;
        final width = (constraints.maxWidth - gap) / 2;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [
            for (final c in children) SizedBox(width: width, child: c),
          ],
        );
      },
    );
  }
}

/// Selectable card: the chosen option turns ink with a mustard icon.
class OptionCard extends StatelessWidget {
  const OptionCard({
    super.key,
    required this.icon,
    required this.title,
    required this.selected,
    required this.onTap,
    this.subtitle,
    this.enabled = true,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fg = selected ? AppColors.ticket : AppColors.ink;
    return Semantics(
      selected: selected,
      enabled: enabled,
      button: true,
      child: AnimatedOpacity(
        duration: AppMotion.enter,
        opacity: enabled ? 1 : 0.5,
        child: PressableScale(
          enabled: enabled,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: enabled ? onTap : null,
            child: AnimatedContainer(
              duration: AppMotion.enter,
              curve: AppMotion.curve,
              constraints: const BoxConstraints(minHeight: 112),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: selected ? AppColors.ink : AppColors.ticket,
                borderRadius: BorderRadius.circular(AppRadii.card),
                border: Border.all(
                  color: selected ? AppColors.ink : AppColors.ticket,
                  width: 1.5,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      AnimatedContainer(
                        duration: AppMotion.enter,
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: selected ? AppColors.inkSoft : AppColors.steel,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          icon,
                          size: 22,
                          color: selected ? AppColors.mostaza : AppColors.ink,
                        ),
                      ),
                      const Spacer(),
                      AnimatedScale(
                        scale: selected ? 1 : 0,
                        duration: AppMotion.enter,
                        curve: Curves.easeOutBack,
                        child: const Icon(
                          Icons.check_circle,
                          size: 20,
                          color: AppColors.mostaza,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  AnimatedDefaultTextStyle(
                    duration: AppMotion.enter,
                    style: theme.textTheme.titleSmall!.copyWith(
                      color: fg,
                      fontWeight: FontWeight.w700,
                    ),
                    child: Text(title),
                  ),
                  if (subtitle != null)
                    AnimatedDefaultTextStyle(
                      duration: AppMotion.enter,
                      style: theme.textTheme.bodySmall!.copyWith(
                        color: selected ? AppColors.faint : AppColors.humo,
                      ),
                      child: Text(subtitle!),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
