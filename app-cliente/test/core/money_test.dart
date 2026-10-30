import 'package:app_cliente/core/format/money.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('formats integer cents without float math', () {
    expect(formatCents(0), 'Q0.00');
    expect(formatCents(5), 'Q0.05');
    expect(formatCents(14500), 'Q145.00');
    expect(formatCents(123456789), 'Q1,234,567.89');
    expect(formatCents(-1550), '-Q15.50');
  });
}
