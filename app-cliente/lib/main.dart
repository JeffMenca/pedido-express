import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/dev/dev_tools.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

void main() {
  // Retries are explicit (buttons, polling); automatic ones would replay
  // business errors such as an invalid coupon.
  runApp(
    AppRestarter(
      builder: (_) =>
          ProviderScope(retry: (_, _) => null, child: const PedidoExpressApp()),
    ),
  );
}

class PedidoExpressApp extends StatefulWidget {
  const PedidoExpressApp({super.key});

  @override
  State<PedidoExpressApp> createState() => _PedidoExpressAppState();
}

class _PedidoExpressAppState extends State<PedidoExpressApp> {
  late final GoRouter _router = buildRouter();

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: showPerformanceOverlay,
      builder: (context, performanceOverlay, _) => MaterialApp.router(
        title: 'Pedido Express',
        showPerformanceOverlay: performanceOverlay,
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        routerConfig: _router,
        // Tapping outside a field dismisses the keyboard; numeric pads on iOS
        // have no return key.
        builder: (context, child) => DevToolsOverlay(
          child: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
            child: child,
          ),
        ),
      ),
    );
  }
}
