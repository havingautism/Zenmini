import 'package:flutter/material.dart';

import '../services/supabase_service.dart';

class SettingsModal extends StatefulWidget {
  const SettingsModal({
    super.key,
    required this.currentGeminiApiKey,
    required this.currentSbConfig,
    required this.isAutoPlayTts,
    required this.onClose,
    required this.onSave,
    required this.onToggleAutoPlayTts,
    required this.onTestSchema,
  });

  final String currentGeminiApiKey;
  final SupabaseConfig currentSbConfig;
  final bool isAutoPlayTts;
  final VoidCallback onClose;
  final void Function(String newGeminiKey, SupabaseConfig newConfig) onSave;
  final VoidCallback onToggleAutoPlayTts;
  final VoidCallback onTestSchema;

  @override
  State<SettingsModal> createState() => _SettingsModalState();
}

class _SettingsModalState extends State<SettingsModal> {
  late TextEditingController _geminiController;
  late TextEditingController _sbUrlController;
  late TextEditingController _sbAnonController;
  late bool _autoPlayTts;

  @override
  void initState() {
    super.initState();
    _geminiController =
        TextEditingController(text: widget.currentGeminiApiKey);
    _sbUrlController =
        TextEditingController(text: widget.currentSbConfig.url);
    _sbAnonController =
        TextEditingController(text: widget.currentSbConfig.anonKey);
    _autoPlayTts = widget.isAutoPlayTts;
  }

  @override
  void dispose() {
    _geminiController.dispose();
    _sbUrlController.dispose();
    _sbAnonController.dispose();
    super.dispose();
  }

  void _handleSave() {
    final cfg = SupabaseConfig(
      url: _sbUrlController.text.trim(),
      anonKey: _sbAnonController.text.trim(),
    );
    widget.onSave(_geminiController.text.trim(), cfg);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: Material(
          borderRadius: BorderRadius.circular(24),
          color: Colors.white,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      '设置',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: widget.onClose,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Gemini API Key',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _geminiController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    hintText: 'g-xxxxxxxx',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Supabase 配置',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _sbUrlController,
                  decoration: const InputDecoration(
                    labelText: 'Supabase URL',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _sbAnonController,
                  decoration: const InputDecoration(
                    labelText: 'Anon Key',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Switch(
                      value: _autoPlayTts,
                      onChanged: (v) {
                        setState(() {
                          _autoPlayTts = v;
                        });
                        widget.onToggleAutoPlayTts();
                      },
                    ),
                    const SizedBox(width: 4),
                    const Text(
                      '自动播放 TTS',
                      style: TextStyle(fontSize: 13),
                    ),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: widget.onTestSchema,
                      icon: const Icon(Icons.storage, size: 16),
                      label: const Text(
                        '测试 Schema',
                        style: TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: widget.onClose,
                      child: const Text('取消'),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _handleSave,
                      child: const Text('保存'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

