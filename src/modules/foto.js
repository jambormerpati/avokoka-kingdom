import { esc, formToObject, redirect, html, dbErrorPage, insertCompatible, field, selectField, textareaField, formButtons, layout } from "../utils/helpers.js";
import { getPohon, getBlok, getBibit, pohonOptions, blokOptions } from "./dropdowns.js";

export async function fotoList(env) {
  const result = await env.DB.prepare(`
    SELECT ft.*, p.kode_pohon, p.komoditas, p.varietas
    FROM foto ft LEFT JOIN pohon p ON p.id = ft.pohon_id
    ORDER BY ft.id DESC
  `).all();

  const rows = result.results || [];
  const table = rows.length ? `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Foto</th><th>Pohon</th><th>Blok</th><th>Jenis</th><th>Keterangan</th><th>Aksi</th></tr>
        </thead>
        <tbody>
        ${rows.map(r => `
          <tr>
            <td>
              ${r.url ? `
                <a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">
                  <img src="${esc(r.url)}" alt="Foto ${esc(r.kode_pohon || "kebun")}" style="width:90px;height:65px;object-fit:cover;border-radius:8px;border:1px solid #dce5df;">
                </a>
              ` : `<span class="badge badge-gray">Tidak ada URL</span>`}
            </td>
            <td><strong>${esc(r.kode_pohon || "-")}</strong><br><small>${esc(r.komoditas || "")} ${r.varietas ? " · " + esc(r.varietas) : ""}</small></td>
            <td>${esc(r.blok_id || "-")}</td>
            <td><span class="badge badge-green">${esc(r.jenis_foto || "-")}</span></td>
            <td>${esc(r.keterangan || "-")}</td>
            <td>
              <div class="actions">
                <a href="/foto/${encodeURIComponent(r.id)}/edit" class="btn btn-secondary btn-sm">✏️ Edit</a>
                <form method="POST" action="/foto/${encodeURIComponent(r.id)}/delete" onsubmit="return confirm('Hapus foto ini?')">
                  <button type="submit" class="btn btn-danger btn-sm">🗑️ Hapus</button>
                </form>
              </div>
            </td>
          </tr>
        `).join("")}
        </tbody>
      </table>
    </div>
  ` : `<div class="empty">Belum ada data foto.</div>`;

  const content = `
    <div class="page-title">
      <div><h1>📷 Foto</h1><p>Dokumentasi visual kegiatan dan kondisi kebun.</p></div>
      <a href="/foto/new" class="btn btn-primary">＋ Tambah Foto</a>
    </div>
    <div class="card">${table}</div>
  `;

  return layout("Foto", content, "foto");
}

export async function fotoForm(env, data = {}, edit = false) {
  const pohon = await getPohon(env);
  const blok = await getBlok(env);

  const pohonId = data.pohon_id || "";
  const blokId = data.blok_id || "";

  const content = `
    <div class="page-title">
      <div><h1>${edit ? "✏️ Edit" : "＋ Tambah"} Foto</h1><p>Tambahkan dokumentasi foto kebun.</p></div>
      <a href="/foto" class="btn btn-secondary">← Kembali</a>
    </div>

    <div class="card">
      <form method="POST" action="${edit ? `/foto/${encodeURIComponent(data.id)}/update` : "/foto/new"}">
        <div class="form-grid">
          ${selectField("Pohon", "pohon_id", pohonOptions(pohon, pohonId), pohonId)}
          ${selectField("Blok", "blok_id", blokOptions(blok, blokId), blokId)}
          ${field("URL Foto", "url", data.url || "", "url", true, true)}
          ${field("Jenis Foto", "jenis_foto", data.jenis_foto || "", "text")}
          ${textareaField("Keterangan", "keterangan", data.keterangan || "", true)}
          ${data.nursery_id !== undefined && data.nursery_id !== null ? field("Nursery ID", "nursery_id", data.nursery_id || "", "text") : ""}
        </div>
        ${formButtons("/foto")}
      </form>
    </div>
  `;

  return layout(edit ? "Edit Foto" : "Tambah Foto", content, "foto");
}

