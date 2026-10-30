import 'package:app_cliente/features/orders/presentation/card_payment_screen.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('validateCardNumber', () {
    test('accepts exactly 16 digits, with or without spaces', () {
      expect(validateCardNumber('4111111111111111'), isNull);
      expect(validateCardNumber('4111 1111 1111 1111'), isNull);
    });

    test('rejects shorter or longer numbers', () {
      expect(validateCardNumber('411111111111111'), isNotNull);
      expect(validateCardNumber('41111111111111112'), isNotNull);
    });
  });

  test('validateCvv requires exactly 3 digits', () {
    expect(validateCvv('123'), isNull);
    expect(validateCvv('12'), isNotNull);
    expect(validateCvv('1234'), isNotNull);
  });
}
