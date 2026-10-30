import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/http/api_client.dart';
import '../domain/order.dart';

abstract interface class OrdersRepository {
  Future<Quote> quote(Map<String, dynamic> body, {CancelToken? cancelToken});

  Future<Order> createOrder(Map<String, dynamic> body, String idempotencyKey);

  Future<Order> getOrder(String id);

  Future<CardPaymentResult> payWithCard(
    String orderId,
    CardInput card,
    String idempotencyKey,
  );
}

class HttpOrdersRepository implements OrdersRepository {
  HttpOrdersRepository(this._dio);

  final Dio _dio;

  Future<T> _guard<T>(Future<T> Function() call) async {
    try {
      return await call();
    } catch (e) {
      throw ApiException.from(e);
    }
  }

  Options _idempotent(String key) => Options(headers: {'Idempotency-Key': key});

  @override
  Future<Quote> quote(Map<String, dynamic> body, {CancelToken? cancelToken}) =>
      _guard(() async {
        final res = await _dio.post<Map<String, dynamic>>(
          '/orders/quote',
          data: body,
          cancelToken: cancelToken,
        );
        return Quote.fromJson(res.data!);
      });

  @override
  Future<Order> createOrder(Map<String, dynamic> body, String idempotencyKey) =>
      _guard(() async {
        final res = await _dio.post<Map<String, dynamic>>(
          '/orders',
          data: body,
          options: _idempotent(idempotencyKey),
        );
        return Order.fromJson(res.data!);
      });

  @override
  Future<Order> getOrder(String id) => _guard(() async {
    final res = await _dio.get<Map<String, dynamic>>('/orders/$id');
    return Order.fromJson(res.data!);
  });

  @override
  Future<CardPaymentResult> payWithCard(
    String orderId,
    CardInput card,
    String idempotencyKey,
  ) => _guard(() async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/orders/$orderId/payments/card',
      data: card.toJson(),
      options: _idempotent(idempotencyKey),
    );
    return CardPaymentResult.fromJson(res.data!);
  });
}

final ordersRepositoryProvider = Provider<OrdersRepository>(
  (ref) => HttpOrdersRepository(ref.watch(dioProvider)),
);
