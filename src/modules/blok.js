import { esc, field, selectField, textareaField, formButtons, layout } from "../utils/helpers.js";
import { getBlok } from "./dropdowns.js";

export async function blokForm(env, data = {}, edit = false){
  const title = edit ? "Edit Blok" : "Tambah Blok";

  const content = `
    <div class="page-title">
      <div>
        <h1>🗺️ ${title}</h1>
        <p>Identitas dan informasi blok kebun</p>
      </div>
    </div>

    <div class="card">
      <form method="POST" action="${edit ? "/blok/edit" : "/blok/create"}">
        ${edit ? `<input type="hidden" name="id" value="${esc(data.id || "")}">` : ""}
        <div class="form-grid">
          ${field("Kode Blok", "kode_blok", data.kode_blok || "", "text", false, true)}
          ${field("Nama Blok", "nama_blok", data.nama_blok || "", "text", false, true)}
          ${selectField("Komoditas", "komoditas", `
            <option value="">-- pilih komoditas --</option>
            <option value="Alpukat" ${data.komoditas === "Alpukat" ? "selected" : ""}>Alpukat</option>
            <option value="Kakao" ${data.komoditas === "Kakao" ? "selected" : ""}>Kakao</option>
            <option value="Pisang" ${data.komoditas === "Pisang" ? "selected" : ""}>Pisang</option>
            <option value="Pepaya" ${data.komoditas === "Pepaya" ? "selected" : ""}>Pepaya</option>
            <option value="Campuran" ${data.komoditas === "Campuran" ? "selected" : ""}>Campuran</option>
          `, data.komoditas || "")}
          ${field("Luas (m)", "luas_ha", data.luas_ha ?? "", "number")}
          ${field("Lokasi", "lokasi", data.lokasi || "")}
          ${field("Kemiringan (%)", "kemiringan_persen", data.kemiringan_persen ?? "", "number")}
          ${field("Ketinggian (mdpl)", "ketinggian_mdpl", data.ketinggian_mdpl ?? "", "number")}
          ${field("Tahun Mulai", "tahun_mulai", data.tahun_mulai ?? "", "number")}
          ${selectField("Status", "status", `
            <option value="aktif" ${(data.status || "aktif") === "aktif" ? "selected" : ""}>Aktif</option>
            <option value="nonaktif" ${data.status === "nonaktif" ? "selected" : ""}>Nonaktif</option>
          `, data.status || "aktif")}
          ${textareaField("Keterangan", "keterangan", data.keterangan || "", true)}
        </div>
        ${formButtons("/blok")}
      </form>
    </div>
  `;

  return layout(title, content, "blok", "admin");
}

