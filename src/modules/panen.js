import { esc, num, dateToday, formToObject, redirect, html, dbErrorPage, insertCompatible, field, selectField, textareaField, formButtons, layout } from "../utils/helpers.js";
import { getPohon, getBlok, pohonOptions, blokOptions } from "./dropdowns.js";

export async function panenList(env) {
  const result = await env.DB.prepare(`
    SELECT pn.*, p.kode_pohon, p.komoditas, p.varietas
    FROM panen pn LEFT JOIN pohon p ON p.id = pn.pohon_id
    ORDER BY pn.tanggal DESC
  `).all();

  const rows = result.results || [];
  const table = rows.length ? `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Tanggal</th><th>Pohon</th><th>Jumlah</th><th>Berat</th><th>Kualitas</th><th>Harga/kg</th><th>Total</th><th>Aksi</th></tr>
        </thead>
        <tbody>
        ${rows.map(r => {
          const total = r.nilai_total !== null && r.nilai_total !== undefined && r.nilai_total !== "" ? Number(r.nilai_total) : (Number(r.berat_kg || 0) * Number(r.harga_per_kg || 0));
          return `
            <tr>
              <td>${esc(r.tanggal || "")}</td>
              <td><strong>${esc(r.kode_pohon || "-")}</strong><br><small>${esc(r.komoditas || "")} ${r.varietas ? " · " + esc(r.varietas) : ""}</small></td>
              <td>${esc(r.jumlah_buah ?? "-")}</td>
              <td>${esc(r.berat_kg ?? "-")} kg</td>
              <td>${esc(r.kualitas || "-")}</td>
              <td>Rp ${Number(r.harga_per_kg || 0).toLocaleString("id-ID")}</td>
              <td><strong>Rp ${Number(total || 0).toLocaleString("id-ID")}</strong></td>
              <td>
                <div class="actions">
                  <a href="/panen/${encodeURIComponent(r.id)}/edit" class="btn btn-secondary btn-sm">✏️ Edit</a>
                  <form method="POST" action="/panen/${encodeURIComponent(r.id)}/delete" onsubmit="return confirm('Hapus data panen ini?')">
                    <button class="btn btn-danger btn-sm" type="submit">🗑️ Hapus</button>
                  </form>
                </div>
              </td>
            </tr>
          `;
        }).join("")}
        </tbody>
      </table>
    </div>
  ` : `<div class="empty">Belum ada data panen.</div>`;

  const content = `
    <div class="page-title">
      <div><h1>🧺 Panen</h1><p>Catatan hasil panen kebun.</p></div>
      <a href="/panen/new" class="btn btn-primary">＋ Tambah Panen</a>
    </div>
    <div class="card">${table}</div>
  `;

  return layout("Panen", content, "panen");
}

export async function panenForm(env, data = {}, edit = false) {
  const pohon = await getPohon(env);
  const blok = await getBlok(env);

  const pohonId = data.pohon_id ?? "";
  const blokId = data.blok_id ?? "";

  const content = `
    <div class="page-header">
      <div><h1>${edit ? "Edit Panen" : "Tambah Panen"}</h1><p>Catat hasil panen kebun.</p></div>
    </div>
    <div class="card">
      <form method="POST" action="${edit ? `/panen/${encodeURIComponent(data.id)}/update` : "/panen/new"}">
        ${selectField("Pohon", "pohon_id", pohonOptions(pohon, pohonId), pohonId, false, true)}
        ${selectField("Blok", "blok_id", blokOptions(blok, blokId), blokId)}
        ${field("Tanggal", "tanggal", data.tanggal || dateToday(), "date", false, true)}
        ${field("Komoditas", "komoditas", data.komoditas || "", "text")}
        ${field("Varietas", "varietas", data.varietas || "", "text")}
        ${field("Jumlah Buah", "jumlah_buah", data.jumlah_buah ?? "", "number")}
        ${field("Berat (kg)", "berat_kg", data.berat_kg ?? "", "number")}
        ${field("Kualitas", "kualitas", data.kualitas || "", "text")}
        ${field("Harga per kg", "harga_per_kg", data.harga_per_kg ?? "", "number")}
        ${field("Nilai Total", "nilai_total", data.nilai_total ?? "", "number")}
        ${field("Pembeli", "pembeli", data.pembeli || "", "text")}
        ${textareaField("Keterangan", "keterangan", data.keterangan || "", true)}
        ${formButtons("/panen")}
      </form>
    </div>
  `;

  return layout(edit ? "Edit Panen" : "Tambah Panen", content, "panen");
}

