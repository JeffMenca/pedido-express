import 'package:app_cliente/core/router/app_router.dart';
import 'package:app_cliente/features/cart/domain/cart.dart';
import 'package:app_cliente/features/menu/data/menu_repository.dart';
import 'package:app_cliente/features/menu/domain/menu.dart';
import 'package:app_cliente/features/orders/data/orders_repository.dart';
import 'package:app_cliente/features/orders/domain/order.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

class _FakeMenu implements MenuRepository {
  @override
  Future<Menu> fetchMenu() async => Menu.fromJson({
    'categories': [
      {
        'code': 'BEBIDAS',
        'name': 'Bebidas',
        'products': [
          {'sku': 'P-007', 'name': 'Gaseosa mediana', 'priceCents': 1200},
        ],
      },
    ],
    'combos': [
      {
        'sku': 'C-001',
        'name': 'Combo Clásico',
        'priceCents': 5200,
        'mainSku': 'P-001',
        'mainCategory': 'HAMBURGUESAS',
        'includes': ['Hamburguesa Clásica'],
        'upgrade': {
          'priceCents': 800,
          'includes': ['Papas grandes'],
        },
      },
    ],
    'modifiers': [
      {
        'code': 'M-02',
        'name': 'Tocino',
        'priceCents': 750,
        'appliesTo': ['HAMBURGUESAS'],
      },
    ],
  });
}

class _FakeOrders implements OrdersRepository {
  _FakeOrders({this.status = OrderStatus.enPreparacion});

  final OrderStatus status;
  Map<String, dynamic>? lastQuoteBody;

  @override
  Future<Quote> quote(
    Map<String, dynamic> body, {
    CancelToken? cancelToken,
  }) async {
    lastQuoteBody = body;
    return Quote.fromJson({
      'lines': [
        {
          'type': 'COMBO',
          'sku': 'C-001',
          'name': 'Combo Clásico',
          'quantity': 2,
          'unitPriceCents': 6000,
          'upgradeLarge': true,
          'modifiers': [
            {'code': 'M-02', 'name': 'Tocino', 'priceCents': 750},
          ],
          'lineTotalCents': 13500,
        },
      ],
      'subtotalCents': 13500,
      'discountCents': 0,
      'coupon': null,
      'deliveryFeeCents': 0,
      'totalCents': 13500,
      'taxBaseCents': 12054,
      'taxCents': 1446,
    });
  }

  @override
  Future<Order> createOrder(Map<String, dynamic> body, String key) =>
      throw UnimplementedError();

  @override
  Future<Order> getOrder(String id) async {
    final quote = await this.quote(const {});
    return Order(
      id: id,
      code: 'PE-0042',
      channel: 'DOMICILIO',
      paymentMethod: PaymentMethod.tarjeta,
      status: status,
      quote: quote,
      payment: const PaymentInfo(status: 'SUCCEEDED', last4: '1111'),
    );
  }

  @override
  Future<CardPaymentResult> payWithCard(
    String id,
    CardInput card,
    String key,
  ) => throw UnimplementedError();
}

void main() {
  testWidgets('builds a combo line and shows the API quote in the cart', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1200, 2400);
    addTearDown(tester.view.reset);
    final orders = _FakeOrders();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          menuRepositoryProvider.overrideWithValue(_FakeMenu()),
          ordersRepositoryProvider.overrideWithValue(orders),
        ],
        child: MaterialApp.router(routerConfig: buildRouter()),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Combo Clásico'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Agrandar combo'));
    await tester.tap(find.text('Tocino'));
    await tester.tap(find.widgetWithIcon(IconButton, Icons.add));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Agregar al carrito'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Ver carrito · 2 artículos'));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pumpAndSettle();

    expect(orders.lastQuoteBody?['items'], [
      {
        'type': 'COMBO',
        'sku': 'C-001',
        'quantity': 2,
        'upgradeLarge': true,
        'modifiers': ['M-02'],
      },
    ]);
    expect(find.text('Agrandado · Tocino'), findsNWidgets(2));
    expect(find.text('2×'), findsOneWidget);
    expect(find.text('Q135.00'), findsOneWidget);
    expect(find.text('TOTAL'), findsOneWidget);

    await tester.tap(find.text('Continuar'));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pumpAndSettle();
    expect(find.text('MÉTODO DE PAGO'), findsOneWidget);
    await tester.tap(find.text('A domicilio'));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pumpAndSettle();
    expect(find.text('Dirección de entrega'), findsOneWidget);
    expect(find.text('No disponible para entrega a domicilio'), findsOneWidget);
    expect(orders.lastQuoteBody?['channel'], 'DOMICILIO');
    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(seconds: 1));
  });

  testWidgets('tracking shows the order as a ticket with the timeline', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1200, 2600);
    addTearDown(tester.view.reset);
    final router = buildRouter()..go('/orders/abc');
    await tester.pumpWidget(
      ProviderScope(
        overrides: [ordersRepositoryProvider.overrideWithValue(_FakeOrders())],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('PE-0042'), findsOneWidget);
    expect(find.text('En preparación'), findsOneWidget);
    expect(find.text('IVA incluido (12%)'), findsOneWidget);
    expect(find.text('A domicilio · Tarjeta · •••• 1111'), findsOneWidget);

    // Stop polling before the test ends.
    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(seconds: 4));
  });
  testWidgets('declined payment offers another card', (tester) async {
    tester.view.physicalSize = const Size(1200, 2600);
    addTearDown(tester.view.reset);
    final router = buildRouter()..go('/orders/abc');
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          ordersRepositoryProvider.overrideWithValue(
            _FakeOrders(status: OrderStatus.pagoRechazado),
          ),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('Pago rechazado'), findsOneWidget);
    expect(find.text('Pagar con otra tarjeta'), findsOneWidget);

    // Stop polling before the test ends.
    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(seconds: 4));
  });

  testWidgets('card payment form renders the order total', (tester) async {
    tester.view.physicalSize = const Size(1200, 2400);
    addTearDown(tester.view.reset);
    final router = buildRouter()..go('/orders/abc/pay');
    await tester.pumpWidget(
      ProviderScope(
        overrides: [ordersRepositoryProvider.overrideWithValue(_FakeOrders())],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Pedido PE-0042'), findsOneWidget);
    expect(find.text('Número de tarjeta'), findsOneWidget);
    expect(find.text('Q135.00'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(seconds: 4));
  });
}
