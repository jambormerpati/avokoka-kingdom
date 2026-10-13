import { esc, num, formToObject, redirect, html, dbErrorPage, insertCompatible, field, selectField, textareaField, formButtons, layout } from "../utils/helpers.js";
import { getBlokAktif, getBibit, blokOptions, bibitOptions } from "./dropdowns.js";

export async function pohonList(env){
  const result = await env.DB.prepare(`
    SELECT p.*, b.kode_blok, b.nama_blok
    FROM pohon p
    LEFT JOIN blok b ON b.id = p.blok_id
    ORDER BY p.kode_pohon
  `).all();

  const rows = result.results || [];
  let tableRows = "";

  if(!rows.length){
    tableRows = `<tr><td colspan="10" class="empty">Belum ada data pohon.</td></tr>`;
  }else{
    tableRows = rows.map(p => `
      <tr>
        <td><strong>${esc(p.kode_pohon)}</strong></td>
        <td>${esc(p.komoditas || "-")}</td>
        <td>${esc(p.varietas || "-")}</td>
        <td>${esc(p.kode_blok || p.nama_blok || "-")}</td>
        <td>${esc(p.tahun_tanam || p.tanggal_tanam || "-")}</td>
        <td>${p.tinggi_m !== null && p.tinggi_m !== undefined && p.tinggi_m !== "" ? `${esc(p.tinggi_m)} m` : "-"}</td>
        <td>${p.diameter_batang_cm !== null && p.diameter_batang_cm !== undefined && p.diameter_batang_cm !== "" ? `${esc(p.diameter_batang_cm)} cm` : "-"}</td>
        <td>${p.status === "aktif" ? `<span class="badge badge-green">Aktif</span>` : `<span class="badge badge-gray">${esc(p.status || "-")}</span>`}</td>
        <td>
          <div class="actions">
            <a href="/pohon/${encodeURIComponent(p.kode_pohon)}/edit" class="btn btn-secondary btn-sm">✏️ Edit</a>
            <a href="/pohon/${encodeURIComponent(p.kode_pohon)}/kartu" class="btn btn-secondary btn-sm">🪪 Kartu</a>
            ${p.status === "aktif" ? `
              <form method="POST" action="/pohon/${encodeURIComponent(p.kode_pohon)}/nonaktifkan" style="display:inline" onsubmit="return confirm('Nonaktifkan pohon ini?')">
                <button type="submit" class="btn btn-danger btn-sm">Nonaktifkan</button>
              </form>
            ` : ""}
          </div>
        </td>
      </tr>
    `).join("");
  }

  const content = `
    <div class="page-title">
      <div>
        <h1>🌳 Pohon</h1>
        <p>Data identitas dan kondisi pohon Avokoka Kingdom</p>
      </div>
      <div class="actions">
        <a href="/pohon/tambah" class="btn btn-primary">➕ Tambah Pohon</a>
      </div>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kode</th><th>Komoditas</th><th>Varietas</th><th>Blok</th>
              <th>Tahun Tanam</th><th>Tinggi</th><th>Batang</th><th>Status</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;

  return layout("Pohon", content, "pohon", "admin");
}

export async function pohonForm(env, data = {}, edit = false){
  const [blok, bibit] = await Promise.all([getBlokAktif(env), getBibit(env)]);
  const title = edit ? "Edit Pohon" : "Tambah Pohon";

  const content = `
    <div class="page-title">
      <div>
        <h1>🌳 ${title}</h1>
        <p>Identitas pohon Avokoka Kingdom</p>
      </div>
    </div>

    <div class="card">
      <form method="POST" action="${edit ? "/pohon/edit" : "/pohon/tambah"}">
        <div class="form-grid">
          ${field("Kode Pohon", "kode_pohon", data.kode_pohon || "", "text", false, true)}
          ${selectField("Komoditas", "komoditas", `
            <option value="">-- pilih komoditas --</option>
            <option value="Alpukat" ${data.komoditas === "Alpukat" ? "selected" : ""}>Alpukat</option>
            <option value="Kakao" ${data.komoditas === "Kakao" ? "selected" : ""}>Kakao</option>
            <option value="Pisang" ${data.komoditas === "Pisang" ? "selected" : ""}>Pisang</option>
            <option value="Pepaya" ${data.komoditas === "Pepaya" ? "selected" : ""}>Pepaya</option>
          `, data.komoditas || "", false, true)}
          ${field("Varietas", "varietas", data.varietas || "")}
          ${selectField("Blok", "blok_id", blokOptions(blok, data.blok_id || ""), data.blok_id || "", false, false)}
          ${selectField("Bibit", "bibit_id", bibitOptions(bibit, data.bibit_id || ""), data.bibit_id || "", false, false)}
          ${field("Kode Lama", "kode_lama", data.kode_lama || "")}
          ${field("Sumber Benih", "sumber_benih", data.sumber_benih || "")}
          ${field("Sumber Entres", "sumber_entres", data.sumber_entres || "")}
          ${field("Tanggal Tanam", "tanggal_tanam", data.tanggal_tanam || "", "date")}
          ${field("Tahun Tanam", "tahun_tanam", data.tahun_tanam || "", "number")}
          ${field("Posisi Baris", "posisi_baris", data.posisi_baris || "")}
          ${field("Posisi Pohon", "posisi_pohon", data.posisi_pohon || "")}
          ${field("Latitude", "latitude", data.latitude || "", "number")}
          ${field("Longitude", "longitude", data.longitude || "", "number")}
          ${field("Umur Tahun", "umur_tahun", data.umur_tahun || "", "number")}
          ${selectField("Status", "status", `
            <option value="aktif" ${(data.status || "aktif") === "aktif" ? "selected" : ""}>Aktif</option>
            <option value="nonaktif" ${data.status === "nonaktif" ? "selected" : ""}>Nonaktif</option>
          `, data.status || "aktif")}
          ${field("Tinggi (m)", "tinggi_m", data.tinggi_m || "", "number")}
          ${field("Diameter Batang (cm)", "diameter_batang_cm", data.diameter_batang_cm || "", "number")}
          ${field("Diameter Kanopi (m)", "diameter_kanopi_m", data.diameter_kanopi_m || "", "number")}
          ${field("Kondisi", "kondisi", data.kondisi || "")}
          ${textareaField("Keterangan", "keterangan", data.keterangan || "", true)}
        </div>
        ${formButtons("/pohon")}
      </form>
    </div>
  `;

  return layout(title, content, "pohon", "admin");
}

export async function pohonCreate(request, env){
  const data = await formToObject(request);
  if(!data.kode_pohon){
    return html(layout("Tambah Pohon", `<div class="notice notice-danger">Kode pohon wajib diisi.</div><a href="/pohon/tambah" class="btn btn-secondary">Kembali</a>`, "pohon", "admin"), 400);
  }

  try{
    await insertCompatible(env, "pohon", {
      kode_pohon: data.kode_pohon.trim(),
      komoditas: data.komoditas || null,
      varietas: data.varietas || null,
      blok_id: data.blok_id ? Number(data.blok_id) : null,
      bibit_id: data.bibit_id ? Number(data.bibit_id) : null,
      kode_lama: data.kode_lama || null,
      sumber_benih: data.sumber_benih || null,
      sumber_entres: data.sumber_entres || null,
      tanggal_tanam: data.tanggal_tanam || null,
      tahun_tanam: num(data.tahun_tanam),
      posisi_baris: data.posisi_baris ? Number(data.posisi_baris) : null,
      posisi_pohon: data.posisi_pohon ? Number(data.posisi_pohon) : null,
      latitude: num(data.latitude),
      longitude: num(data.longitude),
      umur_tahun: num(data.umur_tahun),
      status: data.status || "aktif",
      tinggi_m: num(data.tinggi_m),
      diameter_batang_cm: num(data.diameter_batang_cm),
      diameter_kanopi_m: num(data.diameter_kanopi_m),
      kondisi: data.kondisi || null,
      keterangan: data.keterangan || null
    });
    return redirect(request, "/pohon");
  }catch(err){
    return dbErrorPage("Tambah Pohon", err, "/pohon/tambah");
  }
}

export async function pohonEdit(request, env){
  const data = await formToObject(request);
  if(!data.kode_pohon) return redirect(request, "/pohon");

  try{
    await env.DB.prepare(`
      UPDATE pohon SET
        komoditas=?, varietas=?, blok_id=?, bibit_id=?, kode_lama=?, sumber_benih=?,
        sumber_entres=?, tanggal_tanam=?, tahun_tanam=?, posisi_baris=?, posisi_pohon=?,
        latitude=?, longitude=?, umur_tahun=?, status=?, tinggi_m=?, diameter_batang_cm=?,
        diameter_kanopi_m=?, kondisi=?, keterangan=?
      WHERE kode_pohon=?
    `).bind(
      data.komoditas || null, data.varietas || null, data.blok_id || null, data.bibit_id || null,
      data.kode_lama || null, data.sumber_benih || null, data.sumber_entres || null,
      data.tanggal_tanam || null, num(data.tahun_tanam), data.posisi_baris || null,
      data.posisi_pohon || null, num(data.latitude), num(data.longitude), num(data.umur_tahun),
      data.status || "aktif", num(data.tinggi_m), num(data.diameter_batang_cm),
      num(data.diameter_kanopi_m), data.kondisi || null, data.keterangan || null, data.kode_pohon
    ).run();

    return redirect(request, "/pohon");
  }catch(err){
    return dbErrorPage("Edit Pohon", err, `/pohon/${encodeURIComponent(data.kode_pohon)}/edit`);
  }
}

export async function pohonEditPage(env, kode){
  const data = await env.DB.prepare(`SELECT * FROM pohon WHERE kode_pohon=? LIMIT 1`).bind(kode).first();
  if(!data){
    return html(layout("Pohon Tidak Ditemukan", `<div class="card"><div class="notice notice-danger">Data pohon tidak ditemukan.</div><a href="/pohon" class="btn btn-secondary">Kembali</a></div>`, "pohon", "admin"), 404);
  }
  return pohonForm(env, data, true);
}

export async function pohonNonaktifkan(request, env, kode){
  try{
    await env.DB.prepare(`UPDATE pohon SET status='nonaktif' WHERE kode_pohon=?`).bind(kode).run();
  }catch(err){
    return dbErrorPage("Nonaktifkan Pohon", err, "/pohon");
  }
  return redirect(request, "/pohon");
}

export async function pohonKartuIdentitas(env, kode){
  const data = await env.DB.prepare(`
    SELECT p.*, b.kode_blok, b.nama_blok
    FROM pohon p
    LEFT JOIN blok b ON b.id = p.blok_id
    WHERE p.kode_pohon = ?
    LIMIT 1
  `).bind(kode).first();

  if(!data){
    return layout("Pohon Tidak Ditemukan", `<div class="card"><h2>🌳 Pohon Tidak Ditemukan</h2><p>Kode pohon <strong>${esc(kode)}</strong> tidak ditemukan.</p><a href="/pohon" class="btn btn-secondary">← Kembali</a></div>`, "pohon", "admin");
  }

  const kodePohon = esc(data.kode_pohon || "-");
  const komoditas = esc(data.komoditas || "-");
  const varietas = esc(data.varietas || "-");
  const blok = esc(data.kode_blok || data.nama_blok || "-");
  const tahunTanam = esc(data.tahun_tanam || data.tanggal_tanam || "-");
  const status = data.status === "aktif" ? "AKTIF" : String(data.status || "-").toUpperCase();

  const qrData = `https://avokoka.sebayang.com/pohon/${encodeURIComponent(data.kode_pohon)}`;
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(qrData);

  const content = `
<style>
.tree-card-page{ padding:30px 10px 50px; }
.tree-card{ width:860px; max-width:100%; aspect-ratio:1.586 / 1; margin:0 auto; position:relative; overflow:hidden; box-sizing:border-box; border-radius:24px; color:#fff; background:linear-gradient(135deg, #163d29 0%, #28734a 50%, #102d1e 100%); box-shadow:0 18px 45px rgba(0,0,0,.25); padding:34px; }
.tree-card-circle-1{ position:absolute; width:320px; height:320px; border-radius:50%; background:rgba(255,255,255,.055); right:-130px; top:-150px; }
.tree-card-circle-2{ position:absolute; width:260px; height:260px; border-radius:50%; background:rgba(255,255,255,.04); left:-150px; bottom:-150px; }
.tree-card-content{ position:relative; z-index:2; height:100%; }
.tree-card-header{ display:flex; justify-space-between; align-items:flex-start; }
.tree-card-brand{ font-size:23px; font-weight:700; letter-spacing:1px; }
.tree-card-subtitle{ margin-top:5px; font-size:10px; letter-spacing:2px; opacity:.7; }
.tree-card-status{ border:1px solid rgba(255,255,255,.35); border-radius:20px; padding:7px 13px; font-size:10px; letter-spacing:1px; }
.tree-card-body{ position:absolute; left:0; right:0; top:105px; bottom:60px; display:flex; align-items:center; justify-content:space-between; gap:25px; }
.tree-card-info{ flex:1; min-width:0; }
.tree-card-label{ font-size:10px; letter-spacing:1.5px; opacity:.65; }
.tree-card-code{ margin-top:7px; margin-bottom:23px; font-size:44px; font-weight:800; letter-spacing:2px; line-height:1; }
.tree-card-table{ display:grid; grid-template-columns:100px 1fr; gap:8px 15px; font-size:13px; }
.tree-card-table-label{ opacity:.65; }
.tree-card-table-value{ font-weight:600; }
.tree-card-qr{ width:150px; flex:0 0 150px; text-align:center; }
.tree-card-qr-box{ display:inline-block; background:#fff; padding:9px; border-radius:12px; }
.tree-card-qr img{ width:125px; height:125px; display:block; }
.tree-card-qr-text{ margin-top:7px; font-size:8px; letter-spacing:1.5px; opacity:.65; }
.tree-card-footer{ position:absolute; left:0; right:0; bottom:5px; display:flex; justify-content:space-between; font-size:9px; letter-spacing:.7px; opacity:.6; }
.tree-card-actions{ max-width:860px; margin:25px auto 0; display:flex; justify-content:center; gap:10px; flex-wrap:wrap; }
</style>

<div class="tree-card-page">
  <div class="tree-card">
    <div class="tree-card-circle-1"></div>
    <div class="tree-card-circle-2"></div>
    <div class="tree-card-content">
      <div class="tree-card-header">
        <div>
          <div class="tree-card-brand">🌿 AVOKOKA KINGDOM</div>
          <div class="tree-card-subtitle">TREE IDENTIFICATION CARD</div>
        </div>
        <div class="tree-card-status">${status}</div>
      </div>
      <div class="tree-card-body">
        <div class="tree-card-info">
          <div class="tree-card-label">KODE POHON</div>
          <div class="tree-card-code">${kodePohon}</div>
          <div class="tree-card-table">
            <div class="tree-card-table-label">Komoditas</div><div class="tree-card-table-value">${komoditas}</div>
            <div class="tree-card-table-label">Varietas</div><div class="tree-card-table-value">${varietas}</div>
            <div class="tree-card-table-label">Blok</div><div class="tree-card-table-value">${blok}</div>
            <div class="tree-card-table-label">Tanam</div><div class="tree-card-table-value">${tahunTanam}</div>
          </div>
        </div>
        <div class="tree-card-qr">
          <div class="tree-card-qr-box"><img src="${qrUrl}" alt="QR ${kodePohon}"></div>
          <div class="tree-card-qr-text">SCAN IDENTITAS</div>
        </div>
      </div>
      <div class="tree-card-footer">
        <div>PERBESI • KARO • SUMATERA UTARA</div>
        <div>${kodePohon}</div>
      </div>
    </div>
  </div>

  <div class="tree-card-actions">
    <a href="/pohon" class="btn btn-secondary">← Kembali</a>
    <a href="/pohon/${encodeURIComponent(data.kode_pohon)}/edit" class="btn btn-secondary">✏️ Edit</a>
    <button type="button" class="btn btn-primary" onclick="window.print()">🖨️ Cetak Kartu</button>
  </div>
</div>
`;

  return layout("Kartu " + data.kode_pohon, content, "pohon", "admin");
}
