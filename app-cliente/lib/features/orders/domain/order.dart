import '../../cart/domain/cart.dart';

class QuoteModifier {
  const QuoteModifier({required this.code, required this.name});

  final String code;
  final String name;
}

class QuoteLine {
  const QuoteLine({
    required this.sku,
    required this.name,
    required this.quantity,
    required this.unitPriceCents,
    required this.upgradeLarge,
    required this.modifiers,
    required this.lineTotalCents,
  });

  final String sku;
  final String name;
  final int quantity;
  final int unitPriceCents;
  final bool upgradeLarge;
  final List<QuoteModifier> modifiers;
  final int lineTotalCents;

  factory QuoteLine.fromJson(Map<String, dynamic> json) => QuoteLine(
    sku: json['sku'] as String,
    name: json['name'] as String,
    quantity: json['quantity'] as int,
    unitPriceCents: json['unitPriceCents'] as int,
    upgradeLarge: json['upgradeLarge'] as bool? ?? false,
    modifiers: [
      for (final m in json['modifiers'] as List? ?? const [])
        QuoteModifier(code: m['code'] as String, name: m['name'] as String),
    ],
    lineTotalCents: json['lineTotalCents'] as int,
  );
}

class Quote {
  const Quote({
    required this.lines,
    required this.subtotalCents,
    required this.discountCents,
    required this.couponCode,
    required this.deliveryFeeCents,
    required this.totalCents,
    required this.taxBaseCents,
    required this.taxCents,
  });

  final List<QuoteLine> lines;
  final int subtotalCents;
  final int discountCents;
  final String? couponCode;
  final int deliveryFeeCents;
  final int totalCents;
  final int taxBaseCents;
  final int taxCents;

  factory Quote.fromJson(Map<String, dynamic> json) => Quote(
    lines: [
      for (final l in json['lines'] as List)
        QuoteLine.fromJson(l as Map<String, dynamic>),
    ],
    subtotalCents: json['subtotalCents'] as int,
    discountCents: json['discountCents'] as int,
    couponCode: (json['coupon'] as Map?)?['code'] as String?,
    deliveryFeeCents: json['deliveryFeeCents'] as int,
    totalCents: json['totalCents'] as int,
    taxBaseCents: json['taxBaseCents'] as int,
    taxCents: json['taxCents'] as int,
  );
}

enum OrderStatus {
  pendientePago('PENDIENTE_PAGO'),
  pagoEnVerificacion('PAGO_EN_VERIFICACION'),
  pagada('PAGADA'),
  pagoRechazado('PAGO_RECHAZADO'),
  enPreparacion('EN_PREPARACION'),
  lista('LISTA'),
  entregada('ENTREGADA'),
  cancelada('CANCELADA'),
  expirada('EXPIRADA');

  const OrderStatus(this.api);
  final String api;

  static OrderStatus fromApi(String value) =>
      values.firstWhere((s) => s.api == value, orElse: () => pendientePago);

  bool get isTerminal =>
      this == entregada || this == cancelada || this == expirada;
}

class Refund {
  const Refund({required this.status, required this.amountCents});

  final String status;
  final int amountCents;
}

class PaymentInfo {
  const PaymentInfo({required this.status, this.last4, this.declineCode});

  final String status;
  final String? last4;
  final String? declineCode;

  factory PaymentInfo.fromJson(Map<String, dynamic> json) => PaymentInfo(
    status: json['status'] as String,
    last4: json['last4'] as String?,
    declineCode: json['declineCode'] as String?,
  );
}

class Order {
  const Order({
    required this.id,
    required this.code,
    required this.channel,
    required this.paymentMethod,
    required this.status,
    required this.quote,
    this.payment,
    this.refund,
  });

  final String id;
  final String code;
  final String channel;
  final PaymentMethod paymentMethod;
  final OrderStatus status;
  final Quote quote;
  final PaymentInfo? payment;
  final Refund? refund;

  factory Order.fromJson(Map<String, dynamic> json) {
    final payment = json['payment'] as Map<String, dynamic>?;
    final refund = json['refund'] as Map<String, dynamic>?;
    return Order(
      id: json['id'] as String,
      code: json['code'] as String,
      channel: json['channel'] as String,
      paymentMethod: PaymentMethod.fromApi(json['paymentMethod'] as String),
      status: OrderStatus.fromApi(json['status'] as String),
      quote: Quote.fromJson(json),
      payment: payment == null ? null : PaymentInfo.fromJson(payment),
      refund: refund == null
          ? null
          : Refund(
              status: refund['status'] as String,
              amountCents: refund['amountCents'] as int,
            ),
    );
  }
}

class CardPaymentResult {
  const CardPaymentResult({required this.status, this.payment});

  final OrderStatus status;
  final PaymentInfo? payment;

  factory CardPaymentResult.fromJson(Map<String, dynamic> json) {
    final payment = json['payment'] as Map<String, dynamic>?;
    return CardPaymentResult(
      status: OrderStatus.fromApi(json['status'] as String),
      payment: payment == null ? null : PaymentInfo.fromJson(payment),
    );
  }
}

class CardInput {
  const CardInput({required this.number, required this.exp, required this.cvv});

  final String number;
  final String exp;
  final String cvv;

  Map<String, dynamic> toJson() => {
    'card': {'number': number, 'exp': exp, 'cvv': cvv},
  };
}
