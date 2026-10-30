import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/errors/error_messages.dart';
import '../../../core/format/money.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/feedback.dart';
import '../application/order_controllers.dart';
import '../data/orders_repository.dart';
import '../domain/order.dart';

final _orderProvider = FutureProvider.autoDispose.family<Order, String>(
  (ref, id) => ref.read(ordersRepositoryProvider).getOrder(id),
);

class CardPaymentScreen extends ConsumerStatefulWidget {
  const CardPaymentScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<CardPaymentScreen> createState() => _CardPaymentScreenState();
}

class _CardPaymentScreenState extends ConsumerState<CardPaymentScreen> {
  final _formKey = GlobalKey<FormState>();
  // Card data lives only in these controllers; never logged nor persisted.
  final _number = TextEditingController();
  final _exp = TextEditingController();
  final _cvv = TextEditingController();

  @override
  void dispose() {
    _number.dispose();
    _exp.dispose();
    _cvv.dispose();
    super.dispose();
  }

  void _onCardChanged(String _) =>
      ref.read(paymentControllerProvider.notifier).cardChanged();

  Future<void> _pay() async {
    FocusScope.of(context).unfocus();
    if (!_formKey.currentState!.validate()) return;
    final outcome = await ref
        .read(paymentControllerProvider.notifier)
        .pay(
          widget.orderId,
          CardInput(
            number: _number.text.replaceAll(' ', ''),
            exp: _exp.text,
            cvv: _cvv.text,
          ),
        );
    if (!mounted) return;
    if (outcome is PaymentTrack) {
      context.go('/orders/${widget.orderId}');
    } else if (outcome is PaymentDeclined) {
      _number.clear();
      _exp.clear();
      _cvv.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = ref.watch(_orderProvider(widget.orderId));
    final payment = ref.watch(paymentControllerProvider);
    final theme = Theme.of(context);

    final outcome = payment.outcome;
    final message = switch (outcome) {
      PaymentDeclined(:final declineCode) => declineMessage(declineCode),
      PaymentFailed(:final error) =>
        error.isUncertain
            ? '${error.userMessage} Si reintentas con la misma tarjeta no se cobrará dos veces.'
            : error.userMessage,
      _ => null,
    };

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pago con tarjeta'),
        actions: [
          TextButton(
            onPressed: () => context.go('/orders/${widget.orderId}'),
            child: const Text('Ver pedido'),
          ),
        ],
      ),
      body: order.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(_orderProvider(widget.orderId)),
        ),
        data: (order) => Form(
          key: _formKey,
          child: AbsorbPointer(
            absorbing: payment.submitting,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Pedido ${order.code}',
                                style: AppFonts.mono(
                                  theme.textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              Text(
                                'Total a pagar',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: AppColors.humo,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          formatCents(order.quote.totalCents),
                          style: AppFonts.mono(
                            theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _number,
                  decoration: const InputDecoration(
                    labelText: 'Número de tarjeta',
                  ),
                  keyboardType: TextInputType.number,
                  autofillHints: const [AutofillHints.creditCardNumber],
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(19),
                    _CardNumberFormatter(),
                  ],
                  onChanged: _onCardChanged,
                  validator: validateCardNumber,
                ),
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _exp,
                        decoration: const InputDecoration(
                          labelText: 'Vence (MM/AA)',
                        ),
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(4),
                          _ExpiryFormatter(),
                        ],
                        onChanged: _onCardChanged,
                        validator: (v) => validateExpiry(v, DateTime.now()),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _cvv,
                        decoration: const InputDecoration(labelText: 'CVV'),
                        keyboardType: TextInputType.number,
                        obscureText: true,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(4),
                        ],
                        onChanged: _onCardChanged,
                        validator: (v) => RegExp(r'^\d{3,4}$').hasMatch(v ?? '')
                            ? null
                            : 'CVV de 3 o 4 dígitos.',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Prueba: 4111 1111 1111 1111 (aprobada) · 4000 0000 0000 0002 (rechazada)',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.humo,
                  ),
                ),
                AnimatedSwitcher(
                  duration: AppMotion.enter,
                  child: message == null
                      ? const SizedBox.shrink()
                      : Padding(
                          key: ValueKey(message),
                          padding: const EdgeInsets.only(top: 16),
                          child: InlineMessage(message),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton(
            onPressed: order.hasValue && !payment.submitting ? _pay : null,
            child: AnimatedSwitcher(
              duration: AppMotion.enter,
              child: payment.submitting
                  ? const Text('Procesando pago…', key: ValueKey('busy'))
                  : Text(
                      outcome is PaymentDeclined
                          ? 'Pagar con otra tarjeta'
                          : 'Pagar',
                      key: ValueKey(outcome.runtimeType),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

String? validateCardNumber(String? value) {
  final digits = (value ?? '').replaceAll(' ', '');
  if (digits.length < 13 || digits.length > 19) {
    return 'Ingresa un número de tarjeta válido.';
  }
  return null;
}

String? validateExpiry(String? value, DateTime now) {
  final match = RegExp(r'^(\d{2})/(\d{2})$').firstMatch(value ?? '');
  if (match == null) return 'Usa el formato MM/AA.';
  final month = int.parse(match.group(1)!);
  final year = 2000 + int.parse(match.group(2)!);
  if (month < 1 || month > 12) return 'Mes inválido.';
  if (year < now.year || (year == now.year && month < now.month)) {
    return 'La tarjeta está vencida.';
  }
  return null;
}

class _CardNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text;
    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && i % 4 == 0) buffer.write(' ');
      buffer.write(digits[i]);
    }
    final text = buffer.toString();
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

class _ExpiryFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text;
    final text = digits.length > 2
        ? '${digits.substring(0, 2)}/${digits.substring(2)}'
        : digits;
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}
