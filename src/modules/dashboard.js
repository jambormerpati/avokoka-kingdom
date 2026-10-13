import { layout } from "../utils/helpers.js";

async function countTable(env, table){
  try{
    const result = await env.DB.prepare(`SELECT COUNT(*) AS total FROM ${table}`).first();
    return result?.total || 0;
  }catch{
    return 0;
  }
}

export async function dashboard(env){
  const [
    pohon, nursery, produksi, pemupukan,
    penyiraman, penyakit, pemeliharaan, panen, artikel
  ] = await Promise.all([
    countTable(env,"pohon"),
    countTable(env,"nursery"),
    countTable(env,"produksi"),
    countTable(env,"pemupukan"),
    countTable(env,"penyiraman"),
    countTable(env,"penyakit"),
    countTable(env,"pemeliharaan"),
    countTable(env,"panen"),
    countTable(env,"artikel")
  ]);

  const content = `
<div class="page-title">
  <div>
    <h1>Dashboard</h1>
    <p>Pusat pengelolaan data Avokoka Kingdom</p>
  </div>
</div>

<div class="stats">
  <div class="stat">
    <div class="icon">🌳</div>
    <div class="number">${pohon}</div>
    <div class="label">Pohon</div>
  </div>
  <div class="stat">
    <div class="icon">🌱</div>
    <div class="number">${nursery}</div>
    <div class="label">Nursery</div>
  </div>
  <div class="stat">
    <div class="icon">📦</div>
    <div class="number">${produksi}</div>
    <div class="label">Produksi</div>
  </div>
  <div class="stat">
    <div class="icon">🧪</div>
    <div class="number">${pemupukan}</div>
    <div class="label">Pemupukan</div>
  </div>
  <div class="stat">
    <div class="icon">💧</div>
    <div class="number">${penyiraman}</div>
    <div class="label">Penyiraman</div>
  </div>
  <div class="stat">
    <div class="icon">📰</div>
    <div class="number">${artikel}</div>
    <div class="label">Artikel</div>
  </div>
</div>

<div class="grid">
  <div class="card">
    <h3>🌱 Data Kebun</h3>
    <p>Kelola identitas pohon dan pembibitan.</p>
    <div class="actions">
      <a href="/pohon" class="btn btn-primary">🌳 Data Pohon</a>
      <a href="/pohon-sampel" class="btn btn-secondary">🌱 Pohon Sampel</a>
      <a href="/nursery" class="btn btn-secondary">🌱 Nursery</a>
    </div>
  </div>
  <div class="card">
    <h3>📊 Operasional</h3>
    <p>Catat aktivitas kebun secara terstruktur.</p>
    <div class="actions">
      <a href="/produksi" class="btn btn-primary">📦 Produksi</a>
      <a href="/pemupukan" class="btn btn-secondary">🧪 Pemupukan</a>
      <a href="/penyiraman" class="btn btn-secondary">💧 Penyiraman</a>
    </div>
  </div>
  <div class="card">
    <h3>🩺 Kesehatan Tanaman</h3>
    <p>Pencatatan penyakit dan pemeliharaan.</p>
    <div class="actions">
      <a href="/penyakit" class="btn btn-primary">🦠 Penyakit</a>
      <a href="/pemeliharaan" class="btn btn-secondary">🔧 Pemeliharaan</a>
    </div>
  </div>
  <div class="card">
    <h3>🧺 Hasil Kebun</h3>
    <p>Catat panen dan dokumentasi kebun.</p>
    <div class="actions">
      <a href="/panen" class="btn btn-primary">🧺 Panen</a>
      <a href="/foto" class="btn btn-secondary">📷 Foto</a>
      <a href="/catatan" class="btn btn-secondary">📝 Catatan</a>
    </div>
  </div>
</div>
`;

  return layout("Dashboard", content, "dashboard", "admin");
}
