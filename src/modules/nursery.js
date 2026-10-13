import { esc, num, formToObject, redirect, html, dbErrorPage, insertCompatible, tableColumns, field, selectField, textareaField, formButtons, layout } from "../utils/helpers.js";

export async function nurseryList(env){
  const result = await env.DB.prepare(`SELECT * FROM nursery ORDER BY id DESC`).all();
  const rows = result.results || [];
  let tableRows = "";

  if(!rows.length){
    tableRows = `<tr><td colspan="8" class="empty">Belum ada data nursery.</td></tr>`;
  }else{
    tableRows = rows.map(n => `
      <tr>
        <td><strong>${esc(n.kode_batch || n.id)}</strong></td>
        <td>${esc(n.komoditas || "-")}</td>
        <td>${esc(n.varietas || "-")}</td>
        <td>${esc(n.sumber_benih || "-")}</td>
        <td>${esc(n.tanggal_semai || "-")}</td>
        <td>${esc(n.jumlah_awal ?? "-")}</td>
        <td>${n.status ? `<span class="badge ${n.status === "pembibitan" ? "badge-green" : "badge-gray"}">${esc(n.status)}</span>` : "-"}</td>
        <td>
          <div class="actions">
            <a href="/nursery/${encodeURIComponent(n.id)}/edit" class="btn btn-secondary btn-sm">✏️ Edit</a>
          </div>
        </td>
      </tr>
    `).join("");
  }

  const content = `
    <div class="page-title">
      <div>
        <h1>🌱 Nursery</h1>
        <p>Data pembibitan Avokoka Kingdom</p>
      </div>
      <div class="actions">
        <a href="/nursery/tambah" class="btn btn-primary">➕ Tambah Nursery</a>
      </div>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kode Batch</th><th>Komoditas</th><th>Varietas</th><th>Sumber Benih</th>
              <th>Tanggal Semai</th><th>Jumlah Awal</th><th>Status</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;

  return layout("Nursery", content, "nursery", "admin");
}

export async function nurseryForm(env, data = {}, edit = false){
  const title = edit ? "Edit Nursery" : "Tambah Nursery";

  const content = `
    <div class="page-title">
      <div>
        <h1>🌱 ${title}</h1>
        <p>Data pembibitan Avokoka Kingdom</p>
      </div>
    </div>

    <div class="card">
      <form method="POST" action="${edit ? "/nursery/edit" : "/nursery/tambah"}">
        <input type="hidden" name="id" value="${esc(data.id || "")}">
        <div class="form-grid">
          ${field("Kode Batch", "kode_batch", data.kode_batch || "", "text", false, true)}
          ${selectField("Komoditas", "komoditas", `
            <option value="">-- pilih komoditas --</option>
            <option value="Alpukat" ${data.komoditas === "Alpukat" ? "selected" : ""}>Alpukat</option>
            <option value="Kakao" ${data.komoditas === "Kakao" ? "selected" : ""}>Kakao</option>
            <option value="Pisang" ${data.komoditas === "Pisang" ? "selected" : ""}>Pisang</option>
            <option value="Pepaya" ${data.komoditas === "Pepaya" ? "selected" : ""}>Pepaya</option>
          `, data.komoditas || "", false, true)}
          ${field("Varietas", "varietas", data.varietas || "")}
          ${field("Sumber Benih", "sumber_benih", data.sumber_benih || "")}
          ${field("Sumber Entres", "sumber_entres", data.sumber_entres || "")}
          ${field("Tanggal Semai", "tanggal_semai", data.tanggal_semai || "", "date")}
          ${field("Tanggal Grafting", "tanggal_grafting", data.tanggal_grafting || "", "date")}
          ${field("Tanggal Pindah Pot", "tanggal_pindah_pot", data.tanggal_pindah_pot || "", "date")}
          ${field("Jumlah Awal", "jumlah_awal", data.jumlah_awal ?? "", "number")}
          ${field("Jumlah Hidup", "jumlah_hidup", data.jumlah_hidup ?? "", "number")}
          ${field("Jumlah Mati", "jumlah_mati", data.jumlah_mati ?? "", "number")}
          ${field("Lokasi Nursery", "lokasi_nursery", data.lokasi_nursery || "")}
          ${selectField("Status", "status", `
            <option value="pembibitan" ${(data.status || "pembibitan") === "pembibitan" ? "selected" : ""}>Pembibitan</option>
            <option value="siap_tanam" ${data.status === "siap_tanam" ? "selected" : ""}>Siap Tanam</option>
            <option value="selesai" ${data.status === "selesai" ? "selected" : ""}>Selesai</option>
            <option value="nonaktif" ${data.status === "nonaktif" ? "selected" : ""}>Nonaktif</option>
          `, data.status || "pembibitan")}
          ${field("Kondisi", "kondisi", data.kondisi || "")}
          ${textareaField("Keterangan", "keterangan", data.keterangan || "", true)}
        </div>
        ${formButtons("/nursery")}
      </form>
    </div>
  `;

  return layout(title, content, "nursery", "admin");
}

export async function nurseryCreate(request, env){
  const data = await formToObject(request);
  if(!data.kode_batch || !data.komoditas){
    return html(layout("Tambah Nursery", `<div class="notice notice-danger">Kode batch dan komoditas wajib diisi.</div><a href="/nursery/tambah" class="btn btn-secondary">Kembali</a>`, "nursery", "admin"), 400);
  }

  try{
    await insertCompatible(env, "nursery", {
      kode_batch: data.kode_batch.trim(),
      komoditas: data.komoditas.trim(),
      varietas: data.varietas || null,
      sumber_benih: data.sumber_benih || null,
      sumber_entres: data.sumber_entres || null,
      tanggal_semai: data.tanggal_semai || null,
      tanggal_grafting: data.tanggal_grafting || null,
      tanggal_pindah_pot: data.tanggal_pindah_pot || null,
      jumlah_awal: num(data.jumlah_awal),
      jumlah_hidup: num(data.jumlah_hidup),
      jumlah_mati: num(data.jumlah_mati),
      lokasi_nursery: data.lokasi_nursery || null,
      status: data.status || "pembibitan",
      kondisi: data.kondisi || null,
      keterangan: data.keterangan || null
    });
    return redirect(request, "/nursery");
  }catch(err){
    return dbErrorPage("Tambah Nursery", err, "/nursery/tambah");
  }
}

export async function nurseryEditPage(env, id){
  const data = await env.DB.prepare(`SELECT * FROM nursery WHERE id=? LIMIT 1`).bind(id).first();
  if(!data){
    return html(layout("Nursery Tidak Ditemukan", `<div class="card"><div class="notice notice-danger">Data nursery tidak ditemukan.</div><a href="/nursery" class="btn btn-secondary">Kembali</a></div>`, "nursery", "admin"), 404);
  }
  return nurseryForm(env, data, true);
}

export async function nurseryUpdate(request, env){
  const data = await formToObject(request);
  if(!data.id) return redirect(request, "/nursery");
  if(!data.kode_batch || !data.komoditas){
    return html(layout("Edit Nursery", `<div class="card"><div class="notice notice-danger">Kode Batch dan Komoditas wajib diisi.</div><a href="/nursery/${encodeURIComponent(data.id)}/edit" class="btn btn-secondary">Kembali</a></div>`, "nursery", "admin"));
  }

  try{
    const cols = await tableColumns(env, "nursery");
    const updates = {};
    const values = [];

    const setIfExists = (col, val) => { if(cols.has(col)) updates[col] = val; };

    setIfExists("kode_batch", data.kode_batch.trim());
    setIfExists("komoditas", data.komoditas.trim());
    setIfExists("varietas", data.varietas || null);
    setIfExists("sumber_benih", data.sumber_benih || null);
    setIfExists("sumber_entres", data.sumber_entres || null);
    setIfExists("tanggal_semai", data.tanggal_semai || null);
    setIfExists("tanggal_grafting", data.tanggal_grafting || null);
    setIfExists("tanggal_pindah_pot", data.tanggal_pindah_pot || null);
    setIfExists("jumlah_awal", num(data.jumlah_awal));
    setIfExists("jumlah_hidup", num(data.jumlah_hidup));
    setIfExists("jumlah_mati", num(data.jumlah_mati));
    setIfExists("lokasi_nursery", data.lokasi_nursery || null);
    setIfExists("status", data.status || "pembibitan");
    setIfExists("kondisi", data.kondisi || null);
    setIfExists("keterangan", data.keterangan || null);

    const entries = Object.entries(updates);
    if(!entries.length) throw new Error("Tidak ada kolom nursery yang dapat diperbarui.");

    const setSql = entries.map(([col]) => { values.push(updates[col]); return `${col}=?`; }).join(",");
    values.push(data.id);

    await env.DB.prepare(`UPDATE nursery SET ${setSql} WHERE id=?`).bind(...values).run();
    return redirect(request, "/nursery");
  }catch(err){
    return dbErrorPage("Edit Nursery", err, `/nursery/${encodeURIComponent(data.id)}/edit`);
  }
}
