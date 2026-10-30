import 'dart:async';

import 'package:app_cliente/core/theme/app_theme.dart';

Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  // Fonts are fetched at runtime in the app; tests use the default font.
  AppFonts.useGoogleFonts = false;
  await testMain();
}
