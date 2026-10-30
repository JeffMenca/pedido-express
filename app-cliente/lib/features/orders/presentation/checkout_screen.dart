import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/feedback.dart';
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
    final body = {
      ...cart.toQuoteJson(),
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
    final couponError =
        quoteError != null && quoteError.code.startsWith('COUPON_')
        ? quoteError.userMessage
        : null;
    final submitError = submission.hasError
        ? ApiException.from(submission.error!).userMessage
        : null;
    final isDelivery = cart.channel == Channel.domicilio;
    if (isDelivery && _method == PaymentMethod.efectivo) {
      _method = PaymentMethod.tarjeta;
    }
    final ready = !quote.isLoading && !quote.hasError && quote.value != null;
    final sectionStyle = theme.textTheme.labelLarge?.copyWith(
      color: AppColors.humo,
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
              Text('CÓMO RECIBES TU PEDIDO', style: sectionStyle),
              RadioGroup<Channel>(
                groupValue: cart.channel,
                onChanged: (c) {
                  if (c != null) controller.setChannel(c);
                },
                child: Column(
                  children: [
                    for (final c in Channel.values)
                      RadioListTile<Channel>(
                        contentPadding: EdgeInsets.zero,
                        value: c,
                        title: Text(c.label),
                      ),
                  ],
                ),
              ),
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
              Text('CUPÓN', style: sectionStyle),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _coupon,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'Código de cupón',
                        errorText: couponError,
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
              Text('MÉTODO DE PAGO', style: sectionStyle),
              RadioGroup<PaymentMethod>(
                groupValue: _method,
                onChanged: (m) {
                  if (m != null) setState(() => _method = m);
                },
                child: Column(
                  children: [
                    for (final m in PaymentMethod.values)
                      RadioListTile<PaymentMethod>(
                        contentPadding: EdgeInsets.zero,
                        value: m,
                        enabled: !(isDelivery && m == PaymentMethod.efectivo),
                        title: Text(m.label),
                        subtitle: isDelivery && m == PaymentMethod.efectivo
                            ? const Text(
                                'No disponible para entrega a domicilio',
                              )
                            : null,
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              if (quoteError != null && couponError == null) ...[
                InlineMessage(quoteError.userMessage),
                const SizedBox(height: 12),
              ],
              QuoteSummary(quote: quote.value, loading: quote.isLoading),
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
    );
  }
}
