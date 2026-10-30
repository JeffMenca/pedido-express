import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/errors/error_messages.dart';
import '../../../core/format/money.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/ticket.dart';
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
        loading: () => const Center(child: CircularProgressIndicator()),
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
      AnimatedSwitcher(
        duration: AppMotion.enter,
        child: KeyedSubtree(
          key: ValueKey('${order.status}-${order.refund?.status}'),
          child: _StatusNotice(order: order),
        ),
      ),
      const SizedBox(height: 12),
      PrintIn(
        child: QuoteSummary(
          quote: order.quote,
          header: header,
          statusColor: statusColor(order.status),
        ),
      ),
      const SizedBox(height: 16),
      Card(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
          child: StatusTimeline(status: order.status),
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

class _StatusNotice extends StatelessWidget {
  const _StatusNotice({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final cash = order.paymentMethod == PaymentMethod.efectivo;
    switch (order.status) {
      case OrderStatus.pendientePago when cash:
        return _Notice(
          color: AppColors.mostaza,
          title: 'Paga en caja',
          body:
              'Muestra el código ${order.code} en caja y paga ${formatCents(order.quote.totalCents)} en efectivo.',
        );
      case OrderStatus.pendientePago:
        return const _Notice(
          color: AppColors.mostaza,
          title: 'Procesando tu pago',
          body:
              'Esperamos la confirmación del banco. No cierres esta pantalla.',
        );
      case OrderStatus.pagoEnVerificacion:
        return const _Notice(
          color: AppColors.mostaza,
          title: 'Verificando tu pago',
          body: 'El banco tardó en responder. Confirmamos el resultado automáticamente; no vuelvas a pagar.',
        );
      case OrderStatus.pagoRechazado:
        return _Notice(
          color: AppColors.salsa,
          title: 'Pago rechazado',
          body: declineMessage(order.payment?.declineCode),
          action: FilledButton(
            onPressed: () => context.push('/orders/${order.id}/pay'),
            child: const Text('Pagar con otra tarjeta'),
          ),
        );
      case OrderStatus.cancelada:
        return _Notice(
          color: AppColors.salsa,
          title: 'Pedido cancelado',
          body: _refundText(order.refund),
        );
      case OrderStatus.expirada:
        return const _Notice(
          color: AppColors.salsa,
          title: 'Pedido expirado',
          body: 'El pedido no se pagó a tiempo. Puedes hacer uno nuevo.',
        );
      case OrderStatus.lista:
        return const _Notice(
          color: AppColors.albahaca,
          title: 'Tu pedido está listo',
          body: 'Pasa a recogerlo o espera a tu repartidor.',
        );
      case OrderStatus.pagada ||
          OrderStatus.enPreparacion ||
          OrderStatus.entregada:
        return const SizedBox.shrink();
    }
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
}

class _Notice extends StatelessWidget {
  const _Notice({
    required this.color,
    required this.title,
    required this.body,
    this.action,
  });

  final Color color;
  final String title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(left: BorderSide(color: color, width: 4)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.ink,
                ),
              ),
              const SizedBox(height: 4),
              Text(body),
              if (action != null) ...[const SizedBox(height: 12), action!],
            ],
          ),
        ),
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
