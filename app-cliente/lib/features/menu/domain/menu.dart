class Product {
  const Product({
    required this.sku,
    required this.name,
    required this.priceCents,
    required this.categoryCode,
  });

  final String sku;
  final String name;
  final int priceCents;
  final String categoryCode;
}

class Category {
  const Category({
    required this.code,
    required this.name,
    required this.products,
  });

  final String code;
  final String name;
  final List<Product> products;

  factory Category.fromJson(Map<String, dynamic> json) {
    final code = json['code'] as String;
    return Category(
      code: code,
      name: json['name'] as String,
      products: [
        for (final p in json['products'] as List)
          Product(
            sku: p['sku'] as String,
            name: p['name'] as String,
            priceCents: p['priceCents'] as int,
            categoryCode: code,
          ),
      ],
    );
  }
}

class ComboUpgrade {
  const ComboUpgrade({required this.priceCents, required this.includes});

  final int priceCents;
  final List<String> includes;
}

class Combo {
  const Combo({
    required this.sku,
    required this.name,
    required this.priceCents,
    required this.mainCategory,
    required this.includes,
    this.upgrade,
  });

  final String sku;
  final String name;
  final int priceCents;
  final String mainCategory;
  final List<String> includes;
  final ComboUpgrade? upgrade;

  factory Combo.fromJson(Map<String, dynamic> json) {
    final upgrade = json['upgrade'] as Map<String, dynamic>?;
    return Combo(
      sku: json['sku'] as String,
      name: json['name'] as String,
      priceCents: json['priceCents'] as int,
      mainCategory: json['mainCategory'] as String,
      includes: List<String>.from(json['includes'] as List? ?? const []),
      upgrade: upgrade == null
          ? null
          : ComboUpgrade(
              priceCents: upgrade['priceCents'] as int,
              includes: List<String>.from(
                upgrade['includes'] as List? ?? const [],
              ),
            ),
    );
  }
}

class Modifier {
  const Modifier({
    required this.code,
    required this.name,
    required this.priceCents,
    required this.appliesTo,
  });

  final String code;
  final String name;
  final int priceCents;
  final List<String> appliesTo;

  factory Modifier.fromJson(Map<String, dynamic> json) => Modifier(
    code: json['code'] as String,
    name: json['name'] as String,
    priceCents: json['priceCents'] as int,
    appliesTo: List<String>.from(json['appliesTo'] as List? ?? const []),
  );
}

enum PromotionType { porcentaje, monto }

class Promotion {
  const Promotion({
    required this.code,
    required this.type,
    required this.value,
    required this.minimumCents,
    this.validTo,
  });

  final String code;
  final PromotionType type;

  /// Basis points for PORCENTAJE (1500 = 15 %), cents for MONTO.
  final int value;
  final int minimumCents;
  final String? validTo;

  factory Promotion.fromJson(Map<String, dynamic> json) => Promotion(
    code: json['code'] as String,
    type: json['type'] == 'MONTO'
        ? PromotionType.monto
        : PromotionType.porcentaje,
    value: json['value'] as int,
    minimumCents: json['minimumCents'] as int? ?? 0,
    validTo: json['validTo'] as String?,
  );
}

class Menu {
  const Menu({
    required this.categories,
    required this.combos,
    required this.modifiers,
    this.promotions = const [],
  });

  static const combosCode = 'COMBOS';

  final List<Category> categories;
  final List<Combo> combos;
  final List<Modifier> modifiers;
  final List<Promotion> promotions;

  factory Menu.fromJson(Map<String, dynamic> json) => Menu(
    categories: [
      for (final c in json['categories'] as List)
        Category.fromJson(c as Map<String, dynamic>),
    ],
    combos: [
      for (final c in json['combos'] as List)
        Combo.fromJson(c as Map<String, dynamic>),
    ],
    modifiers: [
      for (final m in json['modifiers'] as List)
        Modifier.fromJson(m as Map<String, dynamic>),
    ],
    promotions: [
      for (final p in json['promotions'] as List? ?? const [])
        Promotion.fromJson(p as Map<String, dynamic>),
    ],
  );

  Product? productBySku(String sku) {
    for (final c in categories) {
      for (final p in c.products) {
        if (p.sku == sku) return p;
      }
    }
    return null;
  }

  Combo? comboBySku(String sku) {
    for (final c in combos) {
      if (c.sku == sku) return c;
    }
    return null;
  }

  /// SKU of a product by display name; combos list their parts by name.
  String? skuForName(String name) {
    final needle = name.trim().toLowerCase();
    for (final c in categories) {
      for (final p in c.products) {
        if (p.name.trim().toLowerCase() == needle) return p.sku;
      }
    }
    return null;
  }

  /// Modifiers only apply when their `appliesTo` includes the category.
  List<Modifier> modifiersFor(String categoryCode) => [
    for (final m in modifiers)
      if (m.appliesTo.contains(categoryCode)) m,
  ];

  bool get isEmpty =>
      combos.isEmpty && categories.every((c) => c.products.isEmpty);
}
