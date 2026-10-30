import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/errors/error_messages.dart';
import '../../../core/format/money.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/pressable_scale.dart';
import '../../../core/widgets/product_art.dart';
import '../../../core/widgets/shimmer.dart';
import '../../../core/widgets/ticket_card.dart';
import '../../cart/domain/cart.dart';
import '../../cart/presentation/quote_summary.dart';
import '../application/order_controllers.dart';
import '../domain/order.dart';

class TrackingScreen extends ConsumerWidget {
  const TrackingScreen({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = orderTrackingProvider(orderId);
    ref.listen(provider, (prev, next) {
      final before = prev?.value?.status;
      final now = next.value?.status;
      if (now == OrderStatus.lista && before != OrderStatus.lista) {
        HapticFeedback.lightImpact();
      }
    });
    final order = ref.watch(provider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Seguimiento'),
        leading: IconButton(
          tooltip: 'Volver al menú',
          icon: const Icon(Icons.close),
          onPressed: () => context.go('/'),
        ),
      ),
      body: order.when(
        skipLoadingOnReload: true,
        skipLoadingOnRefresh: true,
        loading: () => const _TrackingSkeleton(),
        error: (e, _) =>
            ErrorView(error: e, onRetry: () => ref.invalidate(provider)),
        data: (order) => _TrackingBody(order: order),
      ),
    );
  }
}

class _TrackingBody extends StatelessWidget {
  const _TrackingBody({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.textTheme.bodySmall?.copyWith(color: AppColors.humo);
    final header = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('COMANDA', style: muted?.copyWith(letterSpacing: 1.5)),
        Text(
          order.code,
          style: AppFonts.mono(
            theme.textTheme.headlineMedium?.copyWith(
              fontSize: 40,
              fontWeight: FontWeight.w700,
              height: 1.1,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          [
            _channelLabel(order.channel),
            order.paymentMethod.label,
            if (order.payment?.last4 != null) '•••• ${order.payment!.last4}',
          ].join(' · '),
          style: muted,
        ),
      ],
    );
    final children = <Widget>[
      _SceneCard(order: order),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
        decoration: BoxDecoration(
          color: AppColors.ticket,
          borderRadius: BorderRadius.circular(AppRadii.card),
        ),
        child: StatusTimeline(status: order.status),
      ),
      const SizedBox(height: 12),
      PrintIn(
        child: QuoteSummary(
          quote: order.quote,
          header: header,
          statusColor: statusColor(order.status),
        ),
      ),
    ];
    final reduced = AppMotion.reduced(context);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: reduced
          ? children
          : children
                .animate(interval: 35.ms)
                .fadeIn(duration: AppMotion.enter)
                .moveY(begin: 8, end: 0, curve: AppMotion.curve),
    );
  }

  static String _channelLabel(String api) => Channel.values
      .firstWhere((c) => c.api == api, orElse: () => Channel.mostrador)
      .label;
}

Color statusColor(OrderStatus status) => switch (status) {
  OrderStatus.pendientePago ||
  OrderStatus.pagoEnVerificacion => AppColors.mostaza,
  OrderStatus.pagada ||
  OrderStatus.lista ||
  OrderStatus.entregada => AppColors.albahaca,
  OrderStatus.enPreparacion => AppColors.salsa,
  OrderStatus.pagoRechazado ||
  OrderStatus.cancelada ||
  OrderStatus.expirada => AppColors.faint,
};

typedef _Scene = ({
  String asset,
  Color color,
  String title,
  String body,
  bool retry,
});

