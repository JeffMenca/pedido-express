import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/errors/api_exception.dart';
import '../data/orders_repository.dart';
import '../domain/order.dart';

const _uuid = Uuid();

/// Creates orders with one idempotency key per checkout. The key is kept
/// across retries of the same body and only rotated when the body changes or
/// an order was created, so a double tap or a lost response never duplicates.
class CheckoutController extends Notifier<AsyncValue<Order?>> {
  String? _key;
  String? _keyBody;

  @override
  AsyncValue<Order?> build() => const AsyncData(null);

  Future<Order?> submit(Map<String, dynamic> body) async {
    if (state.isLoading) return null;
    final encoded = jsonEncode(body);
    if (_key == null || _keyBody != encoded) {
      _key = _uuid.v4();
      _keyBody = encoded;
    }
    state = const AsyncLoading();
    try {
      final order = await ref
          .read(ordersRepositoryProvider)
          .createOrder(body, _key!);
      _key = null;
      _keyBody = null;
      state = AsyncData(order);
      return order;
    } catch (e, st) {
      state = AsyncError(ApiException.from(e), st);
      return null;
    }
  }

  void reset() => state = const AsyncData(null);
}

final checkoutControllerProvider =
    NotifierProvider<CheckoutController, AsyncValue<Order?>>(
      CheckoutController.new,
    );

sealed class PaymentOutcome {
  const PaymentOutcome();
}

/// Payment accepted or still being resolved: the tracking screen takes over.
class PaymentTrack extends PaymentOutcome {
  const PaymentTrack();
}

class PaymentDeclined extends PaymentOutcome {
  const PaymentDeclined(this.declineCode);
  final String? declineCode;
}

class PaymentFailed extends PaymentOutcome {
  const PaymentFailed(this.error);
  final ApiException error;
}

class PaymentState {
  const PaymentState({this.submitting = false, this.outcome});

  final bool submitting;
  final PaymentOutcome? outcome;
}

/// One key per card attempt: reused when the outcome is uncertain (network
/// error, timeout, double tap), rotated after a decline or when the card
/// data changes.
class PaymentController extends Notifier<PaymentState> {
  String? _key;

  @override
  PaymentState build() => const PaymentState();

  void cardChanged() {
    if (!state.submitting) _key = null;
  }

  Future<PaymentOutcome?> pay(String orderId, CardInput card) async {
    if (state.submitting) return null;
    _key ??= _uuid.v4();
    state = const PaymentState(submitting: true);
    PaymentOutcome outcome;
    try {
      final result = await ref
          .read(ordersRepositoryProvider)
          .payWithCard(orderId, card, _key!);
      if (result.status == OrderStatus.pagoRechazado) {
        _key = null;
        outcome = PaymentDeclined(result.payment?.declineCode);
      } else {
        outcome = const PaymentTrack();
      }
    } catch (e) {
      final error = ApiException.from(e);
      outcome = switch (error.code) {
        'PAYMENT_ALREADY_IN_PROGRESS' ||
        'PAYMENT_VERIFICATION_PENDING' ||
        'INVALID_STATE_TRANSITION' => const PaymentTrack(),
        _ => PaymentFailed(error),
      };
      if (!error.isUncertain && outcome is PaymentFailed) _key = null;
    }
    if (!ref.mounted) return outcome;
    state = PaymentState(outcome: outcome);
    return outcome;
  }
}

final paymentControllerProvider =
    NotifierProvider.autoDispose<PaymentController, PaymentState>(
      PaymentController.new,
    );

const trackingInterval = Duration(seconds: 3);

/// Polls the order every 3 s until it reaches a terminal state. Transient
/// failures after the first load keep the last known order on screen.
final orderTrackingProvider = StreamProvider.autoDispose.family<Order, String>((
  ref,
  id,
) async* {
  final repo = ref.read(ordersRepositoryProvider);
  var disposed = false;
  ref.onDispose(() => disposed = true);
  Order? last;
  while (!disposed) {
    try {
      last = await repo.getOrder(id);
      if (disposed) return;
      yield last;
      if (last.status.isTerminal) return;
    } catch (e) {
      if (last == null) rethrow;
    }
    await Future<void>.delayed(trackingInterval);
  }
});
