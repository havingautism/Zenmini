import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData buildTheme() {
    final base = ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF4338CA),
        brightness: Brightness.light,
      ),
      useMaterial3: true,
      fontFamily: 'System',
    );

    return base.copyWith(
      // 更接近网页端的暖色背景
      scaffoldBackgroundColor: const Color(0xFFF8F4EC),
      appBarTheme: const AppBarTheme(
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: Color(0xFFE5E7EB),
        thickness: 1,
        space: 1,
      ),
    );
  }
}
