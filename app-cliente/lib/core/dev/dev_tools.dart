import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import '../../features/cart/application/cart_controller.dart';
import '../http/api_client.dart';
import '../theme/app_theme.dart';

/// Debug-only settings toggled from the dev panel.
final showPerformanceOverlay = ValueNotifier<bool>(false);

/// Rebuilds the whole app (fresh providers and router) without relaunching it.
class AppRestarter extends StatefulWidget {
  const AppRestarter({super.key, required this.builder});

  final WidgetBuilder builder;

  static void restart(BuildContext context) =>
      context.findAncestorStateOfType<_AppRestarterState>()?._restart();

  @override
  State<AppRestarter> createState() => _AppRestarterState();
}

class _AppRestarterState extends State<AppRestarter> {
  Key _key = UniqueKey();

  void _restart() => setState(() => _key = UniqueKey());

  @override
  Widget build(BuildContext context) => KeyedSubtree(
    key: _key,
    child: Builder(builder: widget.builder),
  );
}

/// Draggable floating button with a small dev panel. Renders nothing outside debug builds.
class DevToolsOverlay extends StatefulWidget {
  const DevToolsOverlay({super.key, required this.child});

  final Widget child;

  @override
  State<DevToolsOverlay> createState() => _DevToolsOverlayState();
}

class _DevToolsOverlayState extends State<DevToolsOverlay> {
  Offset? _position;
  bool _open = false;

  static const _buttonSize = 48.0;

  @override
  Widget build(BuildContext context) {
    if (!kDebugMode) return widget.child;
    final size = MediaQuery.sizeOf(context);
    final padding = MediaQuery.paddingOf(context);
    final position =
        _position ?? Offset(size.width - _buttonSize - 12, size.height * 0.62);

    return Stack(
      children: [
        widget.child,
        if (_open)
          Positioned.fill(
            child: GestureDetector(
              onTap: () => setState(() => _open = false),
              child: const ColoredBox(color: Color(0x661B1A22)),
            ),
          ),
        AnimatedPositioned(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          left: 16,
          right: 16,
          bottom: _open ? padding.bottom + 16 : -420,
          child: ExcludeSemantics(
            excluding: !_open,
            child: IgnorePointer(
              ignoring: !_open,
              child: _DevPanel(onClose: () => setState(() => _open = false)),
            ),
          ),
        ),
        if (!_open)
          Positioned(
            left: position.dx,
            top: position.dy,
            child: GestureDetector(
              onPanUpdate: (d) => setState(() {
                final next = position + d.delta;
                _position = Offset(
                  next.dx.clamp(8, size.width - _buttonSize - 8),
                  next.dy.clamp(
                    padding.top + 8,
                    size.height - _buttonSize - padding.bottom - 8,
                  ),
                );
              }),
              onTap: () => setState(() => _open = true),
              child: Semantics(
                button: true,
                label: 'Herramientas de desarrollo',
                child: Container(
                  width: _buttonSize,
                  height: _buttonSize,
                  decoration: BoxDecoration(
                    color: AppColors.ink.withValues(alpha: 0.88),
                    shape: BoxShape.circle,
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x401B1A22),
                        blurRadius: 12,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.build_rounded,
                    color: AppColors.mostaza,
                    size: 22,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _DevPanel extends ConsumerStatefulWidget {
  const _DevPanel({required this.onClose});

  final VoidCallback onClose;

  @override
  ConsumerState<_DevPanel> createState() => _DevPanelState();
}

class _DevPanelState extends ConsumerState<_DevPanel> {
  bool get _slowAnimations => timeDilation > 1;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Material(
      color: AppColors.ink,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Desarrollo',
                    style: text.titleMedium?.copyWith(color: Colors.white),
                  ),
                ),
                IconButton(
                  onPressed: widget.onClose,
                  icon: const Icon(
                    Icons.close_rounded,
                    color: Colors.white70,
                    semanticLabel: 'Cerrar',
                  ),
                ),
              ],
            ),
            Text(
              'API: $apiUrl',
              style: text.bodySmall?.copyWith(
                color: Colors.white60,
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Recarga en caliente: r en la terminal de flutter run · reinicio completo: R',
              style: text.bodySmall?.copyWith(color: Colors.white38),
            ),
            const SizedBox(height: 8),
            _Action(
              icon: Icons.restart_alt_rounded,
              label: 'Reiniciar app',
              onTap: () {
                widget.onClose();
                AppRestarter.restart(context);
              },
            ),
            _Action(
              icon: Icons.remove_shopping_cart_outlined,
              label: 'Vaciar carrito',
              onTap: () {
                ref.read(cartProvider.notifier).clear();
                widget.onClose();
              },
            ),
            _Toggle(
              icon: Icons.slow_motion_video_rounded,
              label: 'Animaciones lentas',
              value: _slowAnimations,
              onChanged: (on) => setState(() => timeDilation = on ? 5 : 1),
            ),
            ValueListenableBuilder<bool>(
              valueListenable: showPerformanceOverlay,
              builder: (_, on, _) => _Toggle(
                icon: Icons.speed_rounded,
                label: 'Overlay de rendimiento',
                value: on,
                onChanged: (v) => showPerformanceOverlay.value = v,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: EdgeInsets.zero,
    leading: Icon(icon, color: AppColors.mostaza),
    title: Text(label, style: const TextStyle(color: Colors.white)),
    onTap: onTap,
  );
}

class _Toggle extends StatelessWidget {
  const _Toggle({
    required this.icon,
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => SwitchListTile(
    contentPadding: EdgeInsets.zero,
    secondary: Icon(icon, color: AppColors.mostaza),
    title: Text(label, style: const TextStyle(color: Colors.white)),
    value: value,
    activeThumbColor: AppColors.mostaza,
    onChanged: onChanged,
  );
}
