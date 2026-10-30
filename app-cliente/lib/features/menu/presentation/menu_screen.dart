import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../../core/format/money.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/cart_bar.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/fly_to_target.dart';
import '../../../core/widgets/pressable_scale.dart';
import '../../../core/widgets/product_art.dart';
import '../../../core/widgets/shimmer.dart';
import '../../cart/application/cart_controller.dart';
import '../../cart/domain/cart.dart';
import '../data/menu_repository.dart';
import '../domain/menu.dart';
import 'product_card.dart';
import 'promo_banner.dart';

class MenuScreen extends ConsumerWidget {
  const MenuScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final menu = ref.watch(menuProvider);
    return menu.when(
      loading: () => const MenuSkeleton(),
      error: (e, _) => Scaffold(
        body: SafeArea(
          child: Column(
            children: [
              const _BrandHeader(),
              Expanded(
                child: ErrorView(
                  error: e,
                  onRetry: () => ref.invalidate(menuProvider),
                ),
              ),
            ],
          ),
        ),
      ),
      data: (menu) => menu.isEmpty
          ? Scaffold(
              body: SafeArea(
                child: Column(
                  children: [
                    const _BrandHeader(),
                    Expanded(
                      child: EmptyView(
                        icon: Icons.restaurant_menu,
                        art: SvgArt(Illustrations.fallback, size: 140),
                        title: 'El menú no está disponible',
                        message: 'Vuelve a intentarlo en unos minutos.',
                        action: OutlinedButton(
                          onPressed: () => ref.invalidate(menuProvider),
                          child: const Text('Actualizar menú'),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : _MenuView(menu: menu),
    );
  }
}

/// One selectable group of the menu: combos or a product category.
class MenuSection {
  const MenuSection({
    required this.code,
    required this.name,
    required this.coverSku,
    required this.items,
  });

  final String code;
  final String name;
  final String coverSku;
  final List<MenuItem> items;

  static List<MenuSection> fromMenu(Menu menu) => [
    if (menu.combos.isNotEmpty)
      MenuSection(
        code: Menu.combosCode,
        name: 'Combos',
        coverSku: menu.combos.first.sku,
        items: [
          for (final c in menu.combos)
            MenuItem(
              sku: c.sku,
              name: c.name,
              priceCents: c.priceCents,
              categoryCode: Menu.combosCode,
              type: ItemType.combo,
              needsDetail: true,
            ),
        ],
      ),
    for (final cat in menu.categories)
      if (cat.products.isNotEmpty)
        MenuSection(
          code: cat.code,
          name: cat.name,
          coverSku: cat.products.first.sku,
          items: [
            for (final p in cat.products)
              MenuItem(
                sku: p.sku,
                name: p.name,
                priceCents: p.priceCents,
                categoryCode: cat.code,
                type: ItemType.product,
                needsDetail: menu.modifiersFor(cat.code).isNotEmpty,
              ),
          ],
        ),
  ];
}

class MenuItem {
  const MenuItem({
    required this.sku,
    required this.name,
    required this.priceCents,
    required this.categoryCode,
    required this.type,
    required this.needsDetail,
  });

  final String sku;
  final String name;
  final int priceCents;
  final String categoryCode;
  final ItemType type;

  /// Combos and products with applicable modifiers open the detail page;
  /// everything else can be added straight from the grid.
  final bool needsDetail;

  LineDraft get quickDraft => LineDraft(
    type: type,
    sku: sku,
    name: name,
    quantity: 1,
    categoryCode: categoryCode,
  );
}

class _MenuView extends ConsumerStatefulWidget {
  const _MenuView({required this.menu});

  final Menu menu;

  @override
  ConsumerState<_MenuView> createState() => _MenuViewState();
}

class _MenuViewState extends ConsumerState<_MenuView> {
  final _cartTarget = GlobalKey();
  late List<MenuSection> _sections = MenuSection.fromMenu(widget.menu);
  int _selected = 0;

  @override
  void didUpdateWidget(_MenuView old) {
    super.didUpdateWidget(old);
    if (old.menu != widget.menu) {
      _sections = MenuSection.fromMenu(widget.menu);
      if (_selected >= _sections.length) _selected = 0;
    }
  }

  Future<void> _commit(LineDraft draft, GlobalKey source) async {
    final size = MediaQuery.sizeOf(context);
    final bottom = MediaQuery.paddingOf(context).bottom;
    await flyToTarget(
      context: context,
      from: source,
      to: _cartTarget,
      fallbackTarget: Offset(48, size.height - bottom - 48),
      child: ArtTile(
        sku: draft.sku,
        tint: CategoryTints.of(draft.categoryCode),
        size: 40,
        circle: true,
      ),
    );
    if (!mounted) return;
    ref.read(cartProvider.notifier).addDraft(draft);
  }

  Future<void> _openDetail(MenuItem item, GlobalKey source) async {
    final draft = await context.push<LineDraft>('/product/${item.sku}');
    if (draft == null || !mounted) return;
    await _commit(draft, source);
  }

  void _useCoupon(Promotion p) {
    ref.read(cartProvider.notifier).setCoupon(p.code);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            p.minimumCents > 0
                ? 'Cupón ${p.code} guardado. Se aplica cuando tu pedido llegue a ${formatCents(p.minimumCents)}.'
                : 'Cupón ${p.code} guardado. Se aplica a tu pedido.',
          ),
          // Sit above the floating cart bar instead of covering it.
          margin: EdgeInsets.fromLTRB(
            16,
            0,
            16,
            ref.read(cartProvider).isEmpty ? 16 : 84,
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final section = _sections[_selected];
    final coupon = ref.watch(cartProvider.select((c) => c.couponCode));
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final reduced = AppMotion.reduced(context);

    Widget enter(Widget child, int order) => reduced
        ? child
        : child
              .animate(delay: (60 * order).ms)
              .fadeIn(duration: AppMotion.enter)
              .moveY(begin: 12, end: 0, curve: AppMotion.curve);

    return Scaffold(
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              SliverSafeArea(
                bottom: false,
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _BrandHeader(),
                      enter(const _Headline(), 1),
                      if (widget.menu.promotions.isNotEmpty) ...[
                        const SizedBox(height: 20),
                        enter(
                          PromoBanner(
                            promotions: widget.menu.promotions,
                            appliedCode: coupon,
                            onUse: _useCoupon,
                          ),
                          2,
                        ),
                      ],
                      const SizedBox(height: 24),
                      enter(
                        _CategoryTiles(
                          sections: _sections,
                          selected: _selected,
                          onSelect: (i) => setState(() => _selected = i),
                        ),
                        3,
                      ),
                      const SizedBox(height: 20),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: AnimatedSwitcher(
                          duration: AppMotion.enter,
                          layoutBuilder: (current, previous) => Stack(
                            alignment: Alignment.centerLeft,
                            children: [...previous, ?current],
                          ),
                          child: Row(
                            key: ValueKey(section.code),
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                section.name,
                                style: theme.textTheme.titleLarge,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                section.items.length == 1
                                    ? '1 opción'
                                    : '${section.items.length} opciones',
                                style: AppFonts.mono(
                                  theme.textTheme.bodySmall?.copyWith(
                                    color: AppColors.humo,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: EdgeInsets.fromLTRB(16, 0, 16, 120 + bottomInset),
                sliver: SliverToBoxAdapter(
                  child: AnimatedSwitcher(
                    duration: reduced ? Duration.zero : AppMotion.enter,
                    switchInCurve: AppMotion.curve,
                    layoutBuilder: (current, previous) => Stack(
                      alignment: Alignment.topCenter,
                      children: [...previous, ?current],
                    ),
                    transitionBuilder: (child, animation) =>
                        FadeTransition(opacity: animation, child: child),
                    child: _ProductGrid(
                      key: ValueKey(section.code),
                      items: section.items,
                      onOpen: _openDetail,
                      onQuickAdd: (item, source) =>
                          _commit(item.quickDraft, source),
                    ),
                  ),
                ),
              ),
            ],
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 12 + bottomInset,
            child: _MenuCartBar(targetKey: _cartTarget),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: MediaQuery.paddingOf(context).top,
            child: const ColoredBox(color: AppColors.steel),
          ),
        ],
      ),
    );
  }
}

class _MenuCartBar extends ConsumerWidget {
  const _MenuCartBar({required this.targetKey});

  final GlobalKey targetKey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    // Watching the quote here keeps the total API-computed and warm for the
    // cart screen.
    final quote = cart.isEmpty ? null : ref.watch(quoteProvider);
    final seen = <String>{};
    final thumbs = <CartThumb>[
      for (final l in cart.lines.reversed)
        if (seen.add(l.sku))
          (sku: l.sku, tint: CategoryTints.of(l.categoryCode)),
    ];
    return CartBar(
      targetKey: targetKey,
      count: cart.itemCount,
      thumbs: thumbs,
      totalCents: quote?.value?.quote.totalCents,
      updating: quote?.isLoading ?? false,
      onTap: () => context.push('/cart'),
    );
  }
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.ink,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'PE',
              style: AppFonts.display(
                theme.textTheme.titleMedium?.copyWith(
                  color: AppColors.mostaza,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            'Pedido Express',
            style: AppFonts.display(
              theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                fontSize: 18,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Headline extends StatelessWidget {
  const _Headline();

  @override
  Widget build(BuildContext context) {
    final style = AppFonts.display(
      Theme.of(context).textTheme.headlineMedium?.copyWith(
        fontSize: 40,
        fontWeight: FontWeight.w800,
        height: 1.05,
        letterSpacing: -1.2,
      ),
    );
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Semantics(
        header: true,
        label: '¿Qué se te antoja hoy?',
        excludeSemantics: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('¿Qué se te', style: style),
            // The mustard rail from the kitchen underlines the craving.
            Stack(
              children: [
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 6,
                  height: 12,
                  child: _RailUnderline(),
                ),
                Text('antoja hoy?', style: style),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _RailUnderline extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final bar = Container(
      decoration: BoxDecoration(
        color: AppColors.mostaza,
        borderRadius: BorderRadius.circular(3),
      ),
    );
    if (AppMotion.reduced(context)) return bar;
    return bar
        .animate(delay: 280.ms)
        .scaleX(
          begin: 0,
          end: 1,
          alignment: Alignment.centerLeft,
          duration: 420.ms,
          curve: AppMotion.curve,
        );
  }
}

class _CategoryTiles extends StatelessWidget {
  const _CategoryTiles({
    required this.sections,
    required this.selected,
    required this.onSelect,
  });

  final List<MenuSection> sections;
  final int selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reduced = AppMotion.reduced(context);
    final duration = reduced ? Duration.zero : AppMotion.enter;
    return SizedBox(
      height: 112,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: sections.length,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (context, i) {
          final s = sections[i];
          final active = i == selected;
          return Semantics(
            button: true,
            selected: active,
            label: s.name,
            excludeSemantics: true,
            child: PressableScale(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => onSelect(i),
                child: SizedBox(
                  width: 92,
                  child: Column(
                    children: [
                      AnimatedContainer(
                        duration: duration,
                        curve: AppMotion.curve,
                        width: 72,
                        height: 72,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: CategoryTints.of(s.code),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: active ? AppColors.ink : Colors.transparent,
                            width: 2,
                          ),
                        ),
                        child: AnimatedScale(
                          scale: active ? 1.08 : 0.94,
                          duration: duration,
                          curve: AppMotion.curve,
                          child: ProductArt(s.coverSku),
                        ),
                      ),
                      const SizedBox(height: 6),
                      AnimatedDefaultTextStyle(
                        duration: duration,
                        style: theme.textTheme.labelMedium!.copyWith(
                          color: active ? AppColors.ink : AppColors.humo,
                          fontWeight: active
                              ? FontWeight.w700
                              : FontWeight.w500,
                        ),
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(s.name, maxLines: 1),
                        ),
                      ),
                      const SizedBox(height: 4),
                      AnimatedContainer(
                        duration: duration,
                        curve: AppMotion.curve,
                        width: active ? 20 : 0,
                        height: 3,
                        decoration: BoxDecoration(
                          color: AppColors.mostaza,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ProductGrid extends StatelessWidget {
  const _ProductGrid({
    super.key,
    required this.items,
    required this.onOpen,
    required this.onQuickAdd,
  });

  final List<MenuItem> items;
  final void Function(MenuItem, GlobalKey) onOpen;
  final void Function(MenuItem, GlobalKey) onQuickAdd;

  @override
  Widget build(BuildContext context) {
    final reduced = AppMotion.reduced(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 600 ? 3 : 2;
        const gap = 12.0;
        final width = (constraints.maxWidth - gap * (columns - 1)) / columns;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [
            for (final (i, item) in items.indexed)
              SizedBox(
                width: width,
                child: _stagger(
                  ProductCard(
                    item: item,
                    onOpen: onOpen,
                    onQuickAdd: onQuickAdd,
                  ),
                  i,
                  reduced,
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _stagger(Widget child, int i, bool reduced) {
    if (reduced || i >= 8) return child;
    return child
        .animate(delay: (40 * i).ms)
        .fadeIn(duration: AppMotion.enter)
        .moveY(
          begin: 12,
          end: 0,
          duration: AppMotion.enter,
          curve: AppMotion.curve,
        )
        .scaleXY(
          begin: 0.98,
          end: 1,
          duration: AppMotion.enter,
          curve: AppMotion.curve,
        );
  }
}

class MenuSkeleton extends StatelessWidget {
  const MenuSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final card = (width - 16 * 2 - 12) / 2;
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _BrandHeader(),
            Expanded(
              child: Shimmer(
                child: SingleChildScrollView(
                  physics: const NeverScrollableScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.fromLTRB(16, 24, 16, 0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SkeletonBox(width: 200, height: 38, radius: 8),
                            SizedBox(height: 8),
                            SkeletonBox(width: 240, height: 38, radius: 8),
                          ],
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.fromLTRB(16, 20, 16, 0),
                        child: SkeletonBox(
                          width: double.infinity,
                          height: 116,
                          radius: 18,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Row(
                          children: [
                            for (var i = 0; i < 4; i++)
                              const Padding(
                                padding: EdgeInsets.only(right: 18),
                                child: Column(
                                  children: [
                                    SkeletonBox(
                                      width: 72,
                                      height: 72,
                                      radius: 20,
                                    ),
                                    SizedBox(height: 8),
                                    SkeletonBox(width: 56, height: 10),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.fromLTRB(16, 24, 16, 12),
                        child: SkeletonBox(width: 120, height: 22, radius: 6),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Wrap(
                          spacing: 12,
                          runSpacing: 12,
                          children: [
                            for (var i = 0; i < 4; i++)
                              ProductCardSkeleton(width: card),
                          ],
                        ),
                      ),
                    ],
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
