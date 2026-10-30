import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:3000/api',
);

final dioProvider = Provider<Dio>((ref) {
  return Dio(
    BaseOptions(
      baseUrl: apiUrl,
      connectTimeout: const Duration(seconds: 10),
      // Card payments may wait for the API's 5 s gateway timeout plus overhead.
      receiveTimeout: const Duration(seconds: 20),
      contentType: Headers.jsonContentType,
      responseType: ResponseType.json,
    ),
  );
});
