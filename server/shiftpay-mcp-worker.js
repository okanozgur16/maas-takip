/**
 * ShiftPay Full-Access Remote MCP Server (Cloudflare Worker)
 * Gives Claude Pro (Mobile & Web Chat, 24/7 with PC OFF) complete autonomous control over:
 * 1. Live Visual Inspection (Desktop 1280x820 & Mobile 390x844 real Chromium PNG screenshots -> ImageContent)
 * 2. GitHub Repository (read slices, grep/search, atomic multi-file edit & push to main, CI status/logs, secrets list)
 * 3. Cloudflare Worker & KV & Secrets & Cron Triggers (OWNER_TOKEN, VAPID_*, schedules, KV read/write/delete)
 * 4. Firebase Admin (maas-takip-sync: test/publish firestore.rules + read/list/delete Firestore documents)
 *
 * Protected by 256-bit constant-time capability secret in URL path (/mcp/<MCP_PATH_SECRET>).
 */

const GH_OWNER = "okanozgur16";
const GH_REPO = "maas-takip";
const CF_ACCOUNT = "3bf7fc774af3ec087fc3d01b6856c0bd";
const CF_PROD_WORKER = "summer-mode-6176";
const CF_MCP_WORKER = "shiftpay-mcp";
const CF_KV_NS = "9f5663780da9445ebbfc175d3d0fa1dd";
const FB_PROJECT = "maas-takip-sync";
const LIVE_URL = "https://shiftpay-app.pages.dev/";

