import 'package:app_cliente/features/menu/domain/menu.dart';
import 'package:app_cliente/features/menu/presentation/promo_banner.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('describes promotions in plain language', () {
    expect(
      promotionSummary(
        Promotion.fromJson({
          'code': 'COMBO15',
          'type': 'PORCENTAJE',
          'value': 1500,
          'minimumCents': 10000,
        }),
      ),
      '15 % en pedidos desde Q100',
    );
    expect(
      promotionSummary(
        Promotion.fromJson({
          'code': 'FIJO20',
          'type': 'MONTO',
          'value': 2000,
          'minimumCents': 8000,
        }),
      ),
      'Q20 de descuento en pedidos desde Q80',
    );
  });
}
