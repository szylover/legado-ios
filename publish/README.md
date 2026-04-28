# Local Build Publish Folder

每次构建后，JS Bundle 输出到此目录。

## 目录结构

```
publish/
├── manifest.json          # 所有构建记录 (最近20条)
├── latest/                # 最新构建的软链接/拷贝
│   ├── _expo/
│   │   └── static/js/ios/
│   │       └── *.hbc      # Hermes bytecode bundle
│   └── build-info.json    # 版本信息
└── v1.0.0-abc1234/        # 带版本号的历史构建
    └── ...
```

## 构建命令

```bash
# 构建并输出到 publish/
npm run publish:local

# 构建 + 启动本地 HTTP server (port 3000)
npm run publish:local -- --serve
```

## 测试方式

1. 运行 `npm run publish:local -- --serve`
2. 确保手机和电脑在同一 WiFi
3. 获取电脑 IP：`ipconfig` (Windows) 或 `ifconfig` (Mac)
4. Expo Go 或 dev client 连接 `http://192.168.x.x:3000`

## manifest.json 示例

```json
{
  "latest": "v1.0.0-abc1234",
  "builds": [
    {
      "buildId": "v1.0.0-abc1234",
      "version": "1.0.0",
      "hash": "abc1234",
      "timestamp": "2026-04-28T06:00:00.000Z",
      "platform": "ios"
    }
  ]
}
```