_Scene _sceneFor(Order order) {
  final cash = order.paymentMethod == PaymentMethod.efectivo;
  _Scene scene(
    String asset,
    Color color,
    String title,
    String body, {
    bool retry = false,
  }) => (asset: asset, color: color, title: title, body: body, retry: retry);
  return switch (order.status) {
    OrderStatus.pendientePago when cash => scene(
      'recibido',
      AppColors.mostaza,
      'Paga en caja',
      'Muestra el código ${order.code} en caja y paga ${formatCents(order.quote.totalCents)} en efectivo.',
    ),
    OrderStatus.pendientePago => scene(
      'recibido',
      AppColors.mostaza,
      'Procesando tu pago',
      'Esperamos la confirmación del banco. No cierres esta pantalla.',
    ),
    OrderStatus.pagoEnVerificacion => scene(
      'recibido',
      AppColors.mostaza,
      'Verificando tu pago',
      'El banco tardó en responder. Confirmamos el resultado automáticamente; no vuelvas a pagar.',
    ),
    OrderStatus.pagada => scene(
      'pagado',
      AppColors.albahaca,
      'Recibimos tu pago',
      'Tu comanda ya está en el riel. La cocina la toma en un momento.',
    ),
    OrderStatus.enPreparacion => scene(
      'cocina',
      AppColors.salsa,
      'Tu pedido está en la plancha',
      'Lo estamos preparando ahora mismo.',
    ),
    OrderStatus.lista => scene(
      'lista',
      AppColors.albahaca,
      'Tu pedido está listo',
      'Pasa a recogerlo o espera a tu repartidor.',
    ),
    OrderStatus.entregada => scene(
      'entregado',
      AppColors.albahaca,
      'Buen provecho',
      'Entregamos tu pedido ${order.code}.',
    ),
    OrderStatus.pagoRechazado => scene(
      'rechazado',
      AppColors.salsa,
      'Pago rechazado',
      declineMessage(order.payment?.declineCode),
      retry: true,
    ),
    OrderStatus.cancelada => scene(
      'cancelado',
      AppColors.salsa,
      'Pedido cancelado',
      _refundText(order.refund),
    ),
    OrderStatus.expirada => scene(
      'cancelado',
      AppColors.salsa,
      'Pedido expirado',
      'El pedido no se pagó a tiempo. Puedes hacer uno nuevo.',
    ),
  };
}

String _refundText(Refund? refund) {
  if (refund == null) return 'No se realizó ningún cobro.';
  final amount = formatCents(refund.amountCents);
  return switch (refund.status) {
    'SUCCEEDED' => 'Reembolsamos $amount a tu tarjeta.',
    'PENDING' => 'Reembolso de $amount en proceso.',
    'FAILED' =>
      'El reembolso de $amount no se pudo completar. Contacta a la sucursal.',
    _ => 'Reembolso de $amount registrado en caja.',
  };
}

