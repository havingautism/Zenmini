import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class SchemaInitModal extends StatelessWidget {
  const SchemaInitModal({
    super.key,
    required this.sql,
    required this.onClose,
  });

  final String sql;
  final VoidCallback onClose;

  void _copy() {
    Clipboard.setData(ClipboardData(text: sql));
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onClose,
      child: Container(
        color: Colors.black.withOpacity(0.2),
        alignment: Alignment.center,
        child: GestureDetector(
          onTap: () {},
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: Material(
              borderRadius: BorderRadius.circular(24),
              color: Colors.white,
              child: SizedBox(
                height: 460,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 14,
                      ),
                      child: Row(
                        children: [
                          const Text(
                            '初始化数据库',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const Spacer(),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: onClose,
                          ),
                        ],
                      ),
                    ),
                    const Padding(
                      padding:
                          EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                      child: Text(
                        '检测到这是首次使用或表结构缺失。请将以下 SQL 复制到 Supabase SQL Editor（public 模式）执行，然后返回点击关闭。',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.black87,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: Stack(
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFF111827),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              padding: const EdgeInsets.all(12),
                              child: SingleChildScrollView(
                                child: Text(
                                  sql,
                                  style: const TextStyle(
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                    color: Color(0xFFF9FAFB),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Positioned(
                            right: 24,
                            top: 12,
                            child: IconButton(
                              icon: const Icon(
                                Icons.copy,
                                color: Colors.white,
                                size: 18,
                              ),
                              onPressed: _copy,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 14),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          ElevatedButton(
                            onPressed: onClose,
                            child: const Text('我已完成初始化'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

