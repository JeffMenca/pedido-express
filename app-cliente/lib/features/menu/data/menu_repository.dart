import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/http/api_client.dart';
import '../domain/menu.dart';

abstract interface class MenuRepository {
  Future<Menu> fetchMenu();
}

class HttpMenuRepository implements MenuRepository {
  HttpMenuRepository(this._dio);

  final Dio _dio;

  @override
  Future<Menu> fetchMenu() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/menu');
      return Menu.fromJson(res.data!);
    } catch (e) {
      throw ApiException.from(e);
    }
  }
}

final menuRepositoryProvider = Provider<MenuRepository>(
  (ref) => HttpMenuRepository(ref.watch(dioProvider)),
);

final menuProvider = FutureProvider<Menu>(
  (ref) => ref.watch(menuRepositoryProvider).fetchMenu(),
);
