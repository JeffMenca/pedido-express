enum Channel {
  mostrador('MOSTRADOR', 'Mostrador'),
  kiosko('KIOSKO', 'Kiosko'),
  autoservicio('AUTOSERVICIO', 'Autoservicio'),
  domicilio('DOMICILIO', 'A domicilio');

  const Channel(this.api, this.label);
  final String api;
  final String label;
}

enum PaymentMethod {
  tarjeta('TARJETA', 'Tarjeta'),
  efectivo('EFECTIVO', 'Efectivo en caja');

  const PaymentMethod(this.api, this.label);
  final String api;
  final String label;

  static PaymentMethod fromApi(String value) =>
      values.firstWhere((m) => m.api == value, orElse: () => tarjeta);
}

enum ItemType {
  product('PRODUCT'),
  combo('COMBO');

  const ItemType(this.api);
  final String api;
}

class CartLine {
  const CartLine({
    required this.id,
    required this.type,
    required this.sku,
    required this.name,
    required this.quantity,
    this.upgradeLarge = false,
    this.modifierCodes = const [],
    this.modifierNames = const [],
  });

  final String id;
  final ItemType type;
  final String sku;
  final String name;
  final int quantity;
  final bool upgradeLarge;
  final List<String> modifierCodes;
  final List<String> modifierNames;

  CartLine copyWith({int? quantity}) => CartLine(
    id: id,
    type: type,
    sku: sku,
    name: name,
    quantity: quantity ?? this.quantity,
    upgradeLarge: upgradeLarge,
    modifierCodes: modifierCodes,
    modifierNames: modifierNames,
  );

  Map<String, dynamic> toJson() => {
    'type': type.api,
    'sku': sku,
    'quantity': quantity,
    if (type == ItemType.combo) 'upgradeLarge': upgradeLarge,
    if (modifierCodes.isNotEmpty) 'modifiers': modifierCodes,
  };
}

class CartState {
  const CartState({
    this.lines = const [],
    this.channel = Channel.mostrador,
    this.couponCode,
  });

  final List<CartLine> lines;
  final Channel channel;
  final String? couponCode;

  int get itemCount => lines.fold(0, (sum, l) => sum + l.quantity);
  bool get isEmpty => lines.isEmpty;

  CartState copyWith({
    List<CartLine>? lines,
    Channel? channel,
    String? Function()? couponCode,
  }) => CartState(
    lines: lines ?? this.lines,
    channel: channel ?? this.channel,
    couponCode: couponCode != null ? couponCode() : this.couponCode,
  );

  /// Body for POST /orders/quote; also the base of POST /orders.
  Map<String, dynamic> toQuoteJson() => {
    'channel': channel.api,
    'items': [for (final l in lines) l.toJson()],
    if (couponCode != null && couponCode!.isNotEmpty) 'couponCode': couponCode,
  };
}
