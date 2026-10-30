import 'package:app_cliente/core/errors/api_exception.dart';
import 'package:app_cliente/features/cart/application/cart_controller.dart';
import 'package:app_cliente/features/cart/domain/cart.dart';
import 'package:app_cliente/features/orders/data/orders_repository.dart';
import 'package:app_cliente/features/orders/domain/order.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _MinimumNotMetOrders implements OrdersRepository {
  final bodies = <Map<String, dynamic>>[];

  @override
  Future<Quote> quote(
    Map<String, dynamic> body, {
    CancelToken? cancelToken,
  }) async {
    bodies.add(body);
    if (body.containsKey('couponCode')) {
      throw const ApiException(
        code: 'COUPON_MINIMUM_NOT_MET',
        statusCode: 422,
        details: {
          'code': 'COMBO15',
          'minimumCents': 10000,
          'subtotalCents': 6500,
        },
      );
    }
    return Quote.fromJson({
      'lines': [],
      'subtotalCents': 6500,
      'discountCents': 0,
      'coupon': null,
      'deliveryFeeCents': 0,
      'totalCents': 6500,
      'taxBaseCents': 5804,
      'taxCents': 696,
    });
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError();
}

void main() {
  test('an unmet coupon minimum prices the cart without it and reports what is missing', () async {
    final orders = _MinimumNotMetOrders();
    final container = ProviderContainer(
      overrides: [ordersRepositoryProvider.overrideWithValue(orders)],
    );
    addTearDown(container.dispose);

    container.read(cartProvider.notifier)
      ..add(
        type: ItemType.combo,
        sku: 'C-001',
        name: 'Combo Clásico',
        quantity: 1,
      )
      ..setCoupon('combo15');

    final subscription = container.listen(quoteProvider, (_, _) {});
    addTearDown(subscription.close);
    final result = await container.read(quoteProvider.future);

    expect(result!.quote.totalCents, 6500);
    expect(result.couponApplied, isFalse);
    expect(result.couponNotice!.code, 'COMBO15');
    expect(result.couponNotice!.missingCents, 3500);
    expect(orders.bodies.last.containsKey('couponCode'), isFalse);
  });
}
