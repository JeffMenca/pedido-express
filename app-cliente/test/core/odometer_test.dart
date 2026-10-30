import 'package:app_cliente/core/widgets/odometer.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

void main() {
  Widget host(int cents) => MaterialApp(
    home: Scaffold(body: Center(child: Odometer(cents))),
  );

  testWidgets('rolls to the new amount and exposes it to accessibility', (
    tester,
  ) async {
    await tester.pumpWidget(host(1200));
    expect(find.bySemanticsLabel('Q12.00'), findsOneWidget);

    await tester.pumpWidget(host(6500));
    await tester.pump(const Duration(milliseconds: 200));
    // Mid-roll: rolling digits paint more glyphs than the final amount.
    expect(find.byType(Text).evaluate().length, greaterThan(6));
    await tester.pumpAndSettle();

    expect(find.bySemanticsLabel('Q65.00'), findsOneWidget);
    final digits = tester
        .widgetList<Text>(find.byType(Text))
        .map((t) => t.data)
        .join();
    expect(digits, 'Q65.00');
  });
}