export async function blokCreate(request, env){
  const form = await request.formData();
  const kode_blok = String(form.get("kode_blok") || "").trim();
  const nama_blok = String(form.get("nama_blok") || "").trim();

  if(!kode_blok || !nama_blok){
    return new Response("Kode Blok dan Nama Blok wajib diisi", { status: 400 });
  }

  try{
    await env.DB.prepare(`
      INSERT INTO blok (
        kode_blok, nama_blok, komoditas, luas_ha, lokasi,
        kemiringan_persen, ketinggian_mdpl, tahun_mulai, status, keterangan
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      kode_blok, nama_blok, form.get("komoditas") || null,
      form.get("luas_ha") === "" ? null : Number(form.get("luas_ha")),
      form.get("lokasi") || null,
      form.get("kemiringan_persen") === "" ? null : Number(form.get("kemiringan_persen")),
      form.get("ketinggian_mdpl") === "" ? null : Number(form.get("ketinggian_mdpl")),
      form.get("tahun_mulai") === "" ? null : Number(form.get("tahun_mulai")),
      form.get("status") || "aktif", form.get("keterangan") || null
    ).run();

    return Response.redirect(new URL("/blok", request.url), 303);
  }catch(error){
    return new Response(`Gagal menyimpan Blok.<br><br>${esc(error.message || String(error))}`, {
      status: 400,
      headers: { "content-type": "text/html; charset=UTF-8" }
    });
  }
}

export async function blokEditPage(env, id){
  const result = await env.DB.prepare(`SELECT * FROM blok WHERE id = ? LIMIT 1`).bind(id).first();
  if(!result){
    return `<div class="card"><h2>Blok tidak ditemukan</h2><a href="/blok">← Kembali</a></div>`;
  }
  return blokForm(env, result, true);
}

export async function blokEdit(request, env){
  const form = await request.formData();
  const id = String(form.get("id") || "").trim();
  const kode_blok = String(form.get("kode_blok") || "").trim();
  const nama_blok = String(form.get("nama_blok") || "").trim();

  if(!id || !kode_blok || !nama_blok){
    return new Response("ID, Kode Blok dan Nama Blok wajib diisi", { status: 400 });
  }

  try{
    await env.DB.prepare(`
      UPDATE blok
      SET kode_blok = ?, nama_blok = ?, komoditas = ?, luas_ha = ?, lokasi = ?,
          kemiringan_persen = ?, ketinggian_mdpl = ?, tahun_mulai = ?, status = ?, keterangan = ?
      WHERE id = ?
    `).bind(
      kode_blok, nama_blok, form.get("komoditas") || null,
      form.get("luas_ha") === "" ? null : Number(form.get("luas_ha")),
      form.get("lokasi") || null,
      form.get("kemiringan_persen") === "" ? null : Number(form.get("kemiringan_persen")),
      form.get("ketinggian_mdpl") === "" ? null : Number(form.get("ketinggian_mdpl")),
      form.get("tahun_mulai") === "" ? null : Number(form.get("tahun_mulai")),
      form.get("status") || "aktif", form.get("keterangan") || null, id
    ).run();

    return Response.redirect(new URL("/blok", request.url), 303);
  }catch(error){
    return new Response(`Gagal mengubah Blok.<br><br>${esc(error.message || String(error))}`, {
      status: 400,
      headers: { "content-type": "text/html; charset=UTF-8" }
    });
  }
}

export async function blokNonaktifkan(request, env, id){
  if(!id) return new Response("ID Blok tidak valid", { status: 400 });
  await env.DB.prepare(`UPDATE blok SET status = 'nonaktif' WHERE id = ?`).bind(id).run();
  return Response.redirect(new URL("/blok", request.url), 303);
}

export async function blokAktifkan(request, env, id){
  if(!id) return new Response("ID Blok tidak valid", { status: 400 });
  await env.DB.prepare(`UPDATE blok SET status = 'aktif' WHERE id = ?`).bind(id).run();
  return Response.redirect(new URL("/blok", request.url), 303);
}

export async function blokList(env){
  const blok = await getBlok(env);
  const rows = blok.map(b => `
    <tr>
      <td><strong>${esc(b.kode_blok)}</strong></td>
      <td>${esc(b.nama_blok)}</td>
      <td>${esc(b.komoditas || "-")}</td>
      <td>${b.luas_ha ?? "-"}</td>
      <td>${esc(b.lokasi || "-")}</td>
      <td>${b.ketinggian_mdpl ?? "-"}</td>
      <td>${b.kemiringan_persen ?? "-"}</td>
      <td>
        ${b.status === "aktif" ? `<span class="badge badge-success">Aktif</span>` : `<span class="badge">Nonaktif</span>`}
      </td>
      <td>
        <div class="action-group">
          <a class="btn btn-small" href="/blok/${encodeURIComponent(b.id)}/edit">✏️ Edit</a>
          ${b.status === "aktif" ? `
            <form method="POST" action="/blok/${encodeURIComponent(b.id)}/nonaktifkan" style="display:inline" onsubmit="return confirm('Nonaktifkan blok ini?')">
              <button type="submit" class="btn btn-small">⛔ Nonaktifkan</button>
            </form>
          ` : `
            <form method="POST" action="/blok/${encodeURIComponent(b.id)}/aktifkan" style="display:inline" onsubmit="return confirm('Aktifkan kembali blok ini?')">
              <button type="submit" class="btn btn-small">✅ Aktifkan</button>
            </form>
          `}
        </div>
      </td>
    </tr>
  `).join("");

  const content = `
    <div class="page-title">
      <div>
        <h1>🗺️ Master Blok</h1>
        <p>Pengelolaan blok kebun Avokoka Kingdom</p>
      </div>
      <div>
        <a href="/blok/new" class="btn btn-primary">➕ Tambah Blok</a>
      </div>
    </div>

    <div class="card">
      ${blok.length === 0 ? `
        <div class="empty-state">
          <h3>Belum ada Blok</h3>
          <p>Tambahkan Blok pertama untuk digunakan pada data pohon.</p>
          <a href="/blok/new" class="btn btn-primary">➕ Tambah Blok</a>
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kode</th><th>Nama Blok</th><th>Komoditas</th><th>Luas (m)</th>
                <th>Lokasi</th><th>mdpl</th><th>Kemiringan</th><th>Status</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `}
    </div>
  `;

  return layout("Master Blok", content, "blok", "admin");
}