export async function fotoSave(request, env) {
  const data = await formToObject(request);
  try {
    await insertCompatible(env, "foto", {
      pohon_id: data.pohon_id || null,
      blok_id: data.blok_id || null,
      nursery_id: data.nursery_id || null,
      url: data.url || null,
      jenis_foto: data.jenis_foto || null,
      keterangan: data.keterangan || null
    });
    return redirect(request, "/foto");
  } catch (err) {
    return dbErrorPage("Foto", err, "/foto");
  }
}

export async function fotoEditPage(env, id) {
  const data = await env.DB.prepare(`SELECT * FROM foto WHERE id=? LIMIT 1`).bind(id).first();
  if (!data) return html(layout("Data Tidak Ditemukan", `<div class="card"><div class="notice notice-danger">Data foto tidak ditemukan.</div><a href="/foto" class="btn btn-secondary">← Kembali</a></div>`, "foto"), 404);
  return fotoForm(env, data, true);
}

export async function fotoUpdate(request, env, id) {
  const data = await formToObject(request);
  try {
    await env.DB.prepare(`
      UPDATE foto SET
        pohon_id=?, blok_id=?, nursery_id=?, url=?, jenis_foto=?, keterangan=?
      WHERE id=?
    `).bind(
      data.pohon_id || null, data.blok_id || null, data.nursery_id || null,
      data.url || null, data.jenis_foto || null, data.keterangan || null, id
    ).run();

    return redirect(request, "/foto");
  } catch (err) {
    return dbErrorPage("Foto", err, "/foto");
  }
}

export async function fotoDelete(request, env, id) {
  try {
    await env.DB.prepare(`DELETE FROM foto WHERE id = ?`).bind(Number(id)).run();
    return redirect(request, "/foto");
  } catch (err) {
    return dbErrorPage("Foto", err, "/foto");
  }
}

export async function cloudinaryTestPage(){
  const content = `
    <div class="page-title">
      <div><h1>☁️ Test Upload Cloudinary</h1><p>Uji upload foto sebelum diintegrasikan ke Pohon Sampel.</p></div>
    </div>
    <div class="card">
      <form id="cloudinaryForm">
        <div class="form-grid">
          <div><label>Pilih Foto</label><input type="file" id="foto" accept="image/*" required></div>
        </div>
        <div class="actions"><button type="submit" class="btn btn-primary">☁️ Upload Foto</button></div>
      </form>
      <div id="status" style="margin-top:20px;"></div>
      <div id="hasil" style="margin-top:20px;"></div>
    </div>
    <script>
      const form = document.getElementById("cloudinaryForm");
      const status = document.getElementById("status");
      const hasil = document.getElementById("hasil");

      form.addEventListener("submit", async function(e){
        e.preventDefault();
        const file = document.getElementById("foto").files[0];
        if(!file){ status.textContent = "❌ Pilih foto terlebih dahulu."; return; }

        status.textContent = "⏳ Sedang upload...";
        hasil.innerHTML = "";

        try{
          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", "avokoka_upload");

          const response = await fetch("https://api.cloudinary.com/v1_1/ttkppmx4/image/upload", { method: "POST", body: formData });
          const result = await response.json();

          if(!response.ok){
            status.textContent = "❌ Upload gagal.";
            hasil.textContent = JSON.stringify(result, null, 2);
            return;
          }

          status.textContent = "✅ Upload berhasil.";
          const img = document.createElement("img");
          img.src = result.secure_url;
          img.style.maxWidth = "100%"; img.style.maxHeight = "400px"; img.style.borderRadius = "12px"; img.style.display = "block"; img.style.marginBottom = "15px";
          hasil.appendChild(img);

          const textarea = document.createElement("textarea");
          textarea.readOnly = true; textarea.style.width = "100%"; textarea.style.minHeight = "80px"; textarea.value = result.secure_url;
          hasil.appendChild(textarea);
        }catch(error){
          status.textContent = "❌ Terjadi kesalahan.";
          hasil.textContent = String(error);
        }
      });
    </script>
  `;

  return layout("Test Upload Cloudinary", content, "", "admin");
}
