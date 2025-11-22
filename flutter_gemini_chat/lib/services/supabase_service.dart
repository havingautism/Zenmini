import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const emptySbConfig = SupabaseConfig(url: '', anonKey: '');

class SupabaseConfig {
  const SupabaseConfig({
    required this.url,
    required this.anonKey,
  });

  final String url;
  final String anonKey;

  bool get isValid => url.isNotEmpty && anonKey.isNotEmpty;

  Map<String, String> toJson() => {'url': url, 'anonKey': anonKey};

  factory SupabaseConfig.fromJson(Map<String, dynamic> json) {
    return SupabaseConfig(
      url: json['url'] as String? ?? '',
      anonKey: json['anonKey'] as String? ?? '',
    );
  }
}

class SupabaseService {
  SupabaseService._(this.config, this.clientId, this.client);

  final SupabaseConfig config;
  final String clientId;
  final SupabaseClient client;

  static const _configKey = 'supabaseConfig';

  static Future<SupabaseConfig?> loadConfigFromLocal() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_configKey);
    if (jsonStr == null || jsonStr.isEmpty) return null;
    try {
      final map = jsonDecode(jsonStr) as Map<String, dynamic>;
      return SupabaseConfig.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  static Future<void> saveConfig(SupabaseConfig config) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_configKey, jsonEncode(config.toJson()));
  }

  static SupabaseConfig? loadConfigFromEnv() {
    // Flutter 端没有 import.meta.env，保留接口以便后续通过环境注入。
    return null;
  }

  static String getOrCreateClientId() {
    // 与 Web 版保持一致：固定共享 client_id
    return 'shared-user';
  }

  static Future<SupabaseService> init(SupabaseConfig config) async {
    final clientId = getOrCreateClientId();

    await Supabase.initialize(
      url: config.url,
      anonKey: config.anonKey,
      debug: false,
    );

    final client = Supabase.instance.client;
    return SupabaseService._(config, clientId, client);
  }
}
