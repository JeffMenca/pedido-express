import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import '../../features/cart/presentation/cart_screen.dart';
import '../../features/menu/presentation/menu_screen.dart';
import '../../features/orders/presentation/card_payment_screen.dart';
import '../../features/orders/presentation/checkout_screen.dart';
import '../../features/orders/presentation/tracking_screen.dart';
import '../theme/app_theme.dart';

CustomTransitionPage<void> _page(GoRouterState state, Widget child) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: AppMotion.enter,
    reverseTransitionDuration: AppMotion.exit,
    transitionsBuilder: (context, animation, _, child) {
      final curved = CurvedAnimation(parent: animation, curve: AppMotion.curve);
      return FadeTransition(
        opacity: curved,
        child: SlideTransition(
          position: Tween(
            begin: const Offset(0, 0.02),
            end: Offset.zero,
          ).animate(curved),
          child: child,
        ),
      );
    },
  );
}

GoRouter buildRouter() => GoRouter(
  routes: [
    GoRoute(
      path: '/',
      pageBuilder: (_, state) => _page(state, const MenuScreen()),
    ),
    GoRoute(
      path: '/cart',
      pageBuilder: (_, state) => _page(state, const CartScreen()),
    ),
    GoRoute(
      path: '/checkout',
      pageBuilder: (_, state) => _page(state, const CheckoutScreen()),
    ),
    GoRoute(
      path: '/orders/:id',
      pageBuilder: (_, state) =>
          _page(state, TrackingScreen(orderId: state.pathParameters['id']!)),
      routes: [
        GoRoute(
          path: 'pay',
          pageBuilder: (_, state) => _page(
            state,
            CardPaymentScreen(orderId: state.pathParameters['id']!),
          ),
        ),
      ],
    ),
  ],
);
