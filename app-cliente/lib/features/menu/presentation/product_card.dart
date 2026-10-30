import 'package:material_ui/material_ui.dart';

import '../../../core/format/money.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/pressable_scale.dart';
import '../../../core/widgets/product_art.dart';
import '../../../core/widgets/shimmer.dart';
import 'menu_screen.dart';

String productHeroTag(String sku) => 'art-$sku';

/// Tinted art block shared between the grid card and the detail header. The
/// radius and padding are animated by the Hero flight so the tint "grows"
/// into the detail background.
class ArtHero extends StatelessWidget {
  const ArtHero({
    super.key,
    required this.sku,
    required this.tint,
    required this.radius,
    required this.padding,
  });

  final String sku;
  final Color tint;
  final BorderRadius radius;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return HeroMode(
      enabled: !AppMotion.reduced(context),
      child: Hero(
        tag: productHeroTag(sku),
        createRectTween: (a, b) => MaterialRectArcTween(begin: a, end: b),
        flightShuttleBuilder: (_, animation, direction, fromCtx, toCtx) {
          final from = (fromCtx.widget as Hero).child as _ArtBlock;
          final to = (toCtx.widget as Hero).child as _ArtBlock;
          final curved = CurvedAnimation(
            parent: animation,
            curve: AppMotion.curve,
          );
          final pushing = direction == HeroFlightDirection.push;
          final start = pushing ? from : to;
          final end = pushing ? to : from;
          return AnimatedBuilder(
            animation: curved,
            builder: (_, _) => _ArtBlock(
              sku: sku,
              tint: tint,
              radius: BorderRadius.lerp(
                start.radius,
                end.radius,
                curved.value,
              )!,
              padding: EdgeInsets.lerp(
                start.padding,
                end.padding,
                curved.value,
              )!,
            ),
          );
        },
        child: _ArtBlock(
          sku: sku,
          tint: tint,
          radius: radius,
          padding: padding,
        ),
      ),
    );
  }
}

class _ArtBlock extends StatelessWidget {
  const _ArtBlock({
    required this.sku,
    required this.tint,
    required this.radius,
    required this.padding,
  });

  final String sku;
  final Color tint;
  final BorderRadius radius;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: Container(
        padding: padding,
        decoration: BoxDecoration(color: tint, borderRadius: radius),
        child: ProductArt(sku),
      ),
    );
  }
}

class ProductCard extends StatefulWidget {
  const ProductCard({
    super.key,
    required this.item,
    required this.onOpen,
    required this.onQuickAdd,
  });

  final MenuItem item;
  final void Function(MenuItem, GlobalKey) onOpen;
  final void Function(MenuItem, GlobalKey) onQuickAdd;

  @override
  State<ProductCard> createState() => _ProductCardState();
}

class _ProductCardState extends State<ProductCard> {
  final _artKey = GlobalKey();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final item = widget.item;
    final tint = CategoryTints.of(item.categoryCode);
    return PressableScale(
      child: Material(
        color: AppColors.ticket,
        borderRadius: BorderRadius.circular(18),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => widget.onOpen(item, _artKey),
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(
                  aspectRatio: 1.08,
                  child: KeyedSubtree(
                    key: _artKey,
                    child: ArtHero(
                      sku: item.sku,
                      tint: tint,
                      radius: BorderRadius.circular(14),
                      padding: const EdgeInsets.all(14),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(6, 10, 4, 0),
                  child: SizedBox(
                    height: 40,
                    child: Text(
                      item.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        height: 1.25,
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(6, 6, 0, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          formatCents(item.priceCents),
                          style: AppFonts.mono(
                            theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                            ),
                          ),
                        ),
                      ),
                      _AddButton(
                        label: item.needsDetail
                            ? 'Elegir ${item.name}'
                            : 'Agregar ${item.name}',
                        onTap: () => item.needsDetail
                            ? widget.onOpen(item, _artKey)
                            : widget.onQuickAdd(item, _artKey),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AddButton extends StatelessWidget {
  const _AddButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      scale: 0.9,
      child: Semantics(
        button: true,
        label: label,
        excludeSemantics: true,
        child: Material(
          color: AppColors.ink,
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            child: const SizedBox(
              width: 40,
              height: 40,
              child: Icon(Icons.add, color: AppColors.ticket, size: 22),
            ),
          ),
        ),
      ),
    );
  }
}

class ProductCardSkeleton extends StatelessWidget {
  const ProductCardSkeleton({super.key, required this.width});

  final double width;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: AppColors.ticket,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 1.08,
            child: const SkeletonBox(
              width: double.infinity,
              height: double.infinity,
              radius: 14,
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(6, 12, 6, 0),
            child: SkeletonBox(width: 110, height: 14),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(6, 8, 6, 0),
            child: SkeletonBox(width: 70, height: 14),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(6, 10, 0, 0),
            child: Row(
              children: [
                SkeletonBox(width: 60, height: 16),
                Spacer(),
                SkeletonBox(width: 40, height: 40, circle: true),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
