import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../features/cart/presentation/cart_screen.dart';
import '../../features/menu/presentation/menu_screen.dart';
import '../../features/menu/presentation/product_detail_screen.dart';
import '../../features/orders/presentation/card_payment_screen.dart';
import '../../features/orders/presentation/checkout_screen.dart';
import '../../features/orders/presentation/tracking_screen.dart';
import '../theme/app_theme.dart';

/// Fade-through: the outgoing page fades out first, then the incoming one
/// fades in while scaling up from 0.94. Opacity only under reduced motion.
CustomTransitionPage<T> _page<T>(GoRouterState state, Widget child) {
  return CustomTransitionPage<T>(
    key: state.pageKey,
    child: child,
    transitionDuration: const Duration(milliseconds: 300),
    reverseTransitionDuration: const Duration(milliseconds: 220),
    transitionsBuilder: (context, animation, secondary, child) {
      final reduced = AppMotion.reduced(context);
      final incoming = CurvedAnimation(
        parent: animation,
        curve: const Interval(0.3, 1, curve: AppMotion.curve),
      );
      final outgoing = CurvedAnimation(
        parent: secondary,
        curve: const Interval(0, 0.35, curve: Curves.easeOut),
      );
      Widget page = FadeTransition(opacity: incoming, child: child);
      if (!reduced) {
        page = ScaleTransition(
          scale: Tween(begin: 0.94, end: 1.0).animate(incoming),
          child: page,
        );
      }
      return FadeTransition(
        opacity: Tween(begin: 1.0, end: 0.0).animate(outgoing),
        child: page,
      );
    },
  );
}

/// The detail page keeps the menu visible underneath while the Hero tint
/// expands, so it only fades its own content in.
CustomTransitionPage<T> _detailPage<T>(GoRouterState state, Widget child) {
  return CustomTransitionPage<T>(
    key: state.pageKey,
    child: child,
    transitionDuration: const Duration(milliseconds: 380),
    reverseTransitionDuration: const Duration(milliseconds: 300),
    transitionsBuilder: (context, animation, _, child) => FadeTransition(
      opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
      child: child,
    ),
  );
}

GoRouter buildRouter() => GoRouter(
  routes: [
    GoRoute(
      path: '/',
      pageBuilder: (_, state) => _page<void>(state, const MenuScreen()),
    ),
    GoRoute(
      path: '/product/:sku',
      pageBuilder: (_, state) => _detailPage<Object?>(
        state,
        ProductDetailScreen(sku: state.pathParameters['sku']!),
      ),
    ),
    GoRoute(
      path: '/cart',
      pageBuilder: (_, state) => _page<void>(state, const CartScreen()),
    ),
    GoRoute(
      path: '/checkout',
      pageBuilder: (_, state) => _page<void>(state, const CheckoutScreen()),
    ),
    GoRoute(
      path: '/orders/:id',
      pageBuilder: (_, state) => _page<void>(
        state,
        TrackingScreen(orderId: state.pathParameters['id']!),
      ),
      routes: [
        GoRoute(
          path: 'pay',
          pageBuilder: (_, state) => _page<void>(
            state,
            CardPaymentScreen(orderId: state.pathParameters['id']!),
          ),
        ),
      ],
    ),
  ],
);
