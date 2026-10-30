import 'dart:convert';

import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../../core/format/money.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/odometer.dart';
import '../../../core/widgets/pressable_scale.dart';
import '../../../core/widgets/product_art.dart';
import '../../../core/widgets/quantity_stepper.dart';
import '../../../core/widgets/shimmer.dart';
import '../../cart/application/cart_controller.dart';
import '../../cart/domain/cart.dart';
import '../data/menu_repository.dart';
import '../domain/menu.dart';
import 'product_card.dart';

/// Full-screen line builder. Pops with a [LineDraft]; the menu flies it into
/// the cart.
class ProductDetailScreen extends ConsumerWidget {
  const ProductDetailScreen({super.key, required this.sku});

  final String sku;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final menu = ref.watch(menuProvider);
    return menu.when(
      loading: () => const _DetailSkeleton(),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: ErrorView(error: e, onRetry: () => ref.invalidate(menuProvider)),
      ),
      data: (menu) {
        final combo = menu.comboBySku(sku);
        final product = combo == null ? menu.productBySku(sku) : null;
        if (combo == null && product == null) {
          return Scaffold(
            appBar: AppBar(),
            body: EmptyView(
              icon: Icons.no_food_outlined,
              art: SvgArt(Illustrations.fallback, size: 140),
              title: 'Este producto ya no está disponible',
              action: OutlinedButton(
                onPressed: () => context.go('/'),
                child: const Text('Volver al menú'),
              ),
            ),
          );
        }
        return _DetailView(menu: menu, combo: combo, product: product);
      },
    );
  }
}

class _DetailView extends ConsumerStatefulWidget {
  const _DetailView({required this.menu, this.combo, this.product});

  final Menu menu;
  final Combo? combo;
  final Product? product;

  @override
  ConsumerState<_DetailView> createState() => _DetailViewState();
}

class _DetailViewState extends ConsumerState<_DetailView> {
  int _quantity = 1;
  bool _upgrade = false;
  final _selected = <String>{};
  int? _lastTotal;
  final _scrolled = ValueNotifier(false);

  @override
  void dispose() {
    _scrolled.dispose();
    super.dispose();
  }

  bool get _isCombo => widget.combo != null;
  String get _sku => widget.combo?.sku ?? widget.product!.sku;
  String get _name => widget.combo?.name ?? widget.product!.name;
  int get _basePrice => widget.combo?.priceCents ?? widget.product!.priceCents;
  String get _modifierCategory =>
      widget.combo?.mainCategory ?? widget.product!.categoryCode;
  String get _tintCategory =>
      _isCombo ? Menu.combosCode : widget.product!.categoryCode;

  List<Modifier> get _modifiers => widget.menu.modifiersFor(_modifierCategory);

  LineDraft get _draft {
    final chosen = _modifiers.where((m) => _selected.contains(m.code));
    return LineDraft(
      type: _isCombo ? ItemType.combo : ItemType.product,
      sku: _sku,
      name: _name,
      quantity: _quantity,
      upgradeLarge: _upgrade,
      modifierCodes: [for (final m in chosen) m.code],
      modifierNames: [for (final m in chosen) m.name],
      categoryCode: _tintCategory,
    );
  }

