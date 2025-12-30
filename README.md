# imessage-link-worker

Cloudflare Worker：生成一个“打开即发消息”的 iMessage（Messages）跳转链接。

- 苹果设备打开：自动跳转 `imessage:`（拉起 iMessage/Messages）。
- 非苹果设备打开：显示二维码（二维码内容为 `imessage:` 直链，提示用 iPhone/iPad 相机扫码）。

## 一键部署到 Cloudflare Workers

直接点击按钮即可一键部署（需要 public 仓库）：

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yoogg/imessage-link-worker)

部署流程里可以直接填写/修改 `DEFAULT_ID`（默认收件人）。

> 说明：Deploy to Cloudflare buttons 仅支持 github.com / gitlab.com 的公开仓库。


## 1) 本地运行

```bash
npm i
npm run dev
```

## 2) 部署

```bash
npm run deploy
```

## 3) 用法

### GET（最常用：直接打开链接）

- 收件人（可选）：`id`（Apple ID 邮箱/手机号等）
- 消息内容（可选）：`body`

示例：

- `https://<your-worker-domain>/?id=someone@icloud.com&body=你好` 

如果不传 `id`，会读取环境变量 `DEFAULT_ID`。

### POST（可选）

- URL 仍可传 `id`
- 请求体可以是纯文本，或 JSON：`{"body":"..."}`

## 4) 环境变量

在 [wrangler.toml](wrangler.toml) 里设置：

- `DEFAULT_ID`：默认收件人

> 说明：本项目当前使用 `imessage:` scheme。不同系统/浏览器对自动跳转/扫码拉起 App 的限制不完全一致；页面同时提供“点击打开”的兜底链接。