function timingSafeEq(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const enc = new TextEncoder();
  const ua = enc.encode(a);
  const ub = enc.encode(b);
  if (ua.length !== ub.length || ua.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

function b64FromBytes(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function b64urlFromBytes(bytes) {
  return b64FromBytes(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlFromStr(str) {
  return b64urlFromBytes(new TextEncoder().encode(str));
}

function utf8FromB64(b64) {
  const clean = b64.replace(/\s+/g, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

function b64FromUtf8(str) {
  return b64FromBytes(new TextEncoder().encode(str));
}

async function getGoogleAccessToken(saJsonStr) {
  const sa = JSON.parse(saJsonStr);
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlFromStr(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64urlFromStr(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claim}`;

  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binDer = atob(pemBody);
  const der = new Uint8Array(binDer.length);
  for (let i = 0; i < binDer.length; i++) der[i] = binDer.charCodeAt(i);

  const key = await crypto.subtle.importKey(
    "pkcs8",
    der.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64urlFromBytes(new Uint8Array(sigBuf))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Google OAuth failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function ghReq(env, path, opts = {}) {
  const url = path.startsWith("http") ? path : `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}${path}`;
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: {
      "Authorization": `Bearer ${env.GITHUB_PAT}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ShiftPay-MCP-Worker/1.0",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(opts.headers || {})
    },
    body: opts.body ? (typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body)) : undefined
  });
  const txt = await res.text();
  let json = null;
  try { json = txt ? JSON.parse(txt) : null; } catch (_) {}
  if (!res.ok) {
    throw new Error(`GitHub API ${opts.method || "GET"} ${path} -> ${res.status}: ${txt.slice(0, 600)}`);
  }
  return json ?? txt;
}

async function cfReq(env, path, opts = {}) {
  const url = `https://api.cloudflare.com/client/v4${path}`;
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: {
      "Authorization": `Bearer ${env.CF_API_TOKEN}`,
      ...(opts.body && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(opts.headers || {})
    },
    body: opts.body
      ? (opts.body instanceof FormData || typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body))
      : undefined
  });
  const txt = await res.text();
  let json = null;
  try { json = txt ? JSON.parse(txt) : null; } catch (_) {}
  if (!res.ok) {
    throw new Error(`Cloudflare API ${opts.method || "GET"} ${path} -> ${res.status}: ${txt.slice(0, 600)}`);
  }
  return json ?? txt;
}

const TOOLS = [
  {
    name: "live_site_visual_check",
    description: "Canlı ShiftPay web sayfasını (https://shiftpay-app.pages.dev/) gerçek Chromium tarayıcıda açıp ekran görüntüsünü (PNG görsel olarak!) ve canlı version.json bilgisini döndürür. Hem masaüstü (1280x820) hem telefon (390x844) görünümünü kendi gözünle incelemek için kullan.",
    inputSchema: {
      type: "object",
      properties: {
        device: {
          type: "string",
          enum: ["desktop", "mobile"],
          description: "desktop (1280x820) veya mobile (390x844)"
        },
        url: {
          type: "string",
          description: "İsteğe bağlı özel URL (varsayılan: https://shiftpay-app.pages.dev/)"
        },
        color_scheme: {
          type: "string",
          enum: ["dark", "light"],
          description: "Tarayıcı renk şeması (varsayılan: dark)"
        }
      }
    }
  },
  {
    name: "github_read_file",
    description: "okanozgur16/maas-takip deposundan dosya (isteğe bağlı satır aralığıyla) veya klasör listesi okur. Büyük dosyalar (index.html) için start_line ve end_line vererek tam istediğin bölümü hızlıca okuyabilirsin.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Örn: 'index.html', 'server/bildirim-worker.js', 'firestore.rules' veya '' (kök klasör)" },
        start_line: { type: "integer", description: "Başlangıç satırı (1-tabanlı, isteğe bağlı)" },
        end_line: { type: "integer", description: "Bitiş satırı (dahil, isteğe bağlı)" },
        ref: { type: "string", description: "Dal veya commit (varsayılan: main)" }
      },
      required: ["path"]
    }
  },
  {
    name: "github_search_code",
    description: "okanozgur16/maas-takip içindeki bir dosyada (örn. index.html) metin veya regex araması yapar, eşleşen satır numaralarını ve çevresindeki satırları döndürür.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Aranacak dosya (örn: 'index.html')" },
        query: { type: "string", description: "Aranacak metin veya JavaScript regex deseni" },
        context_lines: { type: "integer", description: "Eşleşme etrafında gösterilecek satır sayısı (varsayılan: 3)" },
        max_matches: { type: "integer", description: "En fazla eşleşme sayısı (varsayılan: 25)" }
      },
      required: ["path", "query"]
    }
  },
  {
    name: "github_edit_and_push",
    description: "okanozgur16/maas-takip main dalındaki bir veya birden fazla dosyayı tek atomik commit ile düzenler/yazar ve doğrudan yayınlar. Commit atıldığı anda GitHub Actions otomatik olarak Cloudflare Pages + Cloudflare Worker + Firebase Firestore Rules yayınını ~30 saniyede gerçekleştirir.",
    inputSchema: {
      type: "object",
      properties: {
        commit_message: { type: "string", description: "Commit mesajı (örn: 'feat: ShiftPay v68 - ...')" },
        edits: {
          type: "array",
          description: "Mevcut dosyalarda birebir metin değiştirme listesi (index.html gibi büyük dosyalar için idealdir; birden fazla dosyada veya aynı dosyada birden fazla değişiklik verebilirsin)",
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
              old_text: { type: "string", description: "Dosyada mevcut olan birebir metin" },
              new_text: { type: "string", description: "Yerine yazılacak yeni metin" }
            },
            required: ["path", "old_text", "new_text"]
          }
        },
        files: {
          type: "array",
          description: "Tam içerik olarak yazılacak/oluşturulacak dosyalar (örn: version.json, sw.js, firestore.rules)",
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
              content: { type: "string" }
            },
            required: ["path", "content"]
          }
        },
        branch: { type: "string", description: "Hedef dal (varsayılan: main)" }
      },
      required: ["commit_message"]
    }
  },
  {
    name: "github_ci_status",
    description: "GitHub Actions (Deploy ShiftPay to Cloudflare Pages / Worker / Firebase) son çalışma durumunu ve adım adım sonuçlarını döndürür. Ayrıca GitHub Actions secret isimlerini listeleyebilir.",
    inputSchema: {
      type: "object",
      properties: {
        include_secrets_list: { type: "boolean", description: "True ise kayıtlı GitHub Actions secret adlarını da listeler" }
      }
    }
  },
  {
    name: "cloudflare_manage",
    description: "Cloudflare Worker (summer-mode-6176 veya shiftpay-mcp) gizli anahtarlarını (OWNER_TOKEN, VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT vb.), Cron zamanlayıcısını (schedules) ve KV veritabanını okur veya günceller.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "get_schedules",
            "set_schedules",
            "list_secrets",
            "put_secret",
            "delete_secret",
            "kv_list",
            "kv_get",
            "kv_put",
            "kv_delete"
          ]
        },
        worker_name: { type: "string", description: "Varsayılan: summer-mode-6176 (veya shiftpay-mcp)" },
        cron_expressions: {
          type: "array",
          items: { type: "string" },
          description: "set_schedules için cron dizisi, örn: ['0 * * * *']"
        },
        secret_name: { type: "string", description: "put_secret / delete_secret için secret adı (örn: OWNER_TOKEN)" },
        secret_value: { type: "string", description: "put_secret için yeni gizli değer" },
        kv_prefix: { type: "string", description: "kv_list için isteğe bağlı önek" },
        kv_key: { type: "string", description: "kv_get / kv_put / kv_delete için anahtar" },
        kv_value: { type: "string", description: "kv_put için değer" }
      },
      required: ["action"]
    }
  },
  {
    name: "firebase_manage",
    description: "Firebase (maas-takip-sync) üzerinde tam yönetici yetkisi: aktif firestore.rules okuma, test edip yayınlama, ve Firestore belgelerini (örn: sync/{id}) okuma, listeleme veya kalıcı olarak silme (delete_doc).",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["get_rules", "publish_rules", "get_doc", "list_docs", "delete_doc"]
        },
        rules_content: { type: "string", description: "publish_rules için tam firestore.rules içeriği" },
        collection: { type: "string", description: "Firestore koleksiyonu (varsayılan: 'sync')" },
        doc_id: { type: "string", description: "get_doc veya delete_doc için belge ID'si (örn: 64-hex hash)" },
        page_size: { type: "integer", description: "list_docs için sayfa boyutu (varsayılan: 25)" }
      },
      required: ["action"]
    }
  }
];

