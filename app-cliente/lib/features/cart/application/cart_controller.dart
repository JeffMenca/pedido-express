import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/errors/api_exception.dart';
import '../../orders/data/orders_repository.dart';
import '../../orders/domain/order.dart';
import '../domain/cart.dart';

const _uuid = Uuid();

class CartController extends Notifier<CartState> {
  @override
  CartState build() => const CartState();

  void add({
    required ItemType type,
    required String sku,
    required String name,
    required int quantity,
    bool upgradeLarge = false,
    List<String> modifierCodes = const [],
    List<String> modifierNames = const [],
    String? categoryCode,
  }) {
    state = state.copyWith(
      lines: [
        ...state.lines,
        CartLine(
          id: _uuid.v4(),
          type: type,
          sku: sku,
          name: name,
          quantity: quantity,
          upgradeLarge: upgradeLarge,
          modifierCodes: modifierCodes,
          modifierNames: modifierNames,
          categoryCode: categoryCode,
        ),
      ],
    );
  }

  void addDraft(LineDraft d) => add(
    type: d.type,
    sku: d.sku,
    name: d.name,
    quantity: d.quantity,
    upgradeLarge: d.upgradeLarge,
    modifierCodes: d.modifierCodes,
    modifierNames: d.modifierNames,
    categoryCode: d.categoryCode,
  );

  void setQuantity(String lineId, int quantity) {
    state = state.copyWith(
      lines: [
        for (final l in state.lines)
          l.id == lineId ? l.copyWith(quantity: quantity) : l,
      ],
    );
  }

  void remove(String lineId) {
    state = state.copyWith(
      lines: [
        for (final l in state.lines)
          if (l.id != lineId) l,
      ],
    );
  }

  void setChannel(Channel channel) => state = state.copyWith(channel: channel);

  void setCoupon(String? code) {
    final normalized = code?.trim().toUpperCase();
    state = state.copyWith(
      couponCode: () =>
          normalized == null || normalized.isEmpty ? null : normalized,
    );
  }

  void clear() => state = const CartState();
}

final cartProvider = NotifierProvider<CartController, CartState>(
  CartController.new,
);

const quoteDebounce = Duration(milliseconds: 350);

/// Why the selected coupon is not part of the current quote.
class CouponNotice {
  const CouponNotice({
    required this.code,
    required this.errorCode,
    this.minimumCents,
    this.subtotalCents,
  });

  final String code;
  final String errorCode;
  final int? minimumCents;
  final int? subtotalCents;

  int? get missingCents => minimumCents != null && subtotalCents != null
      ? minimumCents! - subtotalCents!
      : null;
}

/// Quote plus the state of the selected coupon. An invalid coupon never
/// blocks the cart: the order is priced without it and the notice explains why.
class CartQuote {
  const CartQuote(this.quote, {this.couponNotice});

  final Quote quote;
  final CouponNotice? couponNotice;

  bool get couponApplied => quote.couponCode != null;
}

/// Server-computed quote for the current cart; null when the cart is empty.
final quoteProvider = FutureProvider.autoDispose<CartQuote?>((ref) async {
  final cart = ref.watch(cartProvider);
  if (cart.isEmpty) return null;

  final cancelToken = CancelToken();
  var disposed = false;
  ref.onDispose(() {
    disposed = true;
    cancelToken.cancel();
  });

  await Future<void>.delayed(quoteDebounce);
  if (disposed) throw StateError('superseded');

  final repository = ref.read(ordersRepositoryProvider);
  try {
    return CartQuote(
      await repository.quote(cart.toQuoteJson(), cancelToken: cancelToken),
    );
  } catch (error) {
    final api = ApiException.from(error);
    if (cart.couponCode == null || !api.code.startsWith('COUPON_')) rethrow;
    final details = api.details is Map ? api.details! as Map : const {};
    final withoutCoupon = await repository.quote(
      cart.toQuoteJson(includeCoupon: false),
      cancelToken: cancelToken,
    );
    return CartQuote(
      withoutCoupon,
      couponNotice: CouponNotice(
        code: cart.couponCode!,
        errorCode: api.code,
        minimumCents: (details['minimumCents'] as num?)?.toInt(),
        subtotalCents: withoutCoupon.subtotalCents,
      ),
    );
  }
});

/// API price for a single line being configured, so the detail page never
/// computes totals itself. Keyed by the encoded line body.
final lineQuoteProvider = FutureProvider.autoDispose.family<int, String>((
  ref,
  encodedLine,
) async {
  final cancelToken = CancelToken();
  var disposed = false;
  ref.onDispose(() {
    disposed = true;
    cancelToken.cancel();
  });
  await Future<void>.delayed(const Duration(milliseconds: 200));
  if (disposed) throw StateError('superseded');
  final quote = await ref.read(ordersRepositoryProvider).quote({
    'channel': Channel.mostrador.api,
    'items': [jsonDecode(encodedLine)],
  }, cancelToken: cancelToken);
  return quote.lines.first.lineTotalCents;
});
