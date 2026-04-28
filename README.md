# legado web

> 开源阅读 legado 的 Web 版本，运行在浏览器中，通过 Safari 在 iPhone 上使用

## 特性

- 完整兼容 legado Android 书源 JSON 格式
- 规则引擎：CSS/XPath/JSONPath/正则/JS
- 本地 CORS 代理，绕过浏览器跨域限制
- IndexedDB 存储（Dexie.js）
- 移动端优先 UI，可添加到 iPhone 主屏幕

## 快速开始

```bash
npm install
npm run dev
```

打开 http://localhost:5173（手机和电脑在同一网络时，也可用手机 Safari 访问 `http://<你的IP>:5173`）

`npm run dev` 会同时启动：
- Vite 开发服务器（端口 5173）  
- CORS 代理服务器（端口 3001）

## 使用 Safari 访问

1. 确保手机和电脑在同一 WiFi
2. 运行 `npm run dev`  
3. 用 Safari 打开 `http://<电脑IP>:5173`
4. 点击分享 → 添加到主屏幕，即可像 App 一样使用

## 书源导入

1. 点击底部「书源」→「导入」
2. 输入书源 JSON 地址或选择本地文件
3. 点击「测试源」可使用内置测试书源

## 项目结构

```
src/
├── model/analyzeRule/   # 规则引擎（兼容 legado Android）
├── data/
│   ├── entities/        # 数据模型（BookSource, Book, BookChapter…）
│   ├── dao/             # 数据访问层（Dexie.js）
│   └── db.ts            # IndexedDB 数据库定义
├── help/
│   ├── http/            # HTTP 客户端 + Cookie 管理
│   └── source/          # 书源/订阅源导入导出
├── core/network/        # WebBook 书源网络层
├── pages/               # 页面组件
├── components/          # 公共组件
└── styles/              # 全局样式
scripts/
└── cors-proxy.js        # 本地 CORS 代理服务器
```

## 技术栈

- [Vite](https://vitejs.dev/) + React 18 + TypeScript
- [Dexie.js](https://dexie.org/) — IndexedDB 封装
- [React Router v6](https://reactrouter.com/) — 客户端路由
- [cheerio](https://cheerio.js.org/) — HTML 解析（书源规则）
- 本地 CORS 代理（Node.js）