async function readRawGitHubFile(env, filePath, ref = "main") {
  const res = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}?ref=${encodeURIComponent(ref)}`,
    {
      headers: {
        "Authorization": `Bearer ${env.GITHUB_PAT}`,
        "Accept": "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ShiftPay-MCP-Worker/1.0"
      }
    }
  );
  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`Dosya okunamadı (${filePath} @ ${ref}) -> ${res.status}: ${errTxt.slice(0, 400)}`);
  }
  return await res.text();
}

async function runTool(name, args, env) {
  args = args || {};

  if (name === "live_site_visual_check") {
    const isMobile = args.device === "mobile";
    const width = isMobile ? 390 : 1280;
    const height = isMobile ? 844 : 820;
    const kvKey = isMobile ? "live_shot_mobile" : "live_shot_desktop";
    const baseTarget = args.url || LIVE_URL;
    const isDefaultUrl = !args.url || args.url === LIVE_URL || args.url === "https://shiftpay-app.pages.dev";

    // 1. Live version.json & HTTP check directly from edge
    let verInfo = "bilinmiyor";
    try {
      const vRes = await fetch(`${LIVE_URL}version.json?t=${Date.now()}`, { cf: { cacheTtl: 0 } });
      verInfo = `${vRes.status} -> ${(await vRes.text()).trim()}`;
    } catch (e) {
      verInfo = `hata: ${e.message}`;
    }

    // 2. Primary: Read real Google Chrome headless PNG captured by Post-Deploy CI in Cloudflare KV (0 rate limit, instant!)
    if (isDefaultUrl && env.KV && (!args.color_scheme || args.color_scheme === "dark")) {
      const buf = await env.KV.get(kvKey, "arrayBuffer");
      const metaRaw = await env.KV.get("live_shot_meta", "text");
      if (buf && buf.byteLength > 1000) {
        const u8 = new Uint8Array(buf);
        return {
          content: [
            {
              type: "text",
              text: `✅ Canlı Site Görsel Kontrolü (${isMobile ? "Telefon 390x844" : "Masaüstü 1280x820"} — Google Chrome Gerçek Render PNG)\n• URL: ${LIVE_URL}\n• Canlı version.json: ${verInfo}\n• Çekim Bilgisi: ${metaRaw || "son yayın"}\n• Görsel Boyutu: ${u8.byteLength} bayt`
            },
            {
              type: "image",
              data: b64FromBytes(u8),
              mimeType: "image/png"
            }
          ]
        };
      }
    }

    // 3. Fallback for custom URLs or light-theme ad-hoc checks: Microlink -> Thum.io Chromium fallback
    const sep = baseTarget.includes("?") ? "&" : "?";
    const targetUrl = `${baseTarget}${sep}_cb=${Date.now()}`;
    let imgBuf = null;
    try {
      const mlParams = new URLSearchParams({
        url: targetUrl,
        screenshot: "true",
        "viewport.width": String(width),
        "viewport.height": String(height),
        "viewport.deviceScaleFactor": "1",
        "viewport.isMobile": isMobile ? "true" : "false",
        colorScheme: args.color_scheme === "light" ? "light" : "dark"
      });
      const mlRes = await fetch(`https://api.microlink.io/?${mlParams.toString()}`);
      const mlJson = await mlRes.json();
      if (mlJson?.data?.screenshot?.url) {
        const r = await fetch(mlJson.data.screenshot.url);
        if (r.ok) imgBuf = new Uint8Array(await r.arrayBuffer());
      }
    } catch (_) {}

    if (!imgBuf) {
      const thumUrl = `https://image.thum.io/get/png/viewportWidth/${width}/width/${width}/crop/${height}/noanimate/${targetUrl}`;
      const tRes = await fetch(thumUrl);
      if (tRes.ok && (tRes.headers.get("content-type") || "").includes("image")) {
        imgBuf = new Uint8Array(await tRes.arrayBuffer());
      }
    }

    if (!imgBuf) {
      return {
        content: [{
          type: "text",
          text: `Canlı version.json: ${verInfo}\nAnlık ekran görüntüsü alınamadı; son CI yayını tamamlandığında KV üzerinden otomatik hazır olur.`
        }]
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `✅ Canlı Site Anlık Görsel Kontrolü (${isMobile ? "Telefon 390x844" : "Masaüstü 1280x820"})\n• URL: ${targetUrl}\n• Canlı version.json: ${verInfo}\n• Görsel Boyutu: ${imgBuf.byteLength} bayt`
        },
        {
          type: "image",
          data: b64FromBytes(imgBuf),
          mimeType: "image/png"
        }
      ]
    };
  }

  if (name === "github_read_file") {
    const ref = args.ref || "main";
    const p = (args.path || "").replace(/^\/+/, "");
    if (!p) {
      const items = await ghReq(env, `/contents?ref=${encodeURIComponent(ref)}`);
      const list = Array.isArray(items) ? items.map(x => `${x.type === "dir" ? "📁" : "📄"} ${x.path} (${x.size || 0} B)`).join("\n") : JSON.stringify(items);
      return { content: [{ type: "text", text: list }] };
    }
    // Check if directory first when no extension
    if (!p.includes(".") || p.endsWith("/")) {
      const meta = await ghReq(env, `/contents/${p.replace(/\/+$/, "")}?ref=${encodeURIComponent(ref)}`);
      if (Array.isArray(meta)) {
        const list = meta.map(x => `${x.type === "dir" ? "📁" : "📄"} ${x.path} (${x.size || 0} B)`).join("\n");
        return { content: [{ type: "text", text: list }] };
      }
    }
    const text = await readRawGitHubFile(env, p, ref);
    const lines = text.split("\n");
    const total = lines.length;
    const s = Math.max(1, args.start_line || 1);
    const e = Math.min(total, args.end_line || Math.min(total, s + 299));
    const numbered = lines.slice(s - 1, e).map((ln, idx) => `${s + idx}: ${ln}`).join("\n");
    return {
      content: [{
        type: "text",
        text: `📄 ${p} (@${ref}) — Satır ${s}..${e} / Toplam ${total} satır:\n\n${numbered}`
      }]
    };
  }

  if (name === "github_search_code") {
    const p = (args.path || "index.html").replace(/^\/+/, "");
    const text = await readRawGitHubFile(env, p, "main");
    const lines = text.split("\n");
    const ctx = Math.min(10, Math.max(0, args.context_lines ?? 3));
    const maxM = Math.min(60, Math.max(1, args.max_matches ?? 25));
    let re;
    try {
      re = new RegExp(args.query, "i");
    } catch (_) {
      re = new RegExp(args.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        const a = Math.max(0, i - ctx);
        const b = Math.min(lines.length - 1, i + ctx);
        const block = [];
        for (let k = a; k <= b; k++) {
          block.push(`${k === i ? ">>>" : "   "} ${k + 1}: ${lines[k].slice(0, 260)}`);
        }
        out.push(block.join("\n"));
        if (out.length >= maxM) break;
      }
    }
    return {
      content: [{
        type: "text",
        text: out.length
          ? `🔍 ${p} içinde "${args.query}" için ${out.length} eşleşme bulundu:\n\n${out.join("\n---\n")}`
          : `🔍 ${p} içinde "${args.query}" için eşleşme bulunamadı.`
      }]
    };
  }

  if (name === "github_edit_and_push") {
    const branch = args.branch || "main";
    const edits = Array.isArray(args.edits) ? args.edits : [];
    const fullFiles = Array.isArray(args.files) ? args.files : [];
    if (!edits.length && !fullFiles.length) {
      throw new Error("En az bir 'edits' veya 'files' öğesi verilmelidir.");
    }

    // 1. Get latest branch commit & base tree
    const refData = await ghReq(env, `/git/ref/heads/${branch}`);
    const latestCommitSha = refData.object.sha;
    const commitData = await ghReq(env, `/git/commits/${latestCommitSha}`);
    const baseTreeSha = commitData.tree.sha;

    // 2. Build final contents map per touched path
    const fileMap = new Map();
    for (const f of fullFiles) {
      fileMap.set(f.path.replace(/^\/+/, ""), f.content);
    }
    for (const ed of edits) {
      const p = ed.path.replace(/^\/+/, "");
      if (!fileMap.has(p)) {
        fileMap.set(p, await readRawGitHubFile(env, p, latestCommitSha));
      }
      const cur = fileMap.get(p);
      if (!cur.includes(ed.old_text)) {
        throw new Error(`'${p}' dosyasında aranan old_text bulunamadı! İlk 120 karakter: ${ed.old_text.slice(0, 120)}`);
      }
      fileMap.set(p, cur.replace(ed.old_text, () => ed.new_text));
    }

    // 3. Create Git blobs for each modified file (handles arbitrary size like 530KB index.html cleanly!)
    const treeItems = [];
    for (const [p, content] of fileMap.entries()) {
      const blob = await ghReq(env, `/git/blobs`, {
        method: "POST",
        body: { content: b64FromUtf8(content), encoding: "base64" }
      });
      treeItems.push({ path: p, mode: "100644", type: "blob", sha: blob.sha });
    }

    // 4. Create tree, commit, and update branch ref
    const newTree = await ghReq(env, `/git/trees`, {
      method: "POST",
      body: { base_tree: baseTreeSha, tree: treeItems }
    });
    const newCommit = await ghReq(env, `/git/commits`, {
      method: "POST",
      body: {
        message: args.commit_message,
        tree: newTree.sha,
        parents: [latestCommitSha]
      }
    });
    await ghReq(env, `/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: { sha: newCommit.sha, force: false }
    });

    return {
      content: [{
        type: "text",
        text: `✅ GitHub '${branch}' dalına commit atıldı!\n• Commit SHA: ${newCommit.sha.slice(0, 7)} (${newCommit.sha})\n• Değişen Dosyalar (${fileMap.size}): ${Array.from(fileMap.keys()).join(", ")}\n• GitHub Actions 4'lü otomatik yayın hattı (Pages + Worker + Firebase Rules) tetiklendi (~30 sn içinde tamamlanır; 'github_ci_status' ile kontrol edebilirsin).`
      }]
    };
  }

  if (name === "github_ci_status") {
    const runs = await ghReq(env, `/actions/runs?per_page=3`);
    const top = (runs.workflow_runs || []).slice(0, 3);
    const lines = [];
    for (const r of top) {
      let stepSummary = "";
      try {
        const jobs = await ghReq(env, `/actions/runs/${r.id}/jobs`);
        const steps = jobs.jobs?.[0]?.steps || [];
        stepSummary = steps.map(s => `    ${s.conclusion === "success" ? "✓" : s.status === "in_progress" ? "⏳" : s.conclusion || s.status} ${s.name}`).join("\n");
      } catch (_) {}
      lines.push(`• Run #${r.run_number} (${r.head_sha.slice(0, 7)} — "${r.display_title}"): status=${r.status}, conclusion=${r.conclusion || "devam ediyor"}\n${stepSummary}`);
    }
    if (args.include_secrets_list) {
      const sec = await ghReq(env, `/actions/secrets`);
      const sNames = (sec.secrets || []).map(s => `${s.name} (güncelleme: ${s.updated_at})`).join(", ");
      lines.push(`\n🔐 Kayıtlı GitHub Actions Secret'ları: ${sNames}`);
    }
    return { content: [{ type: "text", text: lines.join("\n\n") }] };
  }

  if (name === "cloudflare_manage") {
    const worker = args.worker_name || CF_PROD_WORKER;
    const act = args.action;

    if (act === "get_schedules") {
      const r = await cfReq(env, `/accounts/${CF_ACCOUNT}/workers/scripts/${worker}/schedules`);
      return { content: [{ type: "text", text: `⏱️ Worker '${worker}' Cron Zamanlayıcıları:\n${JSON.stringify(r.result, null, 2)}` }] };
    }
    if (act === "set_schedules") {
      const body = (args.cron_expressions || []).map(c => ({ cron: c }));
      const r = await cfReq(env, `/accounts/${CF_ACCOUNT}/workers/scripts/${worker}/schedules`, { method: "PUT", body });
      return { content: [{ type: "text", text: `✅ Worker '${worker}' Cron güncellendi:\n${JSON.stringify(r.result, null, 2)}` }] };
    }
    if (act === "list_secrets") {
      const r = await cfReq(env, `/accounts/${CF_ACCOUNT}/workers/scripts/${worker}/secrets`);
      const names = (r.result || []).map(s => `• ${s.name} (${s.type})`);
      return { content: [{ type: "text", text: `🔐 Worker '${worker}' Secret İsimleri:\n${names.join("\n") || "(yok)"}` }] };
    }
    if (act === "put_secret") {
      if (!args.secret_name || args.secret_value === undefined) throw new Error("secret_name ve secret_value zorunludur.");
      await cfReq(env, `/accounts/${CF_ACCOUNT}/workers/scripts/${worker}/secrets`, {
        method: "PUT",
        body: { name: args.secret_name, text: String(args.secret_value), type: "secret_text" }
      });
      return { content: [{ type: "text", text: `✅ Worker '${worker}' üzerinde '${args.secret_name}' gizli anahtarı güvenli şekilde güncellendi!` }] };
    }
    if (act === "delete_secret") {
      if (!args.secret_name) throw new Error("secret_name zorunludur.");
      await cfReq(env, `/accounts/${CF_ACCOUNT}/workers/scripts/${worker}/secrets/${encodeURIComponent(args.secret_name)}`, { method: "DELETE" });
      return { content: [{ type: "text", text: `🗑️ Worker '${worker}' üzerinden '${args.secret_name}' silindi.` }] };
    }
    if (act === "kv_list") {
      const q = args.kv_prefix ? `?prefix=${encodeURIComponent(args.kv_prefix)}` : "";
      const r = await cfReq(env, `/accounts/${CF_ACCOUNT}/storage/kv/namespaces/${CF_KV_NS}/keys${q}`);
      return { content: [{ type: "text", text: `📦 KV Anahtarları (${(r.result || []).length}):\n${JSON.stringify(r.result, null, 2)}` }] };
    }
    if (act === "kv_get") {
      const val = await cfReq(env, `/accounts/${CF_ACCOUNT}/storage/kv/namespaces/${CF_KV_NS}/values/${encodeURIComponent(args.kv_key)}`);
      return { content: [{ type: "text", text: typeof val === "string" ? val : JSON.stringify(val, null, 2) }] };
    }
    if (act === "kv_put") {
      await cfReq(env, `/accounts/${CF_ACCOUNT}/storage/kv/namespaces/${CF_KV_NS}/values/${encodeURIComponent(args.kv_key)}`, {
        method: "PUT",
        headers: { "Content-Type": "text/plain" },
        body: String(args.kv_value ?? "")
      });
      return { content: [{ type: "text", text: `✅ KV '${args.kv_key}' kaydedildi.` }] };
    }
    if (act === "kv_delete") {
      await cfReq(env, `/accounts/${CF_ACCOUNT}/storage/kv/namespaces/${CF_KV_NS}/values/${encodeURIComponent(args.kv_key)}`, { method: "DELETE" });
      return { content: [{ type: "text", text: `🗑️ KV '${args.kv_key}' silindi.` }] };
    }
  }

  if (name === "firebase_manage") {
    const tok = await getGoogleAccessToken(env.FIREBASE_SA_JSON);
    const hdrs = { "Authorization": `Bearer ${tok}`, "Content-Type": "application/json" };
    const col = args.collection || "sync";
    const act = args.action;

    if (act === "get_rules") {
      const rel = await (await fetch(`https://firebaserules.googleapis.com/v1/projects/${FB_PROJECT}/releases/cloud.firestore`, { headers: hdrs })).json();
      const rs = await (await fetch(`https://firebaserules.googleapis.com/v1/${rel.rulesetName}`, { headers: hdrs })).json();
      const content = rs?.source?.files?.[0]?.content || "";
      return { content: [{ type: "text", text: `🔥 Aktif Ruleset: ${rel.rulesetName}\n\n${content}` }] };
    }
    if (act === "publish_rules") {
      if (!args.rules_content) throw new Error("rules_content zorunludur.");
      const tRes = await (await fetch(`https://firebaserules.googleapis.com/v1/projects/${FB_PROJECT}:test`, {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content: args.rules_content }] }, testSuite: { testCases: [] } })
      })).json();
      const errs = (tRes.issues || []).filter(i => i.severity === "ERROR");
      if (errs.length) throw new Error(`Firestore kural derleme hatası: ${JSON.stringify(errs)}`);

      const cRes = await (await fetch(`https://firebaserules.googleapis.com/v1/projects/${FB_PROJECT}/rulesets`, {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content: args.rules_content }] } })
      })).json();
      await fetch(`https://firebaserules.googleapis.com/v1/projects/${FB_PROJECT}/releases/cloud.firestore`, {
        method: "PATCH",
        headers: hdrs,
        body: JSON.stringify({ release: { name: `projects/${FB_PROJECT}/releases/cloud.firestore`, rulesetName: cRes.name } })
      });
      return { content: [{ type: "text", text: `✅ Yeni Firestore kuralları yayınlandı: ${cRes.name}` }] };
    }
    if (act === "list_docs") {
      const sz = Math.min(100, Math.max(1, args.page_size || 25));
      const r = await fetch(`https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents/${col}?pageSize=${sz}`, { headers: hdrs });
      const j = await r.json();
      const docs = (j.documents || []).map(d => {
        const id = d.name.split("/").pop();
        const cLen = (d.fields?.c?.stringValue || "").length;
        const uVal = d.fields?.u?.integerValue || "0";
        return `• ${id} (şifreli veri boyutu: ${cLen} B, u: ${uVal}, updateTime: ${d.updateTime})`;
      });
      return { content: [{ type: "text", text: `🔥 Firestore '${col}' Koleksiyonu (${docs.length} belge):\n${docs.join("\n") || "(boş)"}` }] };
    }
    if (act === "get_doc") {
      if (!args.doc_id) throw new Error("doc_id zorunludur.");
      const r = await fetch(`https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents/${col}/${encodeURIComponent(args.doc_id)}`, { headers: hdrs });
      if (r.status === 404) return { content: [{ type: "text", text: `Belge bulunamadı (404): ${col}/${args.doc_id}` }] };
      const d = await r.json();
      const cLen = (d.fields?.c?.stringValue || "").length;
      return { content: [{ type: "text", text: `Belge: ${col}/${args.doc_id}\nupdateTime: ${d.updateTime}\nşifreli c uzunluğu: ${cLen} B\nu: ${d.fields?.u?.integerValue}` }] };
    }
    if (act === "delete_doc") {
      if (!args.doc_id) throw new Error("doc_id zorunludur.");
      const r = await fetch(`https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents/${col}/${encodeURIComponent(args.doc_id)}`, {
        method: "DELETE",
        headers: hdrs
      });
      if (!r.ok && r.status !== 404) {
        throw new Error(`Silme hatası (${r.status}): ${await r.text()}`);
      }
      return { content: [{ type: "text", text: `🗑️ Firestore '${col}/${args.doc_id}' belgesi yönetici yetkisiyle kalıcı olarak silindi!` }] };
    }
  }

  throw new Error(`Bilinmeyen araç: ${name}`);
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version",
  "Access-Control-Expose-Headers": "Mcp-Session-Id"
};

