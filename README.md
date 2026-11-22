# 果壁 Studio (AppleWall Studio)

面向国内苹果用户的**免费、零门槛** AI 壁纸工作室，支持 **iPhone / iPad / Mac** 三端适配，同时覆盖「真人/宠物高保真美化」与「风景/艺术壁纸二次创作」。

## 核心特性

- **双场景 AI 美化引擎**：
  - **真人 / 宠物保真模式**：影棚通透光影、富士清透胶片、锁屏留白扩图、微距浅景深虚化（锁定五官与毛发一致性）。
  - **风景 / 艺术二创模式**：新海诚治愈动漫、Apple 极简流体、OLED 深邃星夜、日落暖金电影、温柔水彩插画。
- **苹果生态专属适配**：
  - 内置 **iPhone 18 / 17 / 16 / 15 / 14 全系列**（每代均清晰区分 **基础版 / Pro / Pro Max**，含 iPhone 14 基础版经典刘海屏与灵动岛差异化预览）、iPad Pro 13" / Air 11"（支持横竖屏切换）、MacBook Pro 16" / Air 15" / Studio Display 5K 精确分辨率。
  - 实时灵动岛、自定义锁屏时钟样式、安全区参考线、iOS 景深黄金线、主屏柔焦配对预览。
  - **苹果全家桶三端联动**：一键预览并下载 iPhone + iPad + Mac 视觉统一套图。
  - **小红书 / 朋友圈带壳晒图海报**：一键生成带色卡与样机的展示图。
- **零成本即开即用 + 国内大模型热插拔**：
  - 默认启用内置「果壁本地即时引擎」，不配置任何 API Key 即可体验完整流程与无损导出。
  - 配置 `.env.local` 中的火山引擎方舟（豆包 SeedEdit 3.0）或硅基流动 Key 后，自动切换为云端 AI 深度美化。
- **免费共创反馈闭环**：右上角常驻「提建议」，提交结果自动持久化到 `data/feedbacks.json`（生产环境对接 PostgreSQL `user_feedbacks` 表）。

## 快速启动

```bash
pnpm install
pnpm dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000) 即可体验。

## 接入云端 AI 模型（可选）

复制环境变量模板并填入国内厂商 API Key：

```bash
cp .env.example .env.local
```

## 项目文档

- 完整技术架构设计：`docs/ARCHITECTURE.md`
- 数据库建表 SQL（PostgreSQL）：`docs/DATABASE.sql`
- 页面原型与交互规范：`docs/PROTOTYPE.md`
