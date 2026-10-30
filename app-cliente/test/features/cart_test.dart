import 'package:app_cliente/features/cart/application/cart_controller.dart';
import 'package:app_cliente/features/cart/domain/cart.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('cart builds the quote body expected by the API', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final cart = container.read(cartProvider.notifier);

    cart.add(
      type: ItemType.combo,
      sku: 'C-001',
      name: 'Combo Clásico',
      quantity: 2,
      upgradeLarge: true,
      modifierCodes: ['M-01'],
      modifierNames: ['Queso extra'],
    );
    cart.add(
      type: ItemType.product,
      sku: 'P-007',
      name: 'Gaseosa',
      quantity: 1,
    );
    cart.setChannel(Channel.domicilio);
    cart.setCoupon(' combo15 ');

    expect(container.read(cartProvider).toQuoteJson(), {
      'channel': 'DOMICILIO',
      'items': [
        {
          'type': 'COMBO',
          'sku': 'C-001',
          'quantity': 2,
          'upgradeLarge': true,
          'modifiers': ['M-01'],
        },
        {'type': 'PRODUCT', 'sku': 'P-007', 'quantity': 1},
      ],
      'couponCode': 'COMBO15',
    });
    expect(container.read(cartProvider).itemCount, 3);
  });
}