/// Illustrated status: the scene cross-fades and slides slightly when the
/// order advances; copy follows the same transition.
class _SceneCard extends StatelessWidget {
  const _SceneCard({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scene = _sceneFor(order);
    final reduced = AppMotion.reduced(context);
    final key = ValueKey('${order.status}-${order.refund?.status}');

    Widget transition(Widget child, Animation<double> animation) {
      final fade = FadeTransition(opacity: animation, child: child);
      if (reduced) return fade;
      return SlideTransition(
        position: Tween(
          begin: const Offset(0.06, 0),
          end: Offset.zero,
        ).animate(CurvedAnimation(parent: animation, curve: AppMotion.curve)),
        child: fade,
      );
    }

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.ticket,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: 1.6,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 420),
              color: Color.alphaBlend(
                scene.color.withValues(alpha: 0.12),
                AppColors.ticket,
              ),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: AnimatedSwitcher(
                duration: reduced
                    ? AppMotion.enter
                    : const Duration(milliseconds: 420),
                switchInCurve: AppMotion.curve,
                transitionBuilder: transition,
                child: SvgArt(
                  Illustrations.scene(scene.asset),
                  key: ValueKey(scene.asset),
                ),
              ),
            ),
          ),
          AnimatedContainer(
            duration: const Duration(milliseconds: 420),
            height: 4,
            color: scene.color,
          ),
          AnimatedSize(
            duration: AppMotion.enter,
            curve: AppMotion.curve,
            alignment: Alignment.topCenter,
            child: AnimatedSwitcher(
              duration: AppMotion.enter,
              transitionBuilder: transition,
              layoutBuilder: (current, previous) => Stack(
                alignment: Alignment.topLeft,
                children: [...previous, ?current],
              ),
              child: Padding(
                key: key,
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        scene.title,
                        style: AppFonts.display(
                          theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.4,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      scene.body,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.humo,
                        height: 1.35,
                      ),
                    ),
                    if (scene.retry) ...[
                      const SizedBox(height: 14),
                      PressableScale(
                        child: FilledButton(
                          onPressed: () =>
                              context.push('/orders/${order.id}/pay'),
                          child: const Text('Pagar con otra tarjeta'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TrackingSkeleton extends StatelessWidget {
  const _TrackingSkeleton();

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      child: ListView(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          const AspectRatio(
            aspectRatio: 1.6,
            child: SkeletonBox(
              width: double.infinity,
              height: double.infinity,
              radius: 20,
            ),
          ),
          const SizedBox(height: 16),
          const SkeletonBox(width: 220, height: 26, radius: 6),
          const SizedBox(height: 10),
          const SkeletonBox(width: 280, height: 14),
          const SizedBox(height: 24),
          for (var i = 0; i < 4; i++)
            const Padding(
              padding: EdgeInsets.only(bottom: 16),
              child: Row(
                children: [
                  SkeletonBox(width: 20, height: 20, circle: true),
                  SizedBox(width: 12),
                  SkeletonBox(width: 140, height: 14),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class StatusTimeline extends StatelessWidget {
  const StatusTimeline({super.key, required this.status});

  final OrderStatus status;

  static const _steps = [
    (OrderStatus.pendientePago, 'Pedido recibido', AppColors.mostaza),
    (OrderStatus.pagada, 'Pago confirmado', AppColors.albahaca),
    (OrderStatus.enPreparacion, 'En preparación', AppColors.salsa),
    (OrderStatus.lista, 'Listo', AppColors.albahaca),
    (OrderStatus.entregada, 'Entregado', AppColors.albahaca),
  ];

  int get _currentIndex => switch (status) {
    OrderStatus.pendientePago ||
    OrderStatus.pagoEnVerificacion ||
    OrderStatus.pagoRechazado ||
    OrderStatus.expirada => 0,
    OrderStatus.pagada => 1,
    OrderStatus.enPreparacion => 2,
    OrderStatus.lista => 3,
    OrderStatus.entregada => 4,
    OrderStatus.cancelada => -1,
  };

  @override
  Widget build(BuildContext context) {
    final current = _currentIndex;
    final halted =
        status == OrderStatus.cancelada ||
        status == OrderStatus.expirada ||
        status == OrderStatus.pagoRechazado;
    return Column(
      children: [
        for (final (i, step) in _steps.indexed)
          _TimelineRow(
            label: step.$2,
            color: halted ? AppColors.faint : step.$3,
            done:
                i < current ||
                (i == current && status == OrderStatus.entregada),
            active: i == current && !halted && status != OrderStatus.entregada,
            isLast: i == _steps.length - 1,
            connectorFilled: i < current,
          ),
      ],
    );
  }
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.label,
    required this.color,
    required this.done,
    required this.active,
    required this.isLast,
    required this.connectorFilled,
  });

  final String label;
  final Color color;
  final bool done;
  final bool active;
  final bool isLast;
  final bool connectorFilled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reached = done || active;
    return SizedBox(
      height: isLast ? 28 : 52,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 24,
            child: Column(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 320),
                  curve: AppMotion.curve,
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: done ? color : Colors.white,
                    border: Border.all(
                      color: reached ? color : AppColors.line,
                      width: 2,
                    ),
                  ),
                  child: AnimatedSwitcher(
                    duration: AppMotion.enter,
                    child: done
                        ? const Icon(
                            Icons.check,
                            key: ValueKey('done'),
                            size: 12,
                            color: Colors.white,
                          )
                        : active
                        ? _ActiveDot(color: color)
                        : const SizedBox.shrink(),
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 2),
                      color: AppColors.line,
                      child: Align(
                        alignment: Alignment.topCenter,
                        child: TweenAnimationBuilder<double>(
                          tween: Tween(end: connectorFilled ? 1 : 0),
                          duration: const Duration(milliseconds: 480),
                          curve: AppMotion.curve,
                          builder: (_, v, _) => FractionallySizedBox(
                            heightFactor: v,
                            widthFactor: 1,
                            child: ColoredBox(color: color),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 1),
              child: AnimatedDefaultTextStyle(
                duration: AppMotion.enter,
                style: theme.textTheme.bodyLarge!.copyWith(
                  color: reached ? AppColors.ink : AppColors.faint,
                  fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                ),
                child: Text(label),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Fills once when a step becomes active; it does not loop.
class _ActiveDot extends StatelessWidget {
  const _ActiveDot({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: 1),
        duration: const Duration(milliseconds: 420),
        curve: AppMotion.curve,
        builder: (_, v, _) => Container(
          width: 8 * v,
          height: 8 * v,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
      ),
    );
  }
}
