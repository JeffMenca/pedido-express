import 'package:dio/dio.dart';

import 'error_messages.dart';

class ApiException implements Exception {
  const ApiException({
    required this.code,
    this.message,
    this.statusCode,
    this.details,
  });

  static const networkError = 'NETWORK_ERROR';
  static const timeout = 'TIMEOUT';
  static const unknown = 'UNKNOWN';

  final String code;
  final String? message;
  final int? statusCode;
  final Object? details;

  /// True when the request may or may not have reached the server, so the
  /// same idempotency key must be reused on retry.
  bool get isUncertain => code == networkError || code == timeout;

  String get userMessage => messageForCode(code);

  factory ApiException.from(Object error) {
    if (error is ApiException) return error;
    if (error is DioException) {
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return const ApiException(code: timeout);
        case DioExceptionType.connectionError:
          return const ApiException(code: networkError);
        default:
          break;
      }
      final data = error.response?.data;
      final status = error.response?.statusCode;
      if (data is Map && data['code'] is String) {
        return ApiException(
          code: data['code'] as String,
          message: data['message']?.toString(),
          statusCode: status,
          details: data['details'],
        );
      }
      if (error.response == null) {
        return const ApiException(code: networkError);
      }
      return ApiException(code: unknown, statusCode: status);
    }
    return const ApiException(code: unknown);
  }

  @override
  String toString() => 'ApiException($code, $statusCode, $message)';
}
