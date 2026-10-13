import { esc, field, selectField, textareaField, formButtons, layout } from "../utils/helpers.js";

export async function plotForm(env, data = {}, edit = false) {
  const title = edit ? "Edit Plot" : "Tambah Plot";

  const result = await env.DB.prepare(`
    SELECT id, kode_blok, nama_blok
    FROM blok
    WHERE status = 'aktif' OR id = ?
    ORDER BY kode_blok ASC
  `).bind(data.blok_id ?? -1).all();

  const daftarBlok = result.results || [];
  const opsiBlok = `
    <option value="">-- Pilih Blok --</option>
    ${daftarBlok.map(b => `
      <option value="${esc(String(b.id))}" ${String(data.blok_id ?? "") === String(b.id) ? "selected" : ""}>
        ${esc(b.kode_blok)} - ${esc(b.nama_blok)}
      </option>
    `).join("")}
  `;

  const daftarKomoditas = ["Alpukat", "Kakao", "Pisang", "Pepaya", "Campuran"];
  const opsiKomoditas = `
    <option value="">-- Pilih Komoditas --</option>
    ${daftarKomoditas.map(v => `
      <option value="${esc(v)}" ${data.komoditas === v ? "selected" : ""}>${esc(v)}</option>
    `).join("")}
  `;

  const daftarFungsi = ["Produksi", "Observasi", "Penelitian", "Pembibitan", "Percobaan"];
  const opsiFungsi = `
    <option value="">-- Pilih Fungsi --</option>
    ${daftarFungsi.map(v => `
      <option value="${esc(v)}" ${data.fungsi === v ? "selected" : ""}>${esc(v)}</option>
    `).join("")}
  `;

  const opsiStatus = `
    <option value="aktif" ${(data.status || "aktif") === "aktif" ? "selected" : ""}>Aktif</option>
    <option value="nonaktif" ${data.status === "nonaktif" ? "selected" : ""}>Nonaktif</option>
  `;

  const content = `
    <div class="page-title">
      <div>
        <h1>📍 ${title}</h1>
        <p>Identitas dan informasi plot kebun</p>
      </div>
    </div>

    <div class="card">
      <form method="POST" action="${edit ? "/plot/edit" : "/plot/create"}">
        ${edit ? `<input type="hidden" name="id" value="${esc(data.id ?? "")}">` : ""}
        <div class="form-grid">
          ${field("Kode Plot", "kode_plot", data.kode_plot || "", "text", false, true)}
          ${field("Nama Plot", "nama_plot", data.nama_plot || "", "text", false, true)}
          ${selectField("Blok", "blok_id", opsiBlok, data.blok_id ?? "")}
          ${selectField("Komoditas", "komoditas", opsiKomoditas, data.komoditas || "")}
          ${field("Varietas / Klon", "varietas", data.varietas || "")}
          ${selectField("Fungsi Plot", "fungsi", opsiFungsi, data.fungsi || "")}
          ${selectField("Status", "status", opsiStatus, data.status || "aktif")}
          ${textareaField("Keterangan", "keterangan", data.keterangan || "", true)}
        </div>
        ${formButtons("/plot")}
      </form>
    </div>
  `;

  return layout(title, content, "plot", "admin");
}

export async function plotCreate(request, env) {
  const form = await request.formData();
  const kode_plot = String(form.get("kode_plot") || "").trim();
  const nama_plot = String(form.get("nama_plot") || "").trim();
  const blok_id = Number(form.get("blok_id"));
  const komoditas = String(form.get("komoditas") || "").trim();
  const varietas = String(form.get("varietas") || "").trim();
  const fungsi = String(form.get("fungsi") || "").trim();
  const keterangan = String(form.get("keterangan") || "").trim();

  if (!kode_plot || !nama_plot || !Number.isInteger(blok_id) || blok_id <= 0 || !komoditas) {
    return new Response("Kode Plot, Nama Plot, Blok, dan Komoditas wajib diisi.", { status: 400 });
  }

  const blok = await env.DB.prepare(`SELECT id FROM blok WHERE id = ?`).bind(blok_id).first();
  if (!blok) {
    return new Response("Blok yang dipilih tidak ditemukan.", { status: 400 });
  }

  try {
    await env.DB.prepare(`
      INSERT INTO plot (kode_plot, nama_plot, blok_id, komoditas, varietas, fungsi, status, keterangan)
      VALUES (?, ?, ?, ?, ?, ?, 'aktif', ?)
    `).bind(kode_plot, nama_plot, blok_id, komoditas, varietas || null, fungsi || null, keterangan || null).run();
  } catch (error) {
    return new Response("Gagal menyimpan Plot. Periksa apakah Kode Plot sudah digunakan.", { status: 400 });
  }

  return Response.redirect(new URL("/plot", request.url), 303);
}

export async function plotEditPage(env, id) {
  const data = await env.DB.prepare(`SELECT * FROM plot WHERE id = ?`).bind(id).first();
  if (!data) {
    return layout("Plot Tidak Ditemukan", `<p>Data Plot tidak ditemukan.</p><a href="/plot">Kembali</a>`);
  }
  return plotForm(env, data, true);
}

