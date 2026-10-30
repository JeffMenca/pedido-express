import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

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
        ),
      ],
    );
  }

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

/// Server-computed quote for the current cart; null when the cart is empty.
final quoteProvider = FutureProvider.autoDispose<Quote?>((ref) async {
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

  return ref
      .read(ordersRepositoryProvider)
      .quote(cart.toQuoteJson(), cancelToken: cancelToken);
});
