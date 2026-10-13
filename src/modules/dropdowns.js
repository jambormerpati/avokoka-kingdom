import { esc } from "../utils/helpers.js";

export async function getPohon(env){
  const result = await env.DB.prepare(`
    SELECT id, kode_pohon, komoditas, varietas, status
    FROM pohon
    ORDER BY kode_pohon
  `).all();
  return result.results || [];
}

export async function getBlok(env){
  try{
    const result = await env.DB.prepare(`SELECT * FROM blok ORDER BY id`).all();
    return result.results || [];
  }catch{
    return [];
  }
}

export async function getBlokAktif(env){
  try{
    const result = await env.DB.prepare(`SELECT * FROM blok WHERE status = 'aktif' ORDER BY id`).all();
    return result.results || [];
  }catch{
    return [];
  }
}

export async function getBibit(env){
  try{
    const result = await env.DB.prepare(`
      SELECT id, kode_bibit, komoditas, varietas, status
      FROM bibit
      ORDER BY kode_bibit
    `).all();
    return result.results || [];
  }catch{
    return [];
  }
}

export function pohonOptions(pohon, selected = ""){
  return `
    <option value="">-- pilih pohon --</option>
    ${pohon.map(p => `
      <option value="${esc(p.id)}" ${String(p.id) === String(selected) ? "selected" : ""}>
        ${esc(p.kode_pohon)} - ${esc(p.komoditas || "")} - ${esc(p.varietas || "")}
      </option>
    `).join("")}
  `;
}

export function blokLabel(b){
  return b.kode_blok || b.nama_blok || b.kode || b.nama || `Blok ${b.id}`;
}

export function blokOptions(blok, selected = ""){
  return `
    <option value="">-- pilih blok --</option>
    ${blok.map(b => `
      <option value="${esc(b.id)}" ${String(b.id) === String(selected) ? "selected" : ""}>
        ${esc(blokLabel(b))}
      </option>
    `).join("")}
  `;
}

export function bibitOptions(bibit, selected = ""){
  return `
    <option value="">-- pilih bibit --</option>
    ${bibit.map(b => `
      <option value="${esc(b.id)}" ${String(b.id) === String(selected) ? "selected" : ""}>
        ${esc(b.kode_bibit)} - ${esc(b.komoditas || "")} - ${esc(b.varietas || "")}
      </option>
    `).join("")}
  `;
}
