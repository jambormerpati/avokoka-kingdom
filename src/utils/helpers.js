import { APP_NAME } from "../config.js";
import { CSS } from "../styles.js";

export function esc(value){
  if(value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function num(value){
  if(value === null || value === undefined || value === ""){
    return null;
  }

  const n = Number(value);

  return Number.isFinite(n) ? n : null;
}

export function dateToday(){
  return new Intl.DateTimeFormat(
    "en-CA",
    {timeZone:"Asia/Jakarta"}
  ).format(new Date());
}

export function makeId(prefix=""){
  return prefix +
    crypto.randomUUID()
      .replaceAll("-","")
      .substring(0,12);
}

export async function formToObject(request){
  const form = await request.formData();
  const data = {};

  for(const [key,value] of form.entries()){
    data[key] = String(value);
  }

  return data;
}

export function redirect(request,path){
  return Response.redirect(
    new URL(path,request.url).toString(),
    302
  );
}

export function html(body,status=200,extraHeaders={}){
  return new Response(
    body,
    {
      status,
      headers:{
        "content-type":"text/html; charset=UTF-8",
        "cache-control":"no-store",
        ...extraHeaders
      }
    }
  );
}

export function dbErrorMessage(err){
  const raw = err && err.message ? err.message : String(err);
  return raw || "Kesalahan database tidak diketahui.";
}

export function dbErrorPage(title, err, back){
  const message = dbErrorMessage(err);
  const active = title.toLowerCase().includes("nursery") ? "nursery" : "pohon";

  return html(
    layout(
      title,
      `
      <div class="card">
        <div class="notice notice-danger">
          <strong>Gagal menyimpan data.</strong>
        </div>
        <div class="card" style="background:#fff8f7; border-color:#f2c8c4">
          <strong>Pesan D1:</strong>
          <pre style="white-space:pre-wrap; word-break:break-word; margin-top:10px">${esc(message)}</pre>
        </div>
        <div class="actions">
          <a href="${back}" class="btn btn-secondary">Kembali</a>
        </div>
      </div>
      `,
      active,
      "admin"
    ),
    500
  );
}

export async function tableColumns(env, table){
  const result = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((result.results || []).map(x => x.name));
}

export async function insertCompatible(env, table, values){
  const cols = await tableColumns(env, table);
  const entries = Object.entries(values).filter(([key]) => cols.has(key));

  if(!entries.length){
    throw new Error(`Tabel ${table} tidak memiliki kolom yang cocok.`);
  }

  const names = entries.map(([key]) => key);
  const params = entries.map(([,value]) => value);
  const marks = names.map(() => "?").join(",");

  await env.DB.prepare(`
    INSERT INTO ${table} (${names.join(",")})
    VALUES (${marks})
  `).bind(...params).run();
}

export function field(label, name, value = "", type = "text", full = false, required = false){
  return `
    <div class="form-group ${full ? "full" : ""}">
      <label>${esc(label)}${required ? " *" : ""}</label>
      <input class="form-control" type="${esc(type)}" name="${esc(name)}" value="${esc(value)}" ${required ? "required" : ""}>
    </div>
  `;
}

export function selectField(label, name, options, value = "", full = false, required = false){
  return `
    <div class="form-group ${full ? "full" : ""}">
      <label>${esc(label)}${required ? " *" : ""}</label>
      <select class="form-control" name="${esc(name)}" ${required ? "required" : ""}>
        ${options}
      </select>
    </div>
  `;
}

export function textareaField(label, name, value = "", full = true){
  return `
    <div class="form-group ${full ? "full" : ""}">
      <label>${esc(label)}</label>
      <textarea class="form-control" name="${esc(name)}">${esc(value)}</textarea>
    </div>
  `;
}

export function formButtons(back){
  return `
    <div class="actions" style="margin-top:20px">
      <button class="btn btn-primary" type="submit">💾 Simpan</button>
      <a href="${back}" class="btn btn-secondary">Batal</a>
    </div>
  `;
}

export function layout(title, content, active = "", role = "admin"){
  const isUserLayout = role === "user";

  const nav = [
    ["dashboard","🏠","Dashboard","/"],
    ["data","","DATA KEBUN",""],
    ["pohon","🌳","Pohon","/pohon"],
    ["pohon-sampel","🌱","Pohon Sampel","/pohon-sampel"],
    ["blok","🌳","Blok","/blok"],
    ["plot","🌳","Plot","/plot"],
    ["nursery","🌱","Nursery","/nursery"],
    ["operasional","","OPERASIONAL",""],
    ["produksi","📦","Produksi","/produksi"],
    ["pemupukan","🧪","Pemupukan","/pemupukan"],
    ["penyiraman","💧","Penyiraman","/penyiraman"],
    ["penyakit","🦠","Penyakit","/penyakit"],
    ["pemeliharaan","🔧","Pemeliharaan","/pemeliharaan"],
    ["hasil","","HASIL KEBUN",""],
    ["panen","🧺","Panen","/panen"],
    ["lainnya","","LAINNYA",""],
    ["foto","📷","Foto","/foto"],
    ["catatan","📝","Catatan","/catatan"],
    ["konten","","KONTEN",""],
    ["artikel","📰","Artikel","/artikel"]
  ];

  if(isUserLayout){
    nav.length = 0;
    nav.push(["artikel", "📰", "Artikel", "/artikel"]);
  }

  const headerLabel = isUserLayout ? "User" : "Admin";
  const logoutUrl = isUserLayout ? "/user-logout" : "/logout";

  let menu = "";
  for(const item of nav){
    const [key, icon, label, url] = item;
    if(!url){
      menu += `<div class="nav-section">${esc(label)}</div>`;
    }else{
      menu += `
        <a href="${url}" class="nav-link ${active === key ? "active" : ""}" onclick="closeMenu()">
          <span class="nav-icon">${icon}</span>
          <span>${esc(label)}</span>
        </a>
      `;
    }
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} - ${APP_NAME}</title>
<style>${CSS}</style>
</head>
<body>

<header class="topbar">
  <button class="menu-btn" onclick="toggleMenu()" aria-label="Menu">☰</button>
  <div class="brand">🥑 ${APP_NAME}</div>
  <div class="top-right">
    <span class="admin-label">${headerLabel}</span>
    <a href="${logoutUrl}" class="btn btn-secondary btn-sm">Keluar</a>
  </div>
</header>

<aside id="sidebar" class="sidebar">
  <div class="sidebar-inner">
    ${menu}
  </div>
</aside>

<div id="overlay" class="mobile-overlay" onclick="closeMenu()"></div>

<main class="main">
  <div class="container">
    ${content}
    <div class="footer">${APP_NAME} · Digital Farm Management</div>
  </div>
</main>

<script>
function toggleMenu(){
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  sidebar.classList.toggle("open");
  overlay.classList.toggle("open");
}
function closeMenu(){
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  sidebar.classList.remove("open");
  overlay.classList.remove("open");
}
</script>

</body>
</html>`;
}