export async function plotEdit(request, env) {
  const form = await request.formData();
  const id = Number(form.get("id"));
  const kode_plot = String(form.get("kode_plot") || "").trim();
  const nama_plot = String(form.get("nama_plot") || "").trim();
  const blok_id = Number(form.get("blok_id"));
  const komoditas = String(form.get("komoditas") || "").trim();
  const varietas = String(form.get("varietas") || "").trim();
  const fungsi = String(form.get("fungsi") || "").trim();
  const status = String(form.get("status") || "aktif");
  const keterangan = String(form.get("keterangan") || "").trim();

  if (!Number.isInteger(id) || id <= 0 || !kode_plot || !nama_plot || !Number.isInteger(blok_id) || blok_id <= 0 || !komoditas || !["aktif", "nonaktif"].includes(status)) {
    return new Response("Data Plot tidak valid.", { status: 400 });
  }

  const blok = await env.DB.prepare(`SELECT id FROM blok WHERE id = ?`).bind(blok_id).first();
  if (!blok) return new Response("Blok yang dipilih tidak ditemukan.", { status: 400 });

  const existing = await env.DB.prepare(`SELECT id FROM plot WHERE id = ?`).bind(id).first();
  if (!existing) return new Response("Data Plot tidak ditemukan.", { status: 404 });

  try {
    await env.DB.prepare(`
      UPDATE plot
      SET kode_plot = ?, nama_plot = ?, blok_id = ?, komoditas = ?, varietas = ?, fungsi = ?, status = ?, keterangan = ?
      WHERE id = ?
    `).bind(kode_plot, nama_plot, blok_id, komoditas, varietas || null, fungsi || null, status, keterangan || null, id).run();
  } catch (error) {
    return new Response("Gagal memperbarui Plot. Periksa apakah Kode Plot sudah digunakan.", { status: 400 });
  }

  return Response.redirect(new URL("/plot", request.url), 303);
}

export async function plotNonaktifkan(request, env, id) {
  await env.DB.prepare(`UPDATE plot SET status = 'nonaktif' WHERE id = ?`).bind(id).run();
  return Response.redirect(new URL("/plot", request.url), 303);
}

export async function plotAktifkan(request, env, id) {
  await env.DB.prepare(`UPDATE plot SET status = 'aktif' WHERE id = ?`).bind(id).run();
  return Response.redirect(new URL("/plot", request.url), 303);
}

export async function plotList(env) {
  const result = await env.DB.prepare(`
    SELECT p.*, b.kode_blok, b.nama_blok
    FROM plot p
    LEFT JOIN blok b ON b.id = p.blok_id
    ORDER BY p.kode_plot ASC
  `).all();

  const plot = result.results || [];
  const rows = plot.map(p => `
    <tr>
      <td><strong>${esc(p.kode_plot)}</strong></td>
      <td>${esc(p.nama_plot)}</td>
      <td>${esc([p.kode_blok, p.nama_blok].filter(Boolean).join(" - ") || "-")}</td>
      <td>${esc(p.komoditas || "-")}</td>
      <td>${esc(p.varietas || "-")}</td>
      <td>${esc(p.fungsi || "-")}</td>
      <td>${p.status === "aktif" ? `<span class="badge badge-success">Aktif</span>` : `<span class="badge">Nonaktif</span>`}</td>
      <td>
        <div class="action-group">
          <a class="btn btn-small" href="/plot/${encodeURIComponent(p.id)}/edit">✏️ Edit</a>
          ${p.status === "aktif" ? `
            <form method="POST" action="/plot/${encodeURIComponent(p.id)}/nonaktifkan" style="display:inline" onsubmit="return confirm('Nonaktifkan plot ini?')">
              <button type="submit" class="btn btn-small">⛔ Nonaktifkan</button>
            </form>
          ` : `
            <form method="POST" action="/plot/${encodeURIComponent(p.id)}/aktifkan" style="display:inline" onsubmit="return confirm('Aktifkan kembali plot ini?')">
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
        <h1>📍 Master Plot</h1>
        <p>Pengelolaan plot kebun Avokoka Kingdom</p>
      </div>
      <div>
        <a href="/plot/new" class="btn btn-primary">➕ Tambah Plot</a>
      </div>
    </div>

    <div class="card">
      ${plot.length === 0 ? `
        <div class="empty-state">
          <h3>Belum ada Plot</h3>
          <p>Tambahkan Plot pertama untuk mencatat bagian kebun berdasarkan Blok.</p>
          <a href="/plot/new" class="btn btn-primary">➕ Tambah Plot</a>
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kode Plot</th><th>Nama Plot</th><th>Blok</th><th>Komoditas</th>
                <th>Varietas / Klon</th><th>Fungsi</th><th>Status</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `}
    </div>
  `;

  return layout("Master Plot", content, "plot", "admin");
}