export async function panenCreate(request, env) {
  const data = await formToObject(request);
  const berat = num(data.berat_kg);
  const harga = num(data.harga_per_kg);
  let nilaiTotal = num(data.nilai_total);

  if (nilaiTotal === null && berat !== null && harga !== null) {
    nilaiTotal = berat * harga;
  }

  try {
    await insertCompatible(env, "panen", {
      pohon_id: data.pohon_id !== "" ? Number(data.pohon_id) : null,
      blok_id: data.blok_id !== "" ? Number(data.blok_id) : null,
      tanggal: data.tanggal || dateToday(),
      jumlah_buah: data.jumlah_buah !== "" ? Number(data.jumlah_buah) : null,
      berat_kg: berat,
      kualitas: data.kualitas || null,
      harga_per_kg: harga,
      nilai_total: nilaiTotal,
      operator: data.operator || null,
      keterangan: data.keterangan || null
    });

    return redirect(request, "/panen");
  } catch (err) {
    return dbErrorPage("Panen", err, "/panen");
  }
}

export async function panenEditPage(env, id) {
  const panenId = Number(id);
  if (!Number.isInteger(panenId)) return redirect(env, "/panen");

  try {
    const data = await env.DB.prepare(`SELECT * FROM panen WHERE id=? LIMIT 1`).bind(panenId).first();
    if (!data) return html(layout("Data Tidak Ditemukan", `<div class="card"><div class="notice notice-danger">Data panen tidak ditemukan.</div><a href="/panen" class="btn btn-secondary">← Kembali</a></div>`, "panen", "admin"), 404);
    return await panenForm(env, data, true);
  } catch (err) {
    return dbErrorPage("Edit Panen", err, "/panen");
  }
}

export async function panenUpdate(request, env, id) {
  const data = await formToObject(request);
  const panenId = Number(id);
  if (!Number.isInteger(panenId)) return redirect(request, "/panen");

  const berat = num(data.berat_kg);
  const harga = num(data.harga_per_kg);
  let nilaiTotal = num(data.nilai_total);

  if (nilaiTotal === null && berat !== null && harga !== null) {
    nilaiTotal = berat * harga;
  }

  try {
    await env.DB.prepare(`
      UPDATE panen SET
        pohon_id=?, blok_id=?, tanggal=?, komoditas=?, varietas=?, jumlah_buah=?,
        berat_kg=?, kualitas=?, harga_per_kg=?, nilai_total=?, pembeli=?, keterangan=?
      WHERE id=?
    `).bind(
      data.pohon_id !== "" ? Number(data.pohon_id) : null,
      data.blok_id !== "" ? Number(data.blok_id) : null,
      data.tanggal || dateToday(), data.komoditas || null, data.varietas || null,
      data.jumlah_buah !== "" ? Number(data.jumlah_buah) : null, berat,
      data.kualitas || null, harga, nilaiTotal, data.pembeli || null,
      data.keterangan || null, panenId
    ).run();

    return redirect(request, "/panen");
  } catch (err) {
    return dbErrorPage("Edit Panen", err, "/panen");
  }
}

export async function panenDelete(request, env, id) {
  const panenId = Number(id);
  if (!Number.isInteger(panenId)) return redirect(request, "/panen");

  try {
    await env.DB.prepare(`DELETE FROM panen WHERE id=?`).bind(panenId).run();
    return redirect(request, "/panen");
  } catch (err) {
    return dbErrorPage("Hapus Panen", err, "/panen");
  }
}
