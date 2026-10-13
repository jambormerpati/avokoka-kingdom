import { esc, dateToday, formToObject, redirect, html, dbErrorPage, insertCompatible, field, selectField, textareaField, formButtons, layout } from "../utils/helpers.js";
import { getPohon, getBlok, pohonOptions, blokOptions } from "./dropdowns.js";

export async function catatanList(env) {
  const result = await env.DB.prepare(`
    SELECT ct.*, p.kode_pohon, p.komoditas, p.varietas
    FROM catatan ct LEFT JOIN pohon p ON p.id = ct.pohon_id
    ORDER BY ct.tanggal DESC, ct.id DESC
  `).all();

  const rows = result.results || [];
  const table = rows.length ? `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Tanggal</th><th>Kategori</th><th>Judul</th><th>Pohon</th><th>Isi</th><th>Aksi</th></tr>
        </thead>
        <tbody>
        ${rows.map(r => `
          <tr>
            <td>${esc(r.tanggal || "")}</td>
            <td><span class="badge badge-green">${esc(r.kategori || "-")}</span></td>
            <td><strong>${esc(r.judul || "-")}</strong></td>
            <td>${r.kode_pohon ? `<strong>${esc(r.kode_pohon)}</strong><br><small>${esc(r.komoditas || "")} ${r.varietas ? " · " + esc(r.varietas) : ""}</small>` : "-"}</td>
            <td><div style="max-width:420px; white-space:pre-wrap; word-break:break-word;">${esc(r.isi || "-")}</div></td>
            <td>
              <div class="actions">
                <a href="/catatan/${encodeURIComponent(r.id)}/edit" class="btn btn-secondary btn-sm">✏️ Edit</a>
                <form method="POST" action="/catatan/${encodeURIComponent(r.id)}/delete" onsubmit="return confirm('Hapus catatan ini?')">
                  <button type="submit" class="btn btn-danger btn-sm">🗑️ Hapus</button>
                </form>
              </div>
            </td>
          </tr>
        `).join("")}
        </tbody>
      </table>
    </div>
  ` : `<div class="empty">Belum ada catatan.</div>`;

  const content = `
    <div class="page-title">
      <div><h1>📝 Catatan</h1><p>Catatan lapangan dan kejadian penting kebun.</p></div>
      <a href="/catatan/new" class="btn btn-primary">＋ Tambah Catatan</a>
    </div>
    <div class="card">${table}</div>
  `;

  return layout("Catatan", content, "catatan");
}

export async function catatanForm(env, data = {}, edit = false) {
  const pohon = await getPohon(env);
  const blok = await getBlok(env);

  const pohonId = data.pohon_id || "";
  const blokId = data.blok_id || "";

  const content = `
    <div class="page-title">
      <div><h1>${edit ? "✏️ Edit" : "＋ Tambah"} Catatan</h1><p>Catatan lapangan Avokoka Kingdom.</p></div>
      <a href="/catatan" class="btn btn-secondary">← Kembali</a>
    </div>

    <div class="card">
      <form method="POST" action="${edit ? `/catatan/${encodeURIComponent(data.id)}/update` : "/catatan/new"}">
        <div class="form-grid">
          ${field("Tanggal", "tanggal", data.tanggal || dateToday(), "date", false, true)}
          ${field("Kategori", "kategori", data.kategori || "", "text")}
          ${field("Judul", "judul", data.judul || "", "text", true, true)}
          ${selectField("Blok", "blok_id", blokOptions(blok, blokId), blokId)}
          ${selectField("Pohon", "pohon_id", pohonOptions(pohon, pohonId), pohonId)}
          ${textareaField("Isi Catatan", "isi", data.isi || "", true)}
        </div>
        ${formButtons("/catatan")}
      </form>
    </div>
  `;

  return layout(edit ? "Edit Catatan" : "Tambah Catatan", content, "catatan");
}

export async function catatanCreate(request, env) {
  const data = await formToObject(request);
  try {
    await insertCompatible(env, "catatan", {
      tanggal: data.tanggal || dateToday(),
      kategori: data.kategori || null,
      judul: data.judul || null,
      isi: data.isi || null,
      blok_id: data.blok_id || null,
      pohon_id: data.pohon_id || null
    });
    return redirect(request, "/catatan");
  } catch (err) {
    return dbErrorPage("Catatan", err, "/catatan");
  }
}

export async function catatanEditPage(env, id) {
  const data = await env.DB.prepare(`SELECT * FROM catatan WHERE id=? LIMIT 1`).bind(id).first();
  if (!data) return html(layout("Data Tidak Ditemukan", `<div class="card"><div class="notice notice-danger">Catatan tidak ditemukan.</div><a href="/catatan" class="btn btn-secondary">← Kembali</a></div>`, "catatan"), 404);
  return catatanForm(env, data, true);
}

export async function catatanUpdate(request, env, id) {
  const data = await formToObject(request);
  try {
    await env.DB.prepare(`
      UPDATE catatan SET
        tanggal=?, kategori=?, judul=?, isi=?, blok_id=?, pohon_id=?
      WHERE id=?
    `).bind(
      data.tanggal || dateToday(), data.kategori || null, data.judul || null,
      data.isi || null, data.blok_id || null, data.pohon_id || null, id
    ).run();

    return redirect(request, "/catatan");
  } catch (err) {
    return dbErrorPage("Catatan", err, "/catatan");
  }
}

export async function catatanDelete(request, env, id) {
  try {
    await env.DB.prepare(`DELETE FROM catatan WHERE id=?`).bind(Number(id)).run();
    return redirect(request, "/catatan");
  } catch (err) {
    return dbErrorPage("Catatan", err, "/catatan");
  }
}
