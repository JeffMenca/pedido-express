import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/format/money.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/quantity_stepper.dart';
import '../../cart/application/cart_controller.dart';
import '../../cart/domain/cart.dart';
import '../domain/menu.dart';

Future<void> showLineBuilder(
  BuildContext context, {
  required Menu menu,
  Product? product,
  Combo? combo,
}) {
  assert((product == null) != (combo == null));
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    sheetAnimationStyle: const AnimationStyle(
      duration: Duration(milliseconds: 260),
      reverseDuration: AppMotion.exit,
    ),
    builder: (_) =>
        LineBuilderSheet(menu: menu, product: product, combo: combo),
  );
}

class LineBuilderSheet extends ConsumerStatefulWidget {
  const LineBuilderSheet({
    super.key,
    required this.menu,
    this.product,
    this.combo,
  });

  final Menu menu;
  final Product? product;
  final Combo? combo;

  @override
  ConsumerState<LineBuilderSheet> createState() => _LineBuilderSheetState();
}

class _LineBuilderSheetState extends ConsumerState<LineBuilderSheet> {
  int _quantity = 1;
  bool _upgrade = false;
  final _selected = <String>{};

  String get _name => widget.combo?.name ?? widget.product!.name;

  List<Modifier> get _modifiers => widget.menu.modifiersFor(
    widget.combo?.mainCategory ?? widget.product!.categoryCode,
  );

  void _add() {
    final modifiers = _modifiers.where((m) => _selected.contains(m.code));
    ref
        .read(cartProvider.notifier)
        .add(
          type: widget.combo != null ? ItemType.combo : ItemType.product,
          sku: widget.combo?.sku ?? widget.product!.sku,
          name: _name,
          quantity: _quantity,
          upgradeLarge: _upgrade,
          modifierCodes: [for (final m in modifiers) m.code],
          modifierNames: [for (final m in modifiers) m.name],
        );
    final messenger = ScaffoldMessenger.of(context);
    Navigator.of(context).pop();
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text('$_name agregado al carrito')));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final combo = widget.combo;
    final upgrade = combo?.upgrade;
    final modifiers = _modifiers;
    final basePrice = combo?.priceCents ?? widget.product!.priceCents;
    final sectionStyle = theme.textTheme.labelLarge?.copyWith(
      color: AppColors.humo,
      letterSpacing: 0.2,
    );

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _name,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              formatCents(basePrice),
              style: AppFonts.mono(
                theme.textTheme.titleMedium?.copyWith(color: AppColors.ink),
              ),
            ),
            if (combo != null && combo.includes.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Incluye: ${combo.includes.join(', ')}',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.humo,
                ),
              ),
            ],
            if (upgrade != null) ...[
              const SizedBox(height: 20),
              Text('TAMAÑO', style: sectionStyle),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                value: _upgrade,
                onChanged: (v) => setState(() => _upgrade = v ?? false),
                title: const Text('Agrandar combo'),
                subtitle: upgrade.includes.isEmpty
                    ? null
                    : Text(upgrade.includes.join(', ')),
                secondary: _PriceDelta(upgrade.priceCents),
              ),
            ],
            if (modifiers.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text('EXTRAS', style: sectionStyle),
              for (final m in modifiers)
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  value: _selected.contains(m.code),
                  onChanged: (v) => setState(
                    () => v == true
                        ? _selected.add(m.code)
                        : _selected.remove(m.code),
                  ),
                  title: Text(m.name),
                  secondary: _PriceDelta(m.priceCents),
                ),
            ],
            const SizedBox(height: 20),
            Row(
              children: [
                QuantityStepper(
                  value: _quantity,
                  onChanged: (v) => setState(() => _quantity = v),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: _add,
                    child: const Text('Agregar al carrito'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PriceDelta extends StatelessWidget {
  const _PriceDelta(this.cents);

  final int cents;

  @override
  Widget build(BuildContext context) {
    return Text(
      cents == 0 ? 'Sin costo' : '+${formatCents(cents)}',
      style: AppFonts.mono(
        Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.humo),
      ),
    );
  }
}
