# Finger

[English](README.md) | **简体中文**

一个浏览器里的实时手势粒子小实验。打开摄像头后，应用会用 MediaPipe 识别单手或双手的 21 个手部关键点，再把这些关键点映射到全屏 Canvas 粒子场中，让粒子围绕指尖、骨架和掌心移动。

## 功能

- 实时摄像头手部追踪，支持单手和双手识别
- Canvas 粒子场跟随手部关键点运动
- 三种视觉风格：霓虹、极光、余烬
- 可调粒子强度
- 可切换摄像头画面、能量链和骨架显示
- 支持全屏沉浸模式
- 本地无后端，适合部署到 Cloudflare Pages 等静态站点平台

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- MediaPipe Tasks Vision
- Zustand
- Lucide React

## 本地运行

```bash
pnpm install
pnpm dev
```

然后在浏览器中打开 Vite 输出的本地地址。手部识别需要摄像头权限，建议使用 Chrome 或 Edge。

## 构建

```bash
pnpm build
```

构建产物会输出到 `dist/`。

## 代码检查

```bash
pnpm lint
pnpm check
```

## Cloudflare Pages 部署

这个项目是纯静态 Vite 应用，Cloudflare Pages 的推荐配置如下：

- Framework preset: `Vite`
- Build command: `pnpm build`
- Build output directory: `dist`
- Root directory: `/`

也可以使用 Wrangler 直接上传当前构建产物：

```bash
pnpm build
npx wrangler pages deploy dist --project-name finger
```

部署后需要通过 HTTPS 访问页面，因为浏览器摄像头 API 在生产环境通常要求安全上下文。

## 使用说明

1. 进入页面后等待手部识别模型加载完成。
2. 点击“开启摄像头”，授权浏览器访问摄像头。
3. 将手掌正对镜头并张开五指。
4. 使用右上角控制面板切换风格、显示层和全屏模式。

## 注意事项

- 首次加载会从 CDN 获取 MediaPipe WASM 和手部识别模型，网络较慢时需要等待几秒。
- 摄像头权限被拒绝后，需要在浏览器站点设置中重新允许。
- 如果摄像头被其他程序占用，关闭占用程序后刷新页面重试。
