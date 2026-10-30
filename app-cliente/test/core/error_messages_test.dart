import 'package:app_cliente/core/errors/api_exception.dart';
import 'package:app_cliente/core/errors/error_messages.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('messageForCode', () {
    test('maps known API codes to actionable Spanish messages', () {
      expect(messageForCode('COUPON_EXPIRED'), 'El cupón ya venció.');
      expect(
        messageForCode('PAYMENT_METHOD_NOT_ALLOWED'),
        contains('A domicilio solo se paga con tarjeta'),
      );
    });

    test('falls back to a generic message for unknown codes', () {
      expect(
        messageForCode('SOMETHING_NEW'),
        'Ocurrió un error inesperado. Intenta de nuevo.',
      );
    });

    test('decline codes produce a retry hint', () {
      expect(
        declineMessage('INSUFFICIENT_FUNDS'),
        contains('fondos insuficientes'),
      );
      expect(declineMessage(null), contains('Intenta con otra tarjeta'));
    });
  });

  group('ApiException.from', () {
    final request = RequestOptions(path: '/orders');

    test('reads the API error envelope', () {
      final error = ApiException.from(
        DioException(
          requestOptions: request,
          type: DioExceptionType.badResponse,
          response: Response(
            requestOptions: request,
            statusCode: 422,
            data: {'code': 'COUPON_NOT_FOUND', 'message': 'x', 'details': {}},
          ),
        ),
      );
      expect(error.code, 'COUPON_NOT_FOUND');
      expect(error.statusCode, 422);
      expect(error.isUncertain, isFalse);
      expect(error.userMessage, 'El cupón no existe. Revisa el código.');
    });

    test('treats timeouts and connection errors as uncertain', () {
      final timeout = ApiException.from(
        DioException(
          requestOptions: request,
          type: DioExceptionType.receiveTimeout,
        ),
      );
      final offline = ApiException.from(
        DioException(
          requestOptions: request,
          type: DioExceptionType.connectionError,
        ),
      );
      expect(timeout.code, ApiException.timeout);
      expect(timeout.isUncertain, isTrue);
      expect(offline.code, ApiException.networkError);
      expect(offline.isUncertain, isTrue);
    });
  });
}