  String _categoryName() {
    if (_isCombo) return 'Combo';
    for (final c in widget.menu.categories) {
      if (c.code == widget.product!.categoryCode) return c.name;
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final draft = _draft;
    final lineTotal = ref.watch(lineQuoteProvider(jsonEncode(draft.toJson())));
    final total = lineTotal.value ?? _lastTotal ?? _basePrice;
    if (lineTotal.hasValue && !lineTotal.isLoading) {
      _lastTotal = lineTotal.value;
    }
    final combo = widget.combo;
    final modifiers = _modifiers;
    final media = MediaQuery.of(context);
    final headerHeight =
        (media.size.width * 0.86).clamp(260.0, 420.0) + media.padding.top;
    final reduced = AppMotion.reduced(context);

    Widget reveal(Widget child, int order) => reduced
        ? child
        : child
              .animate(delay: (140 + 50 * order).ms)
              .fadeIn(duration: AppMotion.enter)
              .moveY(begin: 12, end: 0, curve: AppMotion.curve);

    return Scaffold(
      backgroundColor: AppColors.ticket,
      body: Stack(
        children: [
          NotificationListener<ScrollUpdateNotification>(
            onNotification: (n) {
              _scrolled.value = n.metrics.pixels > headerHeight - 120;
              return false;
            },
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: headerHeight,
                    child: ArtHero(
                      sku: _sku,
                      tint: CategoryTints.of(_tintCategory),
                      radius: const BorderRadius.vertical(
                        bottom: Radius.circular(32),
                      ),
                      padding: EdgeInsets.fromLTRB(
                        48,
                        media.padding.top + 36,
                        48,
                        24,
                      ),
                    ),
                  ),
                ),
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(
                    20,
                    20,
                    20,
                    120 + media.padding.bottom,
                  ),
                  sliver: SliverList.list(
                    children: [
                      reveal(
                        Text(
                          _categoryName(),
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: AppColors.humo,
                          ),
                        ),
                        0,
                      ),
                      const SizedBox(height: 4),
                      reveal(
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(
                                _name,
                                style: AppFonts.display(
                                  theme.textTheme.headlineMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    height: 1.1,
                                    letterSpacing: -0.6,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Text(
                                formatCents(_basePrice),
                                style: AppFonts.mono(
                                  theme.textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        1,
                      ),
                      if (combo != null && combo.includes.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        reveal(const _SectionTitle('Incluye'), 2),
                        const SizedBox(height: 12),
                        _IncludesRow(menu: widget.menu, names: combo.includes),
                      ],
                      if (combo?.upgrade != null) ...[
                        const SizedBox(height: 24),
                        reveal(const _SectionTitle('Tamaño'), 3),
                        const SizedBox(height: 12),
                        reveal(
                          _UpgradeCard(
                            menu: widget.menu,
                            upgrade: combo!.upgrade!,
                            selected: _upgrade,
                            onChanged: (v) => setState(() => _upgrade = v),
                          ),
                          3,
                        ),
                      ],
                      if (modifiers.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        reveal(const _SectionTitle('Extras'), 4),
                        const SizedBox(height: 4),
                        for (final (i, m) in modifiers.indexed)
                          reveal(
                            _ExtraRow(
                              modifier: m,
                              selected: _selected.contains(m.code),
                              showDivider: i > 0,
                              onChanged: (v) => setState(
                                () => v
                                    ? _selected.add(m.code)
                                    : _selected.remove(m.code),
                              ),
                            ),
                            5 + i,
                          ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: media.padding.top,
            child: ValueListenableBuilder(
              valueListenable: _scrolled,
              builder: (_, scrolled, _) => AnimatedOpacity(
                opacity: scrolled ? 1 : 0,
                duration: AppMotion.exit,
                child: const ColoredBox(color: AppColors.ticket),
              ),
            ),
          ),
          Positioned(
            top: media.padding.top + 8,
            left: 12,
            child: _RoundButton(
              icon: Icons.arrow_back,
              tooltip: 'Volver al menú',
              onTap: () => context.pop(),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 12 + media.padding.bottom,
            child: reveal(
              _AddBar(
                quantity: _quantity,
                onQuantity: (v) => setState(() => _quantity = v),
                totalCents: total,
                updating: lineTotal.isLoading,
                onAdd: () => context.pop(_draft),
              ),
              2,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: AppFonts.display(
      Theme.of(context).textTheme.titleMedium
          ?.copyWith(fontWeight: FontWeight.w700),
    ),
  );
}

class _IncludesRow extends StatelessWidget {
  const _IncludesRow({required this.menu, required this.names});

  final Menu menu;
  final List<String> names;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reduced = AppMotion.reduced(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final (i, name) in names.indexed)
          Expanded(
            child: Builder(
              builder: (context) {
                final sku = menu.skuForName(name) ?? '';
                final category = menu.productBySku(sku)?.categoryCode;
                final bubble = Column(
                  children: [
                    ArtTile(
                      sku: sku,
                      tint: CategoryTints.of(category),
                      size: 76,
                      circle: true,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      name,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w500,
                        height: 1.2,
                      ),
                    ),
                  ],
                );
                if (reduced) return bubble;
                return bubble
                    .animate(delay: (220 + 70 * i).ms)
                    .fadeIn(duration: AppMotion.enter)
                    .scaleXY(
                      begin: 0.8,
                      end: 1,
                      duration: 360.ms,
                      curve: Curves.easeOutBack,
                    );
              },
            ),
          ),
      ],
    );
  }
}

class _UpgradeCard extends StatelessWidget {
  const _UpgradeCard({
    required this.menu,
    required this.upgrade,
    required this.selected,
    required this.onChanged,
  });

  final Menu menu;
  final ComboUpgrade upgrade;
  final bool selected;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final skus = [for (final n in upgrade.includes) ?menu.skuForName(n)]
        .take(2)
        .toList();
    return Semantics(
      checked: selected,
      button: true,
      excludeSemantics: true,
      label:
          'Agrandar combo, ${upgrade.includes.join(' y ')}, más ${formatCents(upgrade.priceCents)}',
      child: PressableScale(
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => onChanged(!selected),
          child: AnimatedContainer(
            duration: AppMotion.enter,
            curve: AppMotion.curve,
            padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
            decoration: BoxDecoration(
              color: selected ? CategoryTints.combos : AppColors.ticket,
              borderRadius: BorderRadius.circular(AppRadii.card),
              border: Border.all(
                color: selected ? AppColors.ink : AppColors.line,
                width: selected ? 2 : 1,
              ),
            ),
            child: Row(
              children: [
                SizedBox(
                  width: 92,
                  height: 64,
                  child: Stack(
                    children: [
                      for (final (i, sku) in skus.indexed)
                        Positioned(
                          left: i * 34.0,
                          bottom: 0,
                          child: AnimatedScale(
                            scale: selected ? 1 : 0.86,
                            duration: AppMotion.enter,
                            curve: Curves.easeOutBack,
                            alignment: Alignment.bottomCenter,
                            child: SizedBox(
                              width: 58,
                              height: 64,
                              child: ProductArt(sku),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Agrandar combo',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (upgrade.includes.isNotEmpty)
                        Text(
                          upgrade.includes.join(' y '),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.humo,
                          ),
                        ),
                      const SizedBox(height: 4),
                      Text(
                        '+${formatCents(upgrade.priceCents)}',
                        style: AppFonts.mono(
                          theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                _CheckMark(selected: selected, circle: true),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ExtraRow extends StatelessWidget {
  const _ExtraRow({
    required this.modifier,
    required this.selected,
    required this.onChanged,
    required this.showDivider,
  });

  final Modifier modifier;
  final bool selected;
  final bool showDivider;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final asset = Illustrations.forModifier(modifier.code);
    return Semantics(
      checked: selected,
      button: true,
      excludeSemantics: true,
      label: modifier.priceCents == 0
          ? '${modifier.name}, sin costo'
          : '${modifier.name}, más ${formatCents(modifier.priceCents)}',
      child: InkWell(
        onTap: () => onChanged(!selected),
        child: Container(
          constraints: const BoxConstraints(minHeight: 68),
          decoration: BoxDecoration(
            border: showDivider
                ? const Border(top: BorderSide(color: AppColors.steel))
                : null,
          ),
          child: Row(
            children: [
              AnimatedContainer(
                duration: AppMotion.enter,
                width: 48,
                height: 48,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: selected ? CategoryTints.combos : AppColors.steel,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: asset == null
                    ? const Icon(
                        Icons.add_circle_outline,
                        color: AppColors.humo,
                      )
                    : SvgArt(asset),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  modifier.name,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Text(
                modifier.priceCents == 0
                    ? 'Sin costo'
                    : '+${formatCents(modifier.priceCents)}',
                style: AppFonts.mono(
                  theme.textTheme.bodyMedium?.copyWith(color: AppColors.humo),
                ),
              ),
              const SizedBox(width: 14),
              _CheckMark(selected: selected),
            ],
          ),
        ),
      ),
    );
  }
}

class _CheckMark extends StatelessWidget {
  const _CheckMark({required this.selected, this.circle = false});

  final bool selected;
  final bool circle;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: AppMotion.enter,
      curve: AppMotion.curve,
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        color: selected ? AppColors.ink : AppColors.ticket,
        shape: circle ? BoxShape.circle : BoxShape.rectangle,
        borderRadius: circle ? null : BorderRadius.circular(8),
        border: Border.all(
          color: selected ? AppColors.ink : AppColors.line,
          width: 2,
        ),
      ),
      child: AnimatedScale(
        scale: selected ? 1 : 0,
        duration: AppMotion.enter,
        curve: Curves.easeOutBack,
        child: const Icon(Icons.check, size: 16, color: AppColors.ticket),
      ),
    );
  }
}

class _AddBar extends StatelessWidget {
  const _AddBar({
    required this.quantity,
    required this.onQuantity,
    required this.totalCents,
    required this.updating,
    required this.onAdd,
  });

  final int quantity;
  final ValueChanged<int> onQuantity;
  final int totalCents;
  final bool updating;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final label = theme.textTheme.titleMedium?.copyWith(
      color: AppColors.ticket,
      fontWeight: FontWeight.w700,
    );
    return Material(
      color: AppColors.ink,
      borderRadius: BorderRadius.circular(AppRadii.bar),
      elevation: 8,
      shadowColor: AppColors.ink.withValues(alpha: 0.4),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Row(
          children: [
            QuantityStepper(
              value: quantity,
              onChanged: onQuantity,
              onDark: true,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: PressableScale(
                child: Semantics(
                  button: true,
                  label: 'Agregar al carrito, ${formatCents(totalCents)}',
                  excludeSemantics: true,
                  child: Material(
                    color: AppColors.salsa,
                    borderRadius: BorderRadius.circular(AppRadii.card),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(AppRadii.card),
                      onTap: onAdd,
                      child: SizedBox(
                        height: 52,
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('Agregar · ', style: label),
                              AnimatedOpacity(
                                opacity: updating ? 0.6 : 1,
                                duration: AppMotion.enter,
                                child: Odometer(totalCents, style: label),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      child: Material(
        color: AppColors.ticket,
        shape: const CircleBorder(),
        elevation: 1,
        child: IconButton(
          tooltip: tooltip,
          icon: Icon(icon, color: AppColors.ink),
          onPressed: onTap,
        ),
      ),
    );
  }
}

class _DetailSkeleton extends StatelessWidget {
  const _DetailSkeleton();

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return Scaffold(
      backgroundColor: AppColors.ticket,
      body: Shimmer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: width * 0.86,
              width: double.infinity,
              child: const SkeletonBox(
                width: double.infinity,
                height: double.infinity,
                radius: 32,
              ),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 24, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(width: 80, height: 12),
                  SizedBox(height: 10),
                  SkeletonBox(width: 220, height: 28, radius: 6),
                  SizedBox(height: 28),
                  Row(
                    children: [
                      SkeletonBox(width: 76, height: 76, circle: true),
                      SizedBox(width: 24),
                      SkeletonBox(width: 76, height: 76, circle: true),
                      SizedBox(width: 24),
                      SkeletonBox(width: 76, height: 76, circle: true),
                    ],
                  ),
                  SizedBox(height: 28),
                  SkeletonBox(width: double.infinity, height: 88, radius: 14),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
