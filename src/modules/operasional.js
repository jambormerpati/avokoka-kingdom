import { esc, num, dateToday, formToObject, redirect, html, dbErrorPage, insertCompatible, field, selectField, textareaField, formButtons, layout } from "../utils/helpers.js";
import { getPohon, getBlok, pohonOptions, blokOptions } from "./dropdowns.js";

// === PRODUKSI ===
export async function produksiList(env){
  const result = await env.DB.prepare(`
    SELECT pr.*, p.kode_pohon, p.varietas
    FROM produksi pr LEFT JOIN pohon p ON p.id = pr.pohon_id
    ORDER BY pr.tanggal DESC
  `).all();

  const rows = result.results || [];
  let tableRows = rows.length ? rows.map(r => `
    <tr>
      <td>${esc(r.tanggal || "-")}</td>
      <td>${esc(r.kode_pohon || "-")}</td>
      <td>${esc(r.komoditas || "-")}</td>
      <td>${esc(r.produk || "-")}</td>
      <td>${r.berat_kg !== null && r.berat_kg !== undefined && r.berat_kg !== "" ? esc(r.berat_kg) : "-"}</td>
      <td>${r.harga_per_kg !== null && r.harga_per_kg !== undefined && r.harga_per_kg !== "" ? `Rp ${Number(r.harga_per_kg).toLocaleString("id-ID")}` : "-"}</td>
      <td>${r.nilai_total !== null && r.nilai_total !== undefined && r.nilai_total !== "" ? `Rp ${Number(r.nilai_total).toLocaleString("id-ID")}` : "-"}</td>
      <td>${esc(r.kualitas || "-")}</td>
      <td>
        <div class="actions">
          <a href="/produksi/${encodeURIComponent(r.id)}/edit" class="btn btn-secondary btn-sm">✏️ Edit</a>
        </div>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="9" class="empty">Belum ada data produksi.</td></tr>`;

  const content = `
    <div class="page-title">
      <div><h1>📦 Produksi</h1><p>Catatan produksi dan hasil kebun</p></div>
      <a href="/produksi/tambah" class="btn btn-primary">➕ Tambah Produksi</a>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Tanggal</th><th>Pohon</th><th>Komoditas</th><th>Produk</th><th>Berat (kg)</th><th>Harga/kg</th><th>Nilai</th><th>Kualitas</th><th>Aksi</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;

  return layout("Produksi", content, "produksi", "admin");
}

export async function produksiForm(env, data = {}, edit = false){
  const pohon = await getPohon(env);
  const title = edit ? "Edit Produksi" : "Tambah Produksi";

  const content = `
    <div class="page-title"><div><h1>📦 ${title}</h1><p>Pencatatan produksi kebun</p></div></div>
    <div class="card">
      <form method="POST" action="${edit ? "/produksi/edit" : "/produksi/tambah"}">
        <input type="hidden" name="id" value="${esc(data.id || "")}">
        <div class="form-grid">
          ${selectField("Pohon", "pohon_id", pohonOptions(pohon, data.pohon_id || ""), data.pohon_id || "", false, false)}
          ${field("Tanggal", "tanggal", data.tanggal || dateToday(), "date", false, true)}
          ${field("Komoditas", "komoditas", data.komoditas || "")}
          ${field("Produk", "produk", data.produk || "", "text", false, true)}
          ${field("Berat (kg)", "berat_kg", data.berat_kg || "", "number")}
          ${field("Jumlah Buah", "jumlah_buah", data.jumlah_buah || "", "number")}
          ${field("Kualitas", "kualitas", data.kualitas || "")}
          ${field("Kadar Air (%)", "kadar_air_persen", data.kadar_air_persen || "", "number")}
          ${field("Fermentasi", "fermentasi", data.fermentasi || "")}
          ${field("Harga per kg", "harga_per_kg", data.harga_per_kg || "", "number")}
          ${field("Nilai Total", "nilai_total", data.nilai_total || "", "number")}
          ${textareaField("Keterangan", "keterangan", data.keterangan || "", true)}
        </div>
        ${formButtons("/produksi")}
      </form>
    </div>
  `;

  return layout(title, content, "produksi", "admin");
}

export async function produksiCreate(request, env){
  const data = await formToObject(request);
  if(!data.pohon_id) return html("Pohon wajib dipilih.");

  try{
    let nilaiTotal = num(data.nilai_total);
    if(nilaiTotal === null && num(data.berat_kg) !== null && num(data.harga_per_kg) !== null){
      nilaiTotal = num(data.berat_kg) * num(data.harga_per_kg);
    }

    await insertCompatible(env, "produksi", {
      pohon_id: Number(data.pohon_id),
      tanggal: data.tanggal || dateToday(),
      komoditas: data.komoditas || null,
      produk: data.produk || null,
      berat_kg: num(data.berat_kg),
      jumlah_buah: data.jumlah_buah !== "" ? Number(data.jumlah_buah) : null,
      kualitas: data.kualitas || null,
      kadar_air_persen: num(data.kadar_air_persen),
      fermentasi: data.fermentasi || null,
      harga_per_kg: num(data.harga_per_kg),
      nilai_total: nilaiTotal,
      keterangan: data.keterangan || null
    });

    return redirect(request, "/produksi");
  }catch(err){
    return dbErrorPage("Tambah Produksi", err, "/produksi/tambah");
  }
}

export async function produksiEditPage(env, id){
  const data = await env.DB.prepare(`SELECT * FROM produksi WHERE id=? LIMIT 1`).bind(id).first();
  if(!data) return html(layout("Produksi Tidak Ditemukan", `<div class="card"><div class="notice notice-danger">Data produksi tidak ditemukan.</div><a href="/produksi" class="btn btn-secondary">Kembali</a></div>`, "produksi", "admin"), 404);
  return produksiForm(env, data, true);
}

export async function produksiUpdate(request, env){
  const data = await formToObject(request);
  if(!data.id || !data.pohon_id) return redirect(request, "/produksi");

  try{
    let nilaiTotal = num(data.nilai_total);
    if(nilaiTotal === null && num(data.berat_kg) !== null && num(data.harga_per_kg) !== null){
      nilaiTotal = num(data.berat_kg) * num(data.harga_per_kg);
    }

    await env.DB.prepare(`
      UPDATE produksi SET
        pohon_id=?, tanggal=?, komoditas=?, produk=?, berat_kg=?, jumlah_buah=?,
        kualitas=?, kadar_air_persen=?, fermentasi=?, harga_per_kg=?, nilai_total=?, keterangan=?
      WHERE id=?
    `).bind(
      Number(data.pohon_id), data.tanggal || dateToday(), data.komoditas || null,
      data.produk || null, num(data.berat_kg), data.jumlah_buah !== "" ? Number(data.jumlah_buah) : null,
      data.kualitas || null, num(data.kadar_air_persen), data.fermentasi || null,
      num(data.harga_per_kg), nilaiTotal, data.keterangan || null, data.id
    ).run();

    return redirect(request, "/produksi");
  }catch(err){
    return dbErrorPage("Edit Produksi", err, `/produksi/${encodeURIComponent(data.id)}/edit`);
  }
}

// === PEMUPUKAN ===
export async function pemupukanList(env){
  const result = await env.DB.prepare(`
    SELECT pu.*, p.kode_pohon, p.varietas
    FROM pemupukan pu LEFT JOIN pohon p ON p.id=pu.pohon_id
    ORDER BY pu.tanggal DESC
  `).all();

  const rows = result.results || [];
  const tableRows = rows.length ? rows.map(r => `
    <tr>
      <td>${esc(r.tanggal || "-")}</td>
      <td>${esc(r.kode_pohon || "-")}</td>
      <td>${esc(r.pupuk || "-")}</td>
      <td>${esc(r.jenis_pupuk || "-")}</td>
      <td>${esc(r.dosis || "-")}</td>
      <td>${r.jumlah_kg !== null && r.jumlah_kg !== undefined ? `${esc(r.jumlah_kg)} kg` : "-"}</td>
      <td>${r.jumlah_liter !== null && r.jumlah_liter !== undefined ? `${esc(r.jumlah_liter)} L` : "-"}</td>
      <td>${esc(r.metode || "-")}</td>
      <td><a href="/pemupukan/${encodeURIComponent(r.id)}/edit" class="btn btn-secondary btn-sm">✏️ Edit</a></td>
    </tr>
  `).join("") : `<tr><td colspan="9" class="empty">Belum ada data pemupukan.</td></tr>`;

  const content = `
    <div class="page-title">
      <div><h1>🧪 Pemupukan</h1><p>Riwayat aplikasi pupuk kebun</p></div>
      <a href="/pemupukan/tambah" class="btn btn-primary">➕ Tambah Pemupukan</a>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Tanggal</th><th>Pohon</th><th>Pupuk</th><th>Jenis</th><th>Dosis</th><th>Jumlah kg</th><th>Jumlah L</th><th>Metode</th><th>Aksi</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;

  return layout("Pemupukan", content, "pemupukan", "admin");
}

export async function pemupukanForm(env, data = {}, edit = false){
  const [pohon, blok] = await Promise.all([getPohon(env), getBlok(env)]);
  const title = edit ? "Edit Pemupukan" : "Tambah Pemupukan";

  const content = `
    <div class="page-title"><div><h1>🧪 ${title}</h1><p>Pencatatan aplikasi pupuk</p></div></div>
    <div class="card">
      <form method="POST" action="${edit ? "/pemupukan/edit" : "/pemupukan/tambah"}">
        <input type="hidden" name="id" value="${esc(data.id || "")}">
        <div class="form-grid">
          ${selectField("Pohon", "pohon_id", pohonOptions(pohon, data.pohon_id || ""), data.pohon_id || "")}
          ${selectField("Blok", "blok_id", blokOptions(blok, data.blok_id || ""), data.blok_id || "")}
          ${field("Tanggal", "tanggal", data.tanggal || dateToday(), "date", false, true)}
          ${field("Pupuk", "pupuk", data.pupuk || "", "text", false, true)}
          ${field("Jenis Pupuk", "jenis_pupuk", data.jenis_pupuk || "")}
          ${field("Dosis", "dosis", data.dosis || "")}
          ${field("Jumlah (kg)", "jumlah_kg", data.jumlah_kg || "", "number")}
          ${field("Jumlah (liter)", "jumlah_liter", data.jumlah_liter || "", "number")}
          ${field("Metode", "metode", data.metode || "")}
          ${field("Fase Tanaman", "fase_tanaman", data.fase_tanaman || "")}
          ${field("Operator", "operator", data.operator || "")}
          ${textareaField("Keterangan", "keterangan", data.keterangan || "", true)}
        </div>
        ${formButtons("/pemupukan")}
      </form>
    </div>
  `;

  return layout(title, content, "pemupukan", "admin");
}

export async function pemupukanCreate(request, env){
  const data = await formToObject(request);
  if(!data.pohon_id) return html(layout("Tambah Pemupukan", `<div class="card"><div class="notice notice-danger">Pohon wajib dipilih.</div><a href="/pemupukan/tambah" class="btn btn-secondary">Kembali</a></div>`, "pemupukan", "admin"), 400);

  try{
    await insertCompatible(env, "pemupukan", {
      pohon_id: Number(data.pohon_id),
      blok_id: data.blok_id !== "" ? Number(data.blok_id) : null,
      tanggal: data.tanggal || dateToday(),
      pupuk: data.pupuk || null,
      jenis_pupuk: data.jenis_pupuk || null,
      dosis: data.dosis || null,
      jumlah_kg: num(data.jumlah_kg),
      jumlah_liter: num(data.jumlah_liter),
      metode: data.metode || null,
      fase_tanaman: data.fase_tanaman || null,
      operator: data.operator || null,
      keterangan: data.keterangan || null
    });
    return redirect(request, "/pemupukan");
  }catch(err){
    return dbErrorPage("Tambah Pemupukan", err, "/pemupukan/tambah");
  }
}

export async function pemupukanEditPage(env, id){
  const data = await env.DB.prepare(`SELECT * FROM pemupukan WHERE id=? LIMIT 1`).bind(id).first();
  if(!data) return html(layout("Pemupukan Tidak Ditemukan", `<div class="card"><div class="notice notice-danger">Data pemupukan tidak ditemukan.</div><a href="/pemupukan" class="btn btn-secondary">Kembali</a></div>`, "pemupukan", "admin"), 404);
  return pemupukanForm(env, data, true);
}

export async function pemupukanUpdate(request, env){
  const data = await formToObject(request);
  try{
    await env.DB.prepare(`
      UPDATE pemupukan SET
        pohon_id=?, blok_id=?, tanggal=?, pupuk=?, jenis_pupuk=?, dosis=?,
        jumlah_kg=?, jumlah_liter=?, metode=?, fase_tanaman=?, operator=?, keterangan=?
      WHERE id=?
    `).bind(
      data.pohon_id || null, data.blok_id || null, data.tanggal || dateToday(),
      data.pupuk || null, data.jenis_pupuk || null, data.dosis || null,
      num(data.jumlah_kg), num(data.jumlah_liter), data.metode || null,
      data.fase_tanaman || null, data.operator || null, data.keterangan || null, data.id
    ).run();

    return redirect(request, "/pemupukan");
  }catch(err){
    return dbErrorPage("Edit Pemupukan", err, `/pemupukan/${encodeURIComponent(data.id)}/edit`);
  }
}

// === PENYIRAMAN ===
export async function penyiramanList(env){
  const result = await env.DB.prepare(`
    SELECT ir.*, p.kode_pohon, p.varietas
    FROM penyiraman ir LEFT JOIN pohon p ON p.id=ir.pohon_id
    ORDER BY ir.tanggal DESC
  `).all();

  const rows = result.results || [];
  const tableRows = rows.length ? rows.map(r => `
    <tr>
      <td>${esc(r.tanggal || "-")}</td>
      <td>${esc(r.kode_pohon || "-")}</td>
      <td>${r.volume_liter !== null && r.volume_liter !== undefined ? `${esc(r.volume_liter)} L` : "-"}</td>
      <td>${r.durasi_menit !== null && r.durasi_menit !== undefined ? `${esc(r.durasi_menit)} menit` : "-"}</td>
      <td>${esc(r.metode || "-")}</td>
      <td>${esc(r.sumber_air || "-")}</td>
      <td>${esc(r.kondisi_cuaca || "-")}</td>
      <td>${esc(r.operator || "-")}</td>
      <td><a href="/penyiraman/${encodeURIComponent(r.id)}/edit" class="btn btn-secondary btn-sm">✏️ Edit</a></td>
    </tr>
  `).join("") : `<tr><td colspan="9" class="empty">Belum ada data penyiraman.</td></tr>`;

  const content = `
    <div class="page-title">
      <div><h1>💧 Penyiraman</h1><p>Riwayat penyiraman kebun</p></div>
      <a href="/penyiraman/tambah" class="btn btn-primary">➕ Tambah Penyiraman</a>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Tanggal</th><th>Pohon</th><th>Volume</th><th>Durasi</th><th>Metode</th><th>Sumber Air</th><th>Cuaca</th><th>Operator</th><th>Aksi</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;

  return layout("Penyiraman", content, "penyiraman", "admin");
}

export async function penyiramanForm(env, data = {}, edit = false){
  const [pohon, blok] = await Promise.all([getPohon(env), getBlok(env)]);
  const title = edit ? "Edit Penyiraman" : "Tambah Penyiraman";

  const content = `
    <div class="page-title"><div><h1>💧 ${title}</h1><p>Pencatatan penggunaan air kebun</p></div></div>
    <div class="card">
      <form method="POST" action="${edit ? "/penyiraman/edit" : "/penyiraman/tambah"}">
        <input type="hidden" name="id" value="${esc(data.id || "")}">
        <div class="form-grid">
          ${selectField("Pohon", "pohon_id", pohonOptions(pohon, data.pohon_id || ""), data.pohon_id || "")}
          ${selectField("Blok", "blok_id", blokOptions(blok, data.blok_id || ""), data.blok_id || "")}
          ${field("Tanggal", "tanggal", data.tanggal || dateToday(), "date", false, true)}
          ${field("Volume Air (liter)", "volume_liter", data.volume_liter || "", "number")}
          ${field("Durasi (menit)", "durasi_menit", data.durasi_menit || "", "number")}
          ${field("Metode", "metode", data.metode || "")}
          ${field("Sumber Air", "sumber_air", data.sumber_air || "")}
          ${field("Kondisi Cuaca", "kondisi_cuaca", data.kondisi_cuaca || "")}
          ${field("Operator", "operator", data.operator || "")}
          ${textareaField("Keterangan", "keterangan", data.keterangan || "", true)}
        </div>
        ${formButtons("/penyiraman")}
      </form>
    </div>
  `;

  return layout(title, content, "penyiraman", "admin");
}

export async function penyiramanCreate(request, env){
  const data = await formToObject(request);
  try{
    await insertCompatible(env, "penyiraman", {
      pohon_id: data.pohon_id || null,
      blok_id: data.blok_id || null,
      tanggal: data.tanggal || dateToday(),
      volume_liter: num(data.volume_liter),
      durasi_menit: num(data.durasi_menit),
      metode: data.metode || null,
      sumber_air: data.sumber_air || null,
      kondisi_cuaca: data.kondisi_cuaca || null,
      operator: data.operator || null,
      keterangan: data.keterangan || null
    });
    return redirect(request, "/penyiraman");
  }catch(err){
    return dbErrorPage("Tambah Penyiraman", err, "/penyiraman/tambah");
  }
}

export async function penyiramanEditPage(env, id){
  const data = await env.DB.prepare(`SELECT * FROM penyiraman WHERE id=? LIMIT 1`).bind(id).first();
  if(!data) return html(layout("Penyiraman Tidak Ditemukan", `<div class="card"><div class="notice notice-danger">Data penyiraman tidak ditemukan.</div><a href="/penyiraman" class="btn btn-secondary">Kembali</a></div>`, "penyiraman", "admin"), 404);
  return penyiramanForm(env, data, true);
}

export async function penyiramanUpdate(request, env){
  const data = await formToObject(request);
  try{
    await env.DB.prepare(`
      UPDATE penyiraman SET
        pohon_id=?, blok_id=?, tanggal=?, volume_liter=?, durasi_menit=?,
        metode=?, sumber_air=?, kondisi_cuaca=?, operator=?, keterangan=?
      WHERE id=?
    `).bind(
      data.pohon_id || null, data.blok_id || null, data.tanggal || dateToday(),
      num(data.volume_liter), num(data.durasi_menit), data.metode || null,
      data.sumber_air || null, data.kondisi_cuaca || null, data.operator || null,
      data.keterangan || null, data.id
    ).run();

    return redirect(request, "/penyiraman");
  }catch(err){
    return dbErrorPage("Edit Penyiraman", err, `/penyiraman/${encodeURIComponent(data.id)}/edit`);
  }
}

// === PENYAKIT ===
export async function penyakitList(env){
  const result = await env.DB.prepare(`
    SELECT ps.*, p.kode_pohon, p.varietas
    FROM penyakit ps LEFT JOIN pohon p ON p.id=ps.pohon_id
    ORDER BY ps.tanggal DESC
  `).all();

  const rows = result.results || [];
  const tableRows = rows.length ? rows.map(r => `
    <tr>
      <td>${esc(r.tanggal || "-")}</td>
      <td>${esc(r.kode_pohon || "-")}</td>
      <td>${esc(r.jenis_masalah || "-")}</td>
      <td>${esc(r.kategori || "-")}</td>
      <td>${esc(r.tingkat || "-")}</td>
      <td>${esc(r.bagian_tanaman || "-")}</td>
      <td>${esc(r.tindakan || "-")}</td>
      <td>${esc(r.hasil || "-")}</td>
      <td><a href="/penyakit/${encodeURIComponent(r.id)}/edit" class="btn btn-secondary btn-sm">✏️ Edit</a></td>
    </tr>
  `).join("") : `<tr><td colspan="9" class="empty">Belum ada data penyakit.</td></tr>`;

  const content = `
    <div class="page-title">
      <div><h1>🦠 Penyakit</h1><p>Monitoring penyakit dan masalah tanaman</p></div>
      <a href="/penyakit/tambah" class="btn btn-primary">➕ Tambah Data</a>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Tanggal</th><th>Pohon</th><th>Masalah</th><th>Kategori</th><th>Tingkat</th><th>Bagian Tanaman</th><th>Tindakan</th><th>Hasil</th><th>Aksi</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;

  return layout("Penyakit", content, "penyakit", "admin");
}

export async function penyakitForm(env, data = {}, edit = false){
  const [pohon, blok] = await Promise.all([getPohon(env), getBlok(env)]);
  const title = edit ? "Edit Penyakit" : "Tambah Penyakit";

  const content = `
    <div class="page-title"><div><h1>🦠 ${title}</h1><p>Pencatatan kesehatan tanaman</p></div></div>
    <div class="card">
      <form method="POST" action="${edit ? "/penyakit/edit" : "/penyakit/tambah"}">
        <input type="hidden" name="id" value="${esc(data.id || "")}">
        <div class="form-grid">
          ${selectField("Pohon", "pohon_id", pohonOptions(pohon, data.pohon_id || ""), data.pohon_id || "")}
          ${selectField("Blok", "blok_id", blokOptions(blok, data.blok_id || ""), data.blok_id || "")}
          ${field("Tanggal", "tanggal", data.tanggal || dateToday(), "date", false, true)}
          ${field("Jenis Masalah", "jenis_masalah", data.jenis_masalah || "", "text", false, true)}
          ${field("Kategori", "kategori", data.kategori || "")}
          ${field("Tingkat", "tingkat", data.tingkat || "")}
          ${field("Bagian Tanaman", "bagian_tanaman", data.bagian_tanaman || "")}
          ${textareaField("Gejala", "gejala", data.gejala || "", true)}
          ${textareaField("Tindakan", "tindakan", data.tindakan || "", true)}
          ${field("Bahan Pengendalian", "bahan_pengendalian", data.bahan_pengendalian || "")}
          ${field("Dosis", "dosis", data.dosis || "")}
          ${field("Hasil", "hasil", data.hasil || "")}
          ${field("Operator", "operator", data.operator || "")}
          ${textareaField("Keterangan", "keterangan", data.keterangan || "", true)}
        </div>
        ${formButtons("/penyakit")}
      </form>
    </div>
  `;

  return layout(title, content, "penyakit", "admin");
}

export async function penyakitCreate(request, env){
  const data = await formToObject(request);
  try{
    await insertCompatible(env, "penyakit", {
      pohon_id: data.pohon_id || null,
      blok_id: data.blok_id || null,
      tanggal: data.tanggal || dateToday(),
      jenis_masalah: data.jenis_masalah || null,
      kategori: data.kategori || null,
      tingkat: data.tingkat || null,
      bagian_tanaman: data.bagian_tanaman || null,
      gejala: data.gejala || null,
      tindakan: data.tindakan || null,
      bahan_pengendalian: data.bahan_pengendalian || null,
      dosis: data.dosis || null,
      hasil: data.hasil || null,
      operator: data.operator || null,
      keterangan: data.keterangan || null
    });
    return redirect(request, "/penyakit");
  }catch(err){
    return dbErrorPage("Tambah Penyakit", err, "/penyakit/tambah");
  }
}

export async function penyakitEditPage(env, id){
  const data = await env.DB.prepare(`SELECT * FROM penyakit WHERE id=? LIMIT 1`).bind(id).first();
  if(!data) return html(layout("Penyakit Tidak Ditemukan", `<div class="card"><div class="notice notice-danger">Data penyakit tidak ditemukan.</div><a href="/penyakit" class="btn btn-secondary">Kembali</a></div>`, "penyakit", "admin"), 404);
  return penyakitForm(env, data, true);
}

export async function penyakitUpdate(request, env){
  const data = await formToObject(request);
  try{
    await env.DB.prepare(`
      UPDATE penyakit SET
        pohon_id=?, blok_id=?, tanggal=?, jenis_masalah=?, kategori=?, tingkat=?,
        bagian_tanaman=?, gejala=?, tindakan=?, bahan_pengendalian=?, dosis=?,
        hasil=?, operator=?, keterangan=?
      WHERE id=?
    `).bind(
      data.pohon_id || null, data.blok_id || null, data.tanggal || dateToday(),
      data.jenis_masalah || null, data.kategori || null, data.tingkat || null,
      data.bagian_tanaman || null, data.gejala || null, data.tindakan || null,
      data.bahan_pengendalian || null, data.dosis || null, data.hasil || null,
      data.operator || null, data.keterangan || null, data.id
    ).run();

    return redirect(request, "/penyakit");
  }catch(err){
    return dbErrorPage("Edit Penyakit", err, `/penyakit/${encodeURIComponent(data.id)}/edit`);
  }
}

// === PEMELIHARAAN ===
export async function pemeliharaanList(env) {
  const result = await env.DB.prepare(`
    SELECT pm.*, p.kode_pohon, p.komoditas, p.varietas
    FROM pemeliharaan pm LEFT JOIN pohon p ON p.id = pm.pohon_id
    ORDER BY pm.tanggal DESC
  `).all();

  const rows = result.results || [];
  const table = rows.length ? `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Tanggal</th><th>Pohon</th><th>Kegiatan</th><th>Jenis</th><th>Operator</th><th>Keterangan</th><th>Aksi</th></tr>
        </thead>
        <tbody>
        ${rows.map(r => `
          <tr>
            <td>${esc(r.tanggal || "")}</td>
            <td><strong>${esc(r.kode_pohon || "-")}</strong><br><small>${esc(r.komoditas || "")} ${r.varietas ? " · " + esc(r.varietas) : ""}</small></td>
            <td>${esc(r.kegiatan || r.jenis_kegiatan || "-")}</td>
            <td><span class="badge badge-green">${esc(r.jenis || r.kategori || "-")}</span></td>
            <td>${esc(r.operator || "-")}</td>
            <td>${esc(r.keterangan || "-")}</td>
            <td>
              <div class="actions">
                <a href="/pemeliharaan/${encodeURIComponent(r.id)}/edit" class="btn btn-secondary btn-sm">✏️ Edit</a>
                <form method="POST" action="/pemeliharaan/${encodeURIComponent(r.id)}/delete" onsubmit="return confirm('Hapus data pemeliharaan ini?')">
                  <button class="btn btn-danger btn-sm" type="submit">🗑️ Hapus</button>
                </form>
              </div>
            </td>
          </tr>
        `).join("")}
        </tbody>
      </table>
    </div>
  ` : `<div class="empty">Belum ada data pemeliharaan.</div>`;

  const content = `
    <div class="page-title">
      <div><h1>🔧 Pemeliharaan</h1><p>Catatan kegiatan pemeliharaan tanaman.</p></div>
      <a href="/pemeliharaan/new" class="btn btn-primary">＋ Tambah Pemeliharaan</a>
    </div>
    <div class="card">${table}</div>
  `;

  return layout("Pemeliharaan", content, "pemeliharaan");
}

export async function pemeliharaanForm(env, data = {}, edit = false) {
  const pohon = await getPohon(env);
  const blok = await getBlok(env);

  const pohonId = data.pohon_id ?? "";
  const blokId = data.blok_id ?? "";

  const content = `
    <div class="page-title">
      <div><h1>${edit ? "✏️ Edit" : "＋ Tambah"} Pemeliharaan</h1><p>Catat kegiatan pemeliharaan tanaman.</p></div>
      <a href="/pemeliharaan" class="btn btn-secondary">← Kembali</a>
    </div>
    <div class="card">
      <form method="POST" action="${edit ? "/pemeliharaan/edit" : "/pemeliharaan/new"}">
        ${edit ? `<input type="hidden" name="id" value="${esc(data.id || "")}">` : ""}
        <div class="form-grid">
          ${selectField("Pohon", "pohon_id", pohonOptions(pohon, pohonId), pohonId, false, true)}
          ${selectField("Blok", "blok_id", blokOptions(blok, blokId), blokId)}
          ${field("Tanggal", "tanggal", data.tanggal || dateToday(), "date", false, true)}
          ${field("Kegiatan", "kegiatan", data.kegiatan || "", "text", false, true)}
          ${field("Jenis Kegiatan", "jenis_kegiatan", data.jenis_kegiatan || "", "text")}
          ${field("Hasil", "hasil", data.hasil || "", "text")}
          ${field("Operator", "operator", data.operator || "", "text")}
          ${textareaField("Keterangan", "keterangan", data.keterangan || "", true)}
        </div>
        ${formButtons("/pemeliharaan")}
      </form>
    </div>
  `;

  return layout(edit ? "Edit Pemeliharaan" : "Tambah Pemeliharaan", content, "pemeliharaan");
}

export async function pemeliharaanEditPage(env, id) {
  try {
    const data = await env.DB.prepare(`SELECT * FROM pemeliharaan WHERE id = ? LIMIT 1`).bind(id).first();
    if (!data) return html(layout("Data Tidak Ditemukan", `<div class="card"><div class="notice notice-danger">Data pemeliharaan tidak ditemukan.</div><a href="/pemeliharaan" class="btn btn-secondary">← Kembali</a></div>`, "pemeliharaan", "admin"), 404);
    return pemeliharaanForm(env, data, true);
  } catch (err) {
    return dbErrorPage("Edit Pemeliharaan", err, "/pemeliharaan");
  }
}

export async function pemeliharaanUpdate(request, env) {
  const data = await formToObject(request);
  if (!data.id) return redirect(request, "/pemeliharaan");

  try {
    await env.DB.prepare(`
      UPDATE pemeliharaan SET
        pohon_id = ?, blok_id = ?, tanggal = ?, kegiatan = ?,
        jenis_kegiatan = ?, hasil = ?, operator = ?, keterangan = ?
      WHERE id = ?
    `).bind(
      data.pohon_id !== "" ? Number(data.pohon_id) : null,
      data.blok_id !== "" ? Number(data.blok_id) : null,
      data.tanggal || dateToday(), data.kegiatan || null,
      data.jenis_kegiatan || null, data.hasil || null,
      data.operator || null, data.keterangan || null, Number(data.id)
    ).run();

    return redirect(request, "/pemeliharaan");
  } catch (err) {
    return dbErrorPage("Edit Pemeliharaan", err, "/pemeliharaan");
  }
}

export async function pemeliharaanDelete(request, env, id) {
  try {
    await env.DB.prepare(`DELETE FROM pemeliharaan WHERE id = ?`).bind(Number(id)).run();
    return redirect(request, "/pemeliharaan");
  } catch (err) {
    return dbErrorPage("Hapus Pemeliharaan", err, "/pemeliharaan");
  }
}

export async function pemeliharaanCreate(request, env) {
  const data = await formToObject(request);
  if (!data.kegiatan) {
    return html(layout("Tambah Pemeliharaan", `<div class="card"><div class="notice notice-danger">Kegiatan wajib diisi.</div><a href="/pemeliharaan/tambah" class="btn btn-secondary">← Kembali</a></div>`, "pemeliharaan", "admin"), 400);
  }

  try {
    await insertCompatible(env, "pemeliharaan", {
      pohon_id: data.pohon_id !== "" ? Number(data.pohon_id) : null,
      blok_id: data.blok_id !== "" ? Number(data.blok_id) : null,
      tanggal: data.tanggal || dateToday(),
      kegiatan: data.kegiatan || null,
      jenis_kegiatan: data.jenis_kegiatan || null,
      hasil: data.hasil || null,
      operator: data.operator || null,
      keterangan: data.keterangan || null
    });

    return redirect(request, "/pemeliharaan");
  } catch (err) {
    return dbErrorPage("Tambah Pemeliharaan", err, "/pemeliharaan/tambah");
  }
}
