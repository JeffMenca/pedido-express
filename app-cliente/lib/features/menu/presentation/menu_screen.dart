import 'package:material_ui/material_ui.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format/money.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/feedback.dart';
import '../../cart/application/cart_controller.dart';
import '../data/menu_repository.dart';
import '../domain/menu.dart';
import 'line_builder_sheet.dart';

class MenuScreen extends ConsumerWidget {
  const MenuScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final menu = ref.watch(menuProvider);
    return menu.when(
      loading: () => const _MenuSkeleton(),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: const Text('Pedido Express')),
        body: ErrorView(error: e, onRetry: () => ref.invalidate(menuProvider)),
      ),
      data: (menu) => menu.isEmpty
          ? Scaffold(
              appBar: AppBar(title: const Text('Pedido Express')),
              body: const EmptyView(
                icon: Icons.restaurant_menu,
                title: 'El menú no está disponible',
                message: 'Vuelve a intentarlo en unos minutos.',
              ),
            )
          : _MenuTabs(menu: menu),
    );
  }
}

class _MenuTabs extends StatelessWidget {
  const _MenuTabs({required this.menu});

  final Menu menu;

  @override
  Widget build(BuildContext context) {
    final categories = menu.categories.where((c) => c.products.isNotEmpty);
    final tabs = <(String, Widget)>[
      if (menu.combos.isNotEmpty)
        (
          'Combos',
          _ItemList(
            items: [
              for (final c in menu.combos)
                _MenuItemData(
                  title: c.name,
                  subtitle: c.includes.join(' · '),
                  priceCents: c.priceCents,
                  onTap: (ctx) => showLineBuilder(ctx, menu: menu, combo: c),
                ),
            ],
          ),
        ),
      for (final cat in categories)
        (
          cat.name,
          _ItemList(
            items: [
              for (final p in cat.products)
                _MenuItemData(
                  title: p.name,
                  priceCents: p.priceCents,
                  onTap: (ctx) => showLineBuilder(ctx, menu: menu, product: p),
                ),
            ],
          ),
        ),
    ];
    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Pedido Express'),
          bottom: TabBar(
            isScrollable: true,
            tabs: [for (final t in tabs) Tab(text: t.$1)],
          ),
        ),
        body: TabBarView(children: [for (final t in tabs) t.$2]),
        bottomNavigationBar: const _CartBar(),
      ),
    );
  }
}

class _MenuItemData {
  const _MenuItemData({
    required this.title,
    required this.priceCents,
    required this.onTap,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final int priceCents;
  final void Function(BuildContext) onTap;
}

class _ItemList extends StatelessWidget {
  const _ItemList({required this.items});

  final List<_MenuItemData> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, i) {
        final item = items[i];
        final card = Card(
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => item.onTap(context),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (item.subtitle != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            item.subtitle!,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.humo,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    formatCents(item.priceCents),
                    style: AppFonts.mono(
                      theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.chevron_right, color: AppColors.faint),
                ],
              ),
            ),
          ),
        );
        if (i >= 8) return card;
        if (AppMotion.reduced(context)) {
          return card.animate().fadeIn(duration: AppMotion.enter);
        }
        return card
            .animate()
            .fadeIn(delay: (35 * i).ms, duration: AppMotion.enter)
            .moveY(
              begin: 8,
              end: 0,
              delay: (35 * i).ms,
              duration: AppMotion.enter,
              curve: AppMotion.curve,
            );
      },
    );
  }
}

class _CartBar extends ConsumerWidget {
  const _CartBar();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(cartProvider.select((c) => c.itemCount));
    return AnimatedSize(
      duration: AppMotion.enter,
      curve: AppMotion.curve,
      child: count == 0
          ? const SizedBox(width: double.infinity)
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: FilledButton(
                  onPressed: () => context.push('/cart'),
                  child: Text(
                    count == 1
                        ? 'Ver carrito · 1 artículo'
                        : 'Ver carrito · $count artículos',
                  ),
                ),
              ),
            ),
    );
  }
}

class _MenuSkeleton extends StatelessWidget {
  const _MenuSkeleton();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pedido Express')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: 6,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (_, _) => const Card(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SkeletonBox(width: 160, height: 18),
                      SizedBox(height: 8),
                      SkeletonBox(width: 220, height: 12),
                    ],
                  ),
                ),
                SkeletonBox(width: 56),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
