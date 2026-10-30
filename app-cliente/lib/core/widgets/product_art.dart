import 'package:flutter_svg/flutter_svg.dart';
import 'package:material_ui/material_ui.dart';

import '../theme/app_theme.dart';

abstract final class Illustrations {
  static const _dir = 'assets/illustrations';
  static const _products = {
    'P-001',
    'P-002',
    'P-003',
    'P-004',
    'P-005',
    'P-006',
    'P-007',
    'P-008',
    'C-001',
    'C-002',
    'C-003',
  };
  static const _modifiers = {'M-01', 'M-02', 'M-03', 'M-05'};

  static const fallback = '$_dir/fallback.svg';

  /// Asset for a product or combo SKU; unknown SKUs get the paper bag.
  static String forSku(String sku) =>
      _products.contains(sku) ? '$_dir/$sku.svg' : fallback;

  static String? forModifier(String code) =>
      _modifiers.contains(code) ? '$_dir/$code.svg' : null;

  static String scene(String name) => '$_dir/$name.svg';
}

/// Brand illustration for a SKU. Falls back to the paper bag when the asset
/// is missing or fails to parse.
class ProductArt extends StatelessWidget {
  const ProductArt(this.sku, {super.key, this.size});

  final String sku;
  final double? size;

  @override
  Widget build(BuildContext context) =>
      SvgArt(Illustrations.forSku(sku), size: size);
}

class SvgArt extends StatelessWidget {
  const SvgArt(this.asset, {super.key, this.size, this.fit = BoxFit.contain});

  final String asset;
  final double? size;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      asset,
      width: size,
      height: size,
      fit: fit,
      excludeFromSemantics: true,
      placeholderBuilder: (_) => SizedBox(width: size, height: size),
      errorBuilder: (_, _, _) => asset == Illustrations.fallback
          ? SizedBox(width: size, height: size)
          : SvgArt(Illustrations.fallback, size: size, fit: fit),
    );
  }
}

/// Illustration sitting on its category tint, used for thumbnails.
class ArtTile extends StatelessWidget {
  const ArtTile({
    super.key,
    required this.sku,
    required this.tint,
    this.size = 56,
    this.radius = AppRadii.control,
    this.circle = false,
    this.border,
  });

  final String sku;
  final Color tint;
  final double size;
  final double radius;
  final bool circle;
  final BoxBorder? border;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(size * 0.1),
      decoration: BoxDecoration(
        color: tint,
        shape: circle ? BoxShape.circle : BoxShape.rectangle,
        borderRadius: circle ? null : BorderRadius.circular(radius),
        border: border,
      ),
      child: ProductArt(sku),
    );
  }
}
