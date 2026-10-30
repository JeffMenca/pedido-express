import 'package:google_fonts/google_fonts.dart';
import 'package:material_ui/material_ui.dart';

/// "Riel de comandas" tokens.
abstract final class AppColors {
  static const ink = Color(0xFF1B1A22);
  static const steel = Color(0xFFE7EAEE);
  static const ticket = Color(0xFFFFFFFF);
  static const salsa = Color(0xFFD7261E);
  static const mostaza = Color(0xFFF2B705);
  static const albahaca = Color(0xFF1F7A4D);
  static const humo = Color(0xFF6B7280);
  static const line = Color(0xFFD5D9DF);
  static const faint = Color(0xFF9CA3AF);
  static const skeleton = Color(0xFFEEF0F3);
  static const warningText = Color(0xFFB45309);
}

abstract final class AppRadii {
  static const card = 14.0;
  static const control = 10.0;
}

abstract final class AppMotion {
  static const enter = Duration(milliseconds: 220);
  static const exit = Duration(milliseconds: 150);
  static const print = Duration(milliseconds: 260);
  static const curve = Cubic(0.25, 1, 0.5, 1);

  static bool reduced(BuildContext context) =>
      MediaQuery.maybeDisableAnimationsOf(context) ?? false;
}

const tabularFigures = [FontFeature.tabularFigures()];

abstract final class AppFonts {
  /// Disabled in tests, where fonts cannot be fetched.
  static bool useGoogleFonts = true;

  /// JetBrains Mono for order codes, amounts, quantities and times.
  static TextStyle mono(TextStyle? base) {
    final style = (base ?? const TextStyle()).copyWith(
      fontFeatures: tabularFigures,
      fontWeight: base?.fontWeight ?? FontWeight.w500,
    );
    return useGoogleFonts ? GoogleFonts.jetBrainsMono(textStyle: style) : style;
  }

  /// Bricolage Grotesque, reserved for view titles and the brand.
  static TextStyle display(TextStyle? base) {
    final style = base ?? const TextStyle();
    return useGoogleFonts
        ? GoogleFonts.bricolageGrotesque(textStyle: style)
        : style;
  }

  static TextTheme body(TextTheme base) =>
      useGoogleFonts ? GoogleFonts.figtreeTextTheme(base) : base;
}

ThemeData buildAppTheme() {
  const scheme = ColorScheme(
    brightness: Brightness.light,
    primary: AppColors.salsa,
    onPrimary: AppColors.ticket,
    secondary: AppColors.ink,
    onSecondary: AppColors.ticket,
    tertiary: AppColors.albahaca,
    onTertiary: AppColors.ticket,
    error: AppColors.salsa,
    onError: AppColors.ticket,
    surface: AppColors.ticket,
    onSurface: AppColors.ink,
    onSurfaceVariant: AppColors.humo,
    outline: AppColors.line,
    outlineVariant: AppColors.line,
    surfaceContainerHighest: AppColors.steel,
  );
  final base = ThemeData(colorScheme: scheme, useMaterial3: true);
  final body = AppFonts.body(base.textTheme)
      .apply(bodyColor: AppColors.ink, displayColor: AppColors.ink);
  final text = body.copyWith(
    headlineMedium: AppFonts.display(
      body.headlineMedium?.copyWith(fontSize: 28, fontWeight: FontWeight.w700),
    ),
    titleLarge: AppFonts.display(
      body.titleLarge?.copyWith(fontSize: 20, fontWeight: FontWeight.w700),
    ),
  );
  final controlBorder = OutlineInputBorder(
    borderRadius: BorderRadius.circular(AppRadii.control),
    borderSide: const BorderSide(color: AppColors.line),
  );
  return base.copyWith(
    scaffoldBackgroundColor: AppColors.steel,
    textTheme: text,
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.steel,
      foregroundColor: AppColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: text.titleLarge,
    ),
    cardTheme: CardThemeData(
      color: AppColors.ticket,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadii.card),
      ),
    ),
    dividerTheme: const DividerThemeData(color: AppColors.line, space: 1),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(54),
        backgroundColor: AppColors.salsa,
        foregroundColor: AppColors.ticket,
        disabledBackgroundColor: AppColors.line,
        disabledForegroundColor: AppColors.humo,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.card),
        ),
        textStyle: text.titleSmall?.copyWith(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(44, 44),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.control),
        ),
        side: const BorderSide(color: AppColors.line),
        foregroundColor: AppColors.ink,
        backgroundColor: AppColors.ticket,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: AppColors.ink),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.ticket,
      border: controlBorder,
      enabledBorder: controlBorder,
      focusedBorder: controlBorder.copyWith(
        borderSide: const BorderSide(color: AppColors.ink, width: 1.5),
      ),
    ),
    tabBarTheme: TabBarThemeData(
      labelColor: AppColors.ink,
      unselectedLabelColor: AppColors.humo,
      indicator: const UnderlineTabIndicator(
        borderSide: BorderSide(color: AppColors.mostaza, width: 3),
      ),
      dividerColor: AppColors.line,
      labelStyle: text.titleSmall?.copyWith(fontWeight: FontWeight.w700),
      unselectedLabelStyle: text.titleSmall,
      tabAlignment: TabAlignment.start,
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: AppColors.ticket,
      showDragHandle: true,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppRadii.card),
        ),
      ),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: AppColors.ink,
    ),
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: AppColors.ink,
    ),
  );
}