async function handleJsonRpcMessage(msg, env) {
  if (!msg || typeof msg !== "object") {
    return { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } };
  }
  const { id, method, params } = msg;
  // JSON-RPC notifications have no id
  if (id === undefined || id === null && typeof method === "string" && method.startsWith("notifications/")) {
    return null;
  }
  if (method === "initialize") {
    const clientVer = params?.protocolVersion;
    const negotiated = clientVer === "2024-11-05" ? "2024-11-05" : "2025-03-26";
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: negotiated,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "shiftpay-tam-yetki", version: "1.0.0" },
        instructions: "ShiftPay 7/24 Tam Yetkili Bulut MCP Sunucusu: GitHub okuma/arama/push, Cloudflare Worker secret & cron & KV yönetimi, Firebase Firestore kural & belge yönetimi ve canlı site gerçek ekran görüntüsü (masaüstü & mobil PNG)."
      }
    };
  }
  if (method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }
  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }
  if (method === "tools/call") {
    try {
      const res = await runTool(params?.name, params?.arguments, env);
      return { jsonrpc: "2.0", id, result: res };
    } catch (err) {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [{ type: "text", text: `❌ Hata (${params?.name}): ${err?.message || String(err)}` }]
        }
      };
    }
  }
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    const url = new URL(request.url);
    const prefix = "/mcp/";
    if (!url.pathname.startsWith(prefix)) {
      return new Response("Not Found", { status: 404 });
    }
    const token = url.pathname.slice(prefix.length).replace(/\/+$/, "");
    if (!env.MCP_PATH_SECRET || !timingSafeEq(token, env.MCP_PATH_SECRET)) {
      return new Response("Not Found", { status: 404 });
    }

    if (request.method === "DELETE") {
      return new Response(null, { status: 200, headers: CORS });
    }
    if (request.method === "GET") {
      // Streamable HTTP spec: 405 signals client to use POST JSON-RPC directly
      return new Response("Method Not Allowed", { status: 405, headers: { ...CORS, "Allow": "POST, DELETE, OPTIONS" } });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: CORS });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    if (Array.isArray(payload)) {
      const results = [];
      for (const item of payload) {
        const r = await handleJsonRpcMessage(item, env);
        if (r !== null) results.push(r);
      }
      if (!results.length) return new Response(null, { status: 202, headers: CORS });
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    const reply = await handleJsonRpcMessage(payload, env);
    if (reply === null) {
      return new Response(null, { status: 202, headers: CORS });
    }
    return new Response(JSON.stringify(reply), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  }
};
