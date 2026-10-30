import 'package:app_cliente/features/orders/presentation/card_payment_screen.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

String applyLimit(String input, int max) =>
    LengthLimitingTextInputFormatter(max)
        .formatEditUpdate(TextEditingValue.empty, TextEditingValue(text: input))
        .text;

void main() {
  test('card number and CVV inputs cannot exceed the processor limits', () {
    expect(
      applyLimit('41111111111111112222', cardNumberLength),
      '4111111111111111',
    );
    expect(applyLimit('12345', cvvLength), '123');
  });
}
