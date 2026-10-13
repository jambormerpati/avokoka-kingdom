import { esc, dateToday, formToObject, redirect, html, dbErrorPage, insertCompatible, field, selectField, textareaField, formButtons, layout } from "../utils/helpers.js";
import { isAdminAccess, isUserAccess } from "../utils/auth.js";

function slugify(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function articleDate(value = "") {
  return value || dateToday();
}

function articleStatusBadge(status) {
  return status === "published"
    ? '<span class="badge badge-green">Published</span>'
    : '<span class="badge badge-gray">Draft</span>';
}

export function articleOwnerWhere(access){
  if(isAdminAccess(access)) return { sql:"", params:[] };
  if(isUserAccess(access)) return { sql:" WHERE author_id = ? ", params:[access.session.user_id] };
  return { sql:" WHERE 1 = 0 ", params:[] };
}

export async function getArticlesForAccess(env, access){
  const filter = articleOwnerWhere(access);
  const result = await env.DB.prepare(`
    SELECT * FROM artikel ${filter.sql}
    ORDER BY COALESCE(tanggal,created_at) DESC, created_at DESC
  `).bind(...filter.params).all();

  return result.results || [];
}

export async function getArticleForAccess(env, access, articleId){
  if(isAdminAccess(access)){
    return await env.DB.prepare(`SELECT * FROM artikel WHERE id=? LIMIT 1`).bind(articleId).first();
  }
  if(isUserAccess(access)){
    return await env.DB.prepare(`SELECT * FROM artikel WHERE id=? AND author_id=? LIMIT 1`).bind(articleId, access.session.user_id).first();
  }
  return null;
}

export function getArticleAuthorId(access){
  if(!access || isAdminAccess(access)) return null;
  if(isUserAccess(access)) return access.session.user_id;
  return null;
}

export function getArticleAuthorName(access){
  if(!access || isAdminAccess(access)) return "Sapta Sebayang";
  if(isUserAccess(access)) return access.session.nama || access.session.username || "User";
  return "User";
}

export async function artikelList(env, access) {
  const rows = await getArticlesForAccess(env, access);
  const isAdmin = isAdminAccess(access);

  const title = isAdmin ? "Artikel" : "Artikel Saya";
  const description = isAdmin ? "Kelola seluruh artikel Avokoka Kingdom." : "Kelola artikel yang Anda buat.";

  const table = rows.length ? `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Tanggal</th><th>Judul</th><th>Kategori</th><th>Penulis</th><th>Status</th><th>Slug</th><th>Aksi</th></tr>
        </thead>
        <tbody>
        ${rows.map(r => `
          <tr>
            <td>${esc(r.tanggal || r.created_at || "")}</td>
            <td>
              <strong>${esc(r.judul || "-")}</strong>
              ${r.ringkasan ? `<br><small style="color:#6b7770">${esc(r.ringkasan)}</small>` : ""}
            </td>
            <td>${esc(r.kategori || "-")}</td>
            <td>${esc(r.penulis || "-")}</td>
            <td>${articleStatusBadge(r.status)}</td>
            <td><small>${esc(r.slug || "-")}</small></td>
            <td>
              <div class="actions">
                <a href="/artikel/${encodeURIComponent(r.id)}/edit" class="btn btn-secondary btn-sm">✏️ Edit</a>
                ${isAdmin && r.status !== "published" ? `
                  <form method="POST" action="/artikel/${encodeURIComponent(r.id)}/publish" onsubmit="return confirm('Publikasikan artikel ini?')">
                    <button type="submit" class="btn btn-primary btn-sm">🌐 Publish</button>
                  </form>
                ` : ""}
                ${r.status === "published" && r.slug ? `
                  <a href="https://avokoka.sebayang.com/artikel/${encodeURIComponent(r.slug)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">👁️ Lihat</a>
                ` : ""}
                ${isAdmin || r.status !== "published" ? `
                  <form method="POST" action="/artikel/${encodeURIComponent(r.id)}/delete" onsubmit="return confirm('Hapus artikel ini?')">
                    <button type="submit" class="btn btn-danger btn-sm">🗑️ Hapus</button>
                  </form>
                ` : ""}
              </div>
            </td>
          </tr>
        `).join("")}
        </tbody>
      </table>
    </div>
  ` : `<div class="empty">Belum ada artikel.</div>`;

  const content = `
    <div class="page-title">
      <div><h1>📰 ${title}</h1><p>${description}</p></div>
      ${isAdmin ? `
        <a href="/artikel/new" class="btn btn-primary">＋ Tulis Artikel</a>
      ` : `
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <a href="/artikel/new" class="btn btn-primary">＋ Tulis Artikel</a>
          <a href="/account/password" class="btn btn-secondary">🔑 Ganti Password</a>
        </div>
      `}
    </div>
    ${!isAdmin ? `<div class="notice notice-info">Artikel yang dibuat oleh User akan tersimpan sebagai <strong>Draft</strong> dan harus dipublikasikan oleh Admin.</div>` : ""}
    <div class="card">${table}</div>
  `;

  return layout(title, content, "artikel", isAdmin ? "admin" : "user");
}

export async function artikelForm(env, access, data = {}, edit = false) {
  const isAdmin = isAdminAccess(access);
  const status = isAdmin ? (data.status || "draft") : "draft";
  const penulis = isAdmin ? (data.penulis || "Sapta Sebayang") : getArticleAuthorName(access);
  const tanggal = data.tanggal || dateToday();

  const content = `
    <div class="page-title">
      <div><h1>${edit ? "✏️ Edit Artikel" : "📰 Tulis Artikel"}</h1><p>${edit ? "Perbarui artikel." : "Buat artikel baru Avokoka Kingdom."}</p></div>
      <a href="/artikel" class="btn btn-secondary">← Kembali</a>
    </div>

    ${!isAdmin ? `<div class="notice notice-info">Artikel User disimpan sebagai <strong>Draft</strong>. Publikasi dilakukan oleh Admin.</div>` : ""}

    <div class="card">
      <form method="POST" action="${edit ? `/artikel/${encodeURIComponent(data.id)}/update` : "/artikel/new"}">
        <div class="form-grid">
          ${field("Judul", "judul", data.judul || "", "text", true, true)}
          ${field("Slug", "slug", data.slug || "", "text")}
          ${field("Kategori", "kategori", data.kategori || "", "text")}
          ${field("Tanggal", "tanggal", tanggal, "date")}
          ${field("Penulis", "penulis", penulis, "text")}
          ${field("Gambar", "gambar", data.gambar || "", "url")}
          ${textareaField("Ringkasan", "ringkasan", data.ringkasan || "", true)}
          ${textareaField("Isi Artikel", "isi", data.isi || "", true)}
          ${field("SEO Title", "seo_title", data.seo_title || "", "text", true)}
          ${textareaField("SEO Description", "seo_description", data.seo_description || "", true)}
          ${isAdmin ? selectField("Status", "status", `
            <option value="draft" ${status === "draft" ? "selected" : ""}>Draft</option>
            <option value="published" ${status === "published" ? "selected" : ""}>Published</option>
          `, status) : `<input type="hidden" name="status" value="draft">`}
        </div>
        ${formButtons("/artikel")}
      </form>
    </div>
  `;

  return layout(edit ? "Edit Artikel" : "Tulis Artikel", content, "artikel", isAdmin ? "admin" : "user");
}

export async function artikelSave(request, env, access, id = null) {
  if (!access) return redirect(request, "/user-login");

  const data = await formToObject(request);
  const judul = (data.judul || "").trim();
  const isi = (data.isi || "").trim();

  if (!judul || !isi) {
    return html(layout("Artikel", `<div class="card"><div class="notice notice-danger">Judul dan Isi artikel wajib diisi.</div><a href="/artikel" class="btn btn-secondary">← Kembali</a></div>`, "artikel", isAdminAccess(access) ? "admin" : "user"), 400);
  }

  const isAdmin = isAdminAccess(access);
  const slug = slugify(data.slug || judul);
  if (!slug) {
    return html(layout("Artikel", `<div class="card"><div class="notice notice-danger">Slug artikel tidak dapat dibuat.</div><a href="/artikel" class="btn btn-secondary">← Kembali</a></div>`, "artikel", isAdmin ? "admin" : "user"), 400);
  }

  if (id) {
    const article = await getArticleForAccess(env, access, id);
    if (!article) {
      return html(layout("Akses Ditolak", `<div class="card"><div class="notice notice-danger">Artikel tidak ditemukan atau Anda tidak memiliki akses.</div><a href="/artikel" class="btn btn-secondary">← Kembali</a></div>`, "artikel", isAdmin ? "admin" : "user"), 403);
    }

    const status = isAdmin ? (data.status === "published" ? "published" : "draft") : "draft";
    const penulis = isAdmin ? (data.penulis || article.penulis || "Sapta Sebayang") : getArticleAuthorName(access);

    try {
      await env.DB.prepare(`
        UPDATE artikel SET
          slug=?, judul=?, ringkasan=?, isi=?, kategori=?, gambar=?,
          penulis=?, status=?, seo_title=?, seo_description=?, tanggal=?
        WHERE id=?
      `).bind(
        slug, judul, data.ringkasan || null, isi, data.kategori || null,
        data.gambar || null, penulis, status, data.seo_title || null,
        data.seo_description || null, articleDate(data.tanggal), id
      ).run();

      return redirect(request, "/artikel");
    } catch (err) {
      return dbErrorPage("Artikel", err, "/artikel");
    }
  }

  const newId = crypto.randomUUID();
  const authorId = getArticleAuthorId(access);
  const penulis = isAdmin ? (data.penulis || "Sapta Sebayang") : getArticleAuthorName(access);
  const status = isAdmin ? (data.status === "published" ? "published" : "draft") : "draft";
  const publishedAt = status === "published" ? new Date().toISOString() : null;

  try {
    await insertCompatible(env, "artikel", {
      id: newId, author_id: authorId, slug, judul, ringkasan: data.ringkasan || null,
      isi, kategori: data.kategori || null, gambar: data.gambar || null, penulis,
      status, seo_title: data.seo_title || null, seo_description: data.seo_description || null,
      tanggal: articleDate(data.tanggal), published_at: publishedAt
    });

    return redirect(request, "/artikel");
  } catch (err) {
    return dbErrorPage("Artikel", err, "/artikel");
  }
}

export async function artikelPublish(request, env, id) {
  const access = { type: "admin", session: true };
  const article = await getArticleForAccess(env, access, id);
  if (!article) {
    return html(layout("Artikel", `<div class="card"><div class="notice notice-danger">Artikel tidak ditemukan.</div><a href="/artikel" class="btn btn-secondary">← Kembali</a></div>`, "artikel"), 404);
  }

  try {
    let publishedAt = article.published_at || new Date().toISOString();
    await env.DB.prepare(`UPDATE artikel SET status='published', published_at=? WHERE id=?`).bind(publishedAt, id).run();
    return redirect(request, "/artikel");
  } catch (err) {
    return dbErrorPage("Artikel", err, "/artikel");
  }
}

export async function artikelDelete(request, env, access, id) {
  if (!access) return redirect(request, "/user-login");

  const article = await getArticleForAccess(env, access, id);
  if (!article) {
    return html(layout("Akses Ditolak", `<div class="card"><div class="notice notice-danger">Artikel tidak ditemukan atau Anda tidak memiliki akses.</div><a href="/artikel" class="btn btn-secondary">← Kembali</a></div>`, "artikel", isAdminAccess(access) ? "admin" : "user"), 403);
  }

  if (isUserAccess(access) && article.status === "published") {
    return html(layout("Akses Ditolak", `<div class="card"><div class="notice notice-danger">Artikel yang sudah published tidak dapat dihapus oleh User.</div><a href="/artikel" class="btn btn-secondary">← Kembali</a></div>`, "artikel", "user"), 403);
  }

  try {
    await env.DB.prepare(`DELETE FROM artikel WHERE id=?`).bind(id).run();
    return redirect(request, "/artikel");
  } catch (err) {
    return dbErrorPage("Artikel", err, "/artikel");
  }
}
