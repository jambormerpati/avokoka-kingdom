import { esc, field, selectField, textareaField, formButtons, layout } from "../utils/helpers.js";

// Helper internal untuk mengekstrak public_id dari URL atau ID murni
function extractPublicId(input) {
  if (!input) return null;
  if (!input.startsWith("http://") && !input.startsWith("https://")) return input;
  try {
    const parts = input.split("/upload/");
    if (parts.length < 2) return null;
    let path = parts[1].replace(/^v\d+\//, "");
    const lastDot = path.lastIndexOf(".");
    return lastDot !== -1 ? path.substring(0, lastDot) : path;
  } catch {
    return null;
  }
}

// Fungsi Hapus Foto dari Cloudinary API
export async function cloudinaryDeleteImage(env, rawPublicIdOrUrl) {
  try {
    const publicId = extractPublicId(rawPublicIdOrUrl);
    if (!publicId || !env?.CLOUDINARY_API_KEY || !env?.CLOUDINARY_API_SECRET) {
      return { ok: false, message: "Kredensial atau public_id tidak valid." };
    }

    const cloudName = env.CLOUDINARY_CLOUD_NAME || "ttkppmx4";
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureBase = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;

    // Generate SHA-1 Signature
    const msgUint8 = new TextEncoder().encode(signatureBase);
    const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("timestamp", String(timestamp));
    formData.append("api_key", env.CLOUDINARY_API_KEY);
    formData.append("signature", signature);
    formData.append("invalidate", "true");

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: "POST",
      body: formData
    });

    const result = await res.json();
    return { ok: res.ok, result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function pohonSampelList(env){
  const data = await env.DB.prepare(`
    SELECT
      ps.id, ps.kode_sampel, ps.status, ps.keterangan,
      p.kode_pohon, p.komoditas, p.varietas,
      pl.kode_plot, pl.nama_plot,
      b.kode_blok, b.nama_blok
    FROM pohon_sampel ps
    LEFT JOIN pohon p ON p.id = ps.pohon_id
    LEFT JOIN plot pl ON pl.id = ps.plot_id
    LEFT JOIN blok b ON b.id = pl.blok_id
    ORDER BY ps.id DESC
  `).all();

  const rows = data.results || [];

  return layout(
    "Pohon Sampel",
    `
      <div class="page-header">
        <div>
          <h1>Pohon Sampel</h1>
          <p>Daftar pohon yang digunakan sebagai sampel penelitian.</p>
        </div>
        <div class="actions">
          <a href="/pohon-sampel/new" class="btn btn-primary">➕ Tambah Pohon Sampel</a>
        </div>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kode Sampel</th><th>Kode Pohon</th><th>Plot</th>
                <th>Blok</th><th>Komoditas</th><th>Varietas</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map(x => `
                <tr>
                  <td>${x.kode_sampel ? `<a href="/pohon-sampel/${encodeURIComponent(x.id)}" class="btn btn-secondary btn-sm">${esc(x.kode_sampel)}</a>` : "-"}</td>
                  <td>${x.kode_pohon || "-"}</td>
                  <td>${x.kode_plot || "-"}</td>
                  <td>${x.kode_blok || "-"}</td>
                  <td>${x.komoditas || "-"}</td>
                  <td>${x.varietas || "-"}</td>
                  <td>${x.status || "-"}</td>
                </tr>
              `).join("") : `<tr><td colspan="7" style="text-align:center;">Belum ada pohon sampel.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `,
    "pohon-sampel",
    "admin"
  );
}

export async function pohonSampelDetail(env, id){
  const data = await env.DB.prepare(`
    SELECT
      ps.*, p.kode_pohon, p.komoditas, p.varietas, p.tahun_tanam, p.tanggal_tanam,
      p.tinggi_m, p.diameter_batang_cm, p.diameter_kanopi_m, p.kondisi AS kondisi_pohon,
      pl.kode_plot, pl.nama_plot, pl.fungsi AS fungsi_plot,
      b.kode_blok, b.nama_blok, b.lokasi, b.ketinggian_mdpl, b.kemiringan_persen
    FROM pohon_sampel ps
    JOIN pohon p ON p.id = ps.pohon_id
    JOIN plot pl ON pl.id = ps.plot_id
    LEFT JOIN blok b ON b.id = pl.blok_id
    WHERE ps.id = ? LIMIT 1
  `).bind(id).first();

  if(!data){
    return layout("Pohon Sampel Tidak Ditemukan", `<div class="card"><h2>Pohon sampel tidak ditemukan.</h2><a href="/pohon-sampel" class="btn btn-secondary">← Kembali</a></div>`, "pohon-sampel", "admin");
  }

  const pengamatan = await env.DB.prepare(`SELECT * FROM pengamatan WHERE pohon_sampel_id = ? ORDER BY tanggal_pengamatan DESC`).bind(data.id).all();
  const panen = await env.DB.prepare(`SELECT * FROM panen_riset WHERE pohon_sampel_id = ? ORDER BY tanggal_panen DESC`).bind(data.id).all();
  const foto = await env.DB.prepare(`SELECT * FROM foto_pohon_sampel WHERE CAST(pohon_sampel_id AS TEXT) = CAST(? AS TEXT) ORDER BY tanggal_foto DESC, created_at DESC`).bind(String(data.id)).all();

  const pengamatanRows = pengamatan.results || [];
  const panenRows = panen.results || [];
  const fotoRows = foto.results || [];

  const content = `
    <div class="page-title">
      <div>
        <h1>🌱 ${esc(data.kode_sampel)}</h1>
        <p>Detail pohon sampel penelitian</p>
      </div>
      <div class="actions">
        <a href="/pohon-sampel" class="btn btn-secondary">← Kembali</a>
      </div>
    </div>

    <div class="card">
      <h2>Identitas Pohon</h2>
      <div class="form-grid">
        ${field("Kode Sampel", "kode_sampel", data.kode_sampel || "", "text", true)}
        ${field("Kode Pohon", "kode_pohon", data.kode_pohon || "", "text", true)}
        ${field("Komoditas", "komoditas", data.komoditas || "", "text", true)}
        ${field("Varietas", "varietas", data.varietas || "", "text", true)}
        ${field("Plot", "kode_plot", data.kode_plot || "", "text", true)}
        ${field("Nama Plot", "nama_plot", data.nama_plot || "", "text", true)}
        ${field("Blok", "kode_blok", data.kode_blok || "", "text", true)}
        ${field("Nama Blok", "nama_blok", data.nama_blok || "", "text", true)}
      </div>
    </div>

    <div class="card">
      <div class="page-title">
        <div><h2>Riwayat Pengamatan</h2></div>
        <div class="actions"><a href="/pohon-sampel/${encodeURIComponent(data.id)}/pengamatan/new" class="btn btn-primary">➕ Tambah Pengamatan</a></div>
      </div>
      ${pengamatanRows.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Tanggal</th><th>Tinggi</th><th>Batang</th><th>Kanopi</th><th>Bunga</th><th>Buah</th><th>Jumlah</th><th>Kondisi</th><th>Cuaca</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              ${pengamatanRows.map(x => `
                <tr>
                  <td>${esc(x.tanggal_pengamatan)}</td>
                  <td>${x.tinggi_m !== null ? `${esc(x.tinggi_m)} m` : "-"}</td>
                  <td>${x.diameter_batang_cm !== null ? `${esc(x.diameter_batang_cm)} cm` : "-"}</td>
                  <td>${x.diameter_kanopi_m !== null ? `${esc(x.diameter_kanopi_m)} m` : "-"}</td>
                  <td>${esc(x.kondisi_bunga || "-")}</td>
                  <td>${esc(x.kondisi_buah || "-")}</td>
                  <td>${esc(x.jumlah_buah ?? "-")}</td>
                  <td>${esc(x.kondisi_tanaman || "-")}</td>
                  <td>${esc(x.kondisi_cuaca || "-")}</td>
                  <td><a href="/pohon-sampel/${encodeURIComponent(data.id)}/pengamatan/${encodeURIComponent(x.id)}/edit" class="btn btn-secondary">✏️ Edit</a></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<p class="empty">Belum ada data pengamatan.</p>`}
    </div>

    <div class="card">
      <div class="page-title">
        <div><h2>Riwayat Panen Riset</h2></div>
        <div class="actions"><a href="/pohon-sampel/${encodeURIComponent(data.id)}/panen-riset/new" class="btn btn-primary">➕ Tambah Panen Riset</a></div>
      </div>
      ${panenRows.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Tanggal</th><th>Jumlah Buah</th><th>Berat Total</th><th>Kematangan</th><th>Kondisi</th><th>Catatan</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              ${panenRows.map(x => `
                <tr>
                  <td>${esc(x.tanggal_panen)}</td>
                  <td>${esc(x.jumlah_buah ?? "-")}</td>
                  <td>${x.berat_total_kg !== null ? `${esc(x.berat_total_kg)} kg` : "-"}</td>
                  <td>${esc(x.tingkat_kematangan || "-")}</td>
                  <td>${esc(x.kondisi_buah || "-")}</td>
                  <td>${esc(x.catatan || "-")}</td>
                  <td>
                    <a href="/pohon-sampel/${encodeURIComponent(data.id)}/panen-riset/${encodeURIComponent(x.id)}/edit" class="btn btn-secondary">✏️ Edit</a>
                    <form method="POST" action="/pohon-sampel/${encodeURIComponent(data.id)}/panen-riset/${encodeURIComponent(x.id)}/delete" style="display:inline;" onsubmit="return confirm('Hapus data panen riset ini?');">
                      <button type="submit" class="btn btn-danger">🗑️ Hapus</button>
                    </form>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<p class="empty">Belum ada data panen riset.</p>`}
    </div>

    <div class="card">
      <div class="page-title">
        <div><h2>📷 Foto Pohon Sampel</h2></div>
        <div class="actions"><a href="/pohon-sampel/${encodeURIComponent(data.id)}/foto/new" class="btn btn-primary">📷 Tambah Foto</a></div>
      </div>
      ${fotoRows.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Foto</th><th>Tanggal</th><th>Jenis</th><th>Keterangan</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              ${fotoRows.map(x => `
                <tr>
                  <td><img src="${esc(x.url_foto)}" alt="${esc(x.jenis_foto || "Foto")}" style="width:120px;height:90px;object-fit:cover;border-radius:8px;display:block;"></td>
                  <td>${esc(x.tanggal_foto)}</td>
                  <td>${esc(x.jenis_foto)}</td>
                  <td>${esc(x.keterangan || "-")}</td>
                  <td>
                    <a href="/pohon-sampel/${encodeURIComponent(data.id)}/foto/${encodeURIComponent(x.id)}/edit" class="btn btn-secondary btn-sm">✏️ Edit</a>
                    <form method="POST" action="/pohon-sampel/${encodeURIComponent(data.id)}/foto/${encodeURIComponent(x.id)}/delete" style="display:inline;" onsubmit="return confirm('Hapus foto ini?');">
                      <button type="submit" class="btn btn-danger btn-sm">🗑️ Hapus</button>
                    </form>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<p class="empty">Belum ada foto
