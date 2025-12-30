
import QRCode from "qrcode";

export interface Env {
  DEFAULT_ID: string;
}

function isAppleUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  // iOS/iPadOS/macOS（多数情况下在 macOS 上也能拉起 Messages）
  return /(iPhone|iPad|iPod|Macintosh)/i.test(userAgent);
}

function getSingleQueryParam(url: URL, key: string): string | null {
  const value = url.searchParams.get(key);
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function buildIMessageLink(recipient: string, body: string | null): string {
  // 使用 imessage: scheme 直接拉起 Messages 的 iMessage。
  // 常见形式：imessage:someone?&body=...
  const encodedRecipient = encodeURIComponent(recipient);
  if (!body || !body.trim()) {
    return `imessage:${encodedRecipient}`;
  }
  const encodedBody = encodeURIComponent(body);
  return `imessage:${encodedRecipient}?&body=${encodedBody}`;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function readMessageBody(request: Request, url: URL): Promise<string | null> {
  // 优先 query 参数 body（便于“直接打开链接”）
  const fromQuery = getSingleQueryParam(url, "body");
  if (fromQuery) return fromQuery;

  // 兼容 POST/PUT 直接用文本 body
  if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const json = (await request.json()) as unknown;
        if (typeof (json as any)?.body === "string") {
          const text = (json as any).body.trim();
          return text.length ? text : null;
        }
      } catch {
        // ignore
      }
    }
    try {
      const text = (await request.text()).trim();
      return text.length ? text : null;
    } catch {
      return null;
    }
  }

  return null;
}

function appleRedirectHtml(imessageLink: string): string {
  const safeLink = escapeHtml(imessageLink);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>打开 iMessage…</title>
  <meta http-equiv="refresh" content="0;url=${safeLink}" />
</head>
<body>
  <p>正在打开 iMessage…</p>
  <p>如果没有自动打开，请点击：<a href="${safeLink}">打开 iMessage</a></p>
  <script>
    try { window.location.href = ${JSON.stringify(imessageLink)}; } catch (e) {}
  </script>
</body>
</html>`;
}

function qrPageHtml(svg: string, hint: string): string {
  const hintHtml = hint.trim().length ? `<p>${escapeHtml(hint)}</p>` : "";
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>用iMessage联系</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;max-width:720px;margin:0 auto;padding:24px;line-height:1.5}
    .qr{width:260px;height:260px}
    .box{display:flex;gap:20px;align-items:center;flex-wrap:wrap}
    .muted{color:#555}
  </style>
</head>
<body>
  <h1>iMessage 联系</h1>
  <div class="box">
    <div class="qr">${svg}</div>
    <div>
      ${hintHtml}
      <p class="muted">提示：用 iPhone / iPad 自带相机扫码，打开后会自动跳转到 iMessage。</p>
    </div>
  </div>
</body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const recipient = getSingleQueryParam(url, "id") ?? (env.DEFAULT_ID?.trim() || null);
    if (!recipient) {
      return new Response(
        "缺少收件人：请在 URL 中传入 ?id=你的AppleID(邮箱/手机号)，或在环境变量 DEFAULT_ID 设置默认账号。\n",
        { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }

    const message = await readMessageBody(request, url);
    const imessageLink = buildIMessageLink(recipient, message);

    const userAgent = request.headers.get("user-agent");
    if (isAppleUserAgent(userAgent)) {
      return new Response(appleRedirectHtml(imessageLink), {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    const qrValue = imessageLink;
    const svg = await QRCode.toString(qrValue, {
      type: "svg",
      margin: 1,
      width: 260,
      errorCorrectionLevel: "M"
    });

    const hint = "";
    return new Response(qrPageHtml(svg, hint), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }
};

