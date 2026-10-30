import 'package:app_cliente/core/widgets/quantity_stepper.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

void main() {
  Future<void> pump(WidgetTester tester, int initial, List<int> changes) {
    return tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => QuantityStepper(
              value: initial,
              onChanged: (v) => setState(() {
                initial = v;
                changes.add(v);
              }),
            ),
          ),
        ),
      ),
    );
  }

  testWidgets('increments and decrements within 1..20', (tester) async {
    final changes = <int>[];
    await pump(tester, 1, changes);

    final minus = find.widgetWithIcon(IconButton, Icons.remove);
    final plus = find.widgetWithIcon(IconButton, Icons.add);

    expect(tester.widget<IconButton>(minus).onPressed, isNull);
    await tester.tap(plus);
    await tester.pumpAndSettle();
    expect(find.text('2'), findsOneWidget);
    await tester.tap(minus);
    await tester.pumpAndSettle();
    expect(changes, [2, 1]);
  });

  testWidgets('disables increment at the maximum of 20', (tester) async {
    await pump(tester, 20, []);
    expect(
      tester
          .widget<IconButton>(find.widgetWithIcon(IconButton, Icons.add))
          .onPressed,
      isNull,
    );
  });
}
