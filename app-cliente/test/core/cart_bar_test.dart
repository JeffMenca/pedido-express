import 'package:app_cliente/core/widgets/cart_bar.dart';
import 'package:app_cliente/core/widgets/odometer.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

void main() {
  Widget host({required int count, int? total, VoidCallback? onTap}) =>
      MaterialApp(
        home: Scaffold(
          body: Align(
            alignment: Alignment.bottomCenter,
            child: CartBar(
              count: count,
              thumbs: const [(sku: 'P-001', tint: Color(0xFFFBE3D4))],
              totalCents: total,
              onTap: onTap ?? () {},
            ),
          ),
        ),
      );

  testWidgets('shows count, API total and opens the cart', (tester) async {
    var taps = 0;
    await tester.pumpWidget(host(count: 2, total: 6500, onTap: () => taps++));
    await tester.pumpAndSettle();

    expect(find.text('2 artículos'), findsOneWidget);
    expect(
      find.byWidgetPredicate((w) => w is Odometer && w.cents == 6500),
      findsOneWidget,
    );
    await tester.tap(find.text('Ver carrito'));
    expect(taps, 1);
  });

  testWidgets('bumps when an item is added', (tester) async {
    await tester.pumpWidget(host(count: 1, total: 3200));
    await tester.pumpAndSettle();
    await tester.pumpWidget(host(count: 2, total: 3200));
    await tester.pump(const Duration(milliseconds: 120));

    final scale = tester.widget<ScaleTransition>(
      find
          .descendant(
            of: find.byType(CartBar),
            matching: find.byType(ScaleTransition),
          )
          .first,
    );
    expect(scale.scale.value, greaterThan(1));
    await tester.pumpAndSettle();
    expect(scale.scale.value, 1);
  });

  testWidgets('is not tappable while the cart is empty', (tester) async {
    var taps = 0;
    await tester.pumpWidget(host(count: 0, onTap: () => taps++));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ver carrito'), warnIfMissed: false);
    expect(taps, 0);
  });
}
