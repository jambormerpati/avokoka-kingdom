import { SESSION_COOKIE, SESSION_MAX_AGE } from "./config.js";
import { esc, html, redirect } from "./utils/helpers.js";
import {
  checkSession, checkUserSession, createSession, loginUser,
  deleteUserSession, userSessionCookie, clearUserSessionCookie, forbiddenPage, loginPage, userLoginPage
} from "./utils/auth.js";

import { dashboard } from "./modules/dashboard.js";
import { blokList, blokForm, blokCreate, blokEditPage, blokEdit, blokNonaktifkan, blokAktifkan } from "./modules/blok.js";
import { plotList, plotForm, plotCreate, plotEditPage, plotEdit, plotNonaktifkan, plotAktifkan } from "./modules/plot.js";
import { pohonList, pohonForm, pohonCreate, pohonEditPage, pohonEdit, pohonNonaktifkan, pohonKartuIdentitas } from "./modules/pohon.js";
import {
  pohonSampelList, pohonSampelDetail, pohonSampelForm, pohonSampelCreate,
  panenRisetForm, panenRisetCreate, panenRisetEditForm, panenRisetUpdate, panenRisetDelete,
  pengamatanForm, pengamatanCreate, pengamatanEditForm, pengamatanUpdate,
  fotoPohonSampelForm, fotoPohonSampelCreate, fotoPohonSampelEditForm, fotoPohonSampelUpdate, fotoPohonSampelDelete
} from "./modules/pohon-sampel.js";
import { nurseryList, nurseryForm, nurseryCreate, nurseryEditPage, nurseryUpdate } from "./modules/nursery.js";
import {
  produksiList, produksiForm, produksiCreate, produksiEditPage, produksiUpdate,
  pemupukanList, pemupukanForm, pemupukanCreate, pemupukanEditPage, pemupukanUpdate,
  penyiramanList, penyiramanForm, penyiramanCreate, penyiramanEditPage, penyiramanUpdate,
  penyakitList, penyakitForm, penyakitCreate, penyakitEditPage, penyakitUpdate,
  pemeliharaanList, pemeliharaanForm, pemeliharaanCreate, pemeliharaanEditPage, pemeliharaanUpdate, pemeliharaanDelete
} from "./modules/operasional.js";
import { panenList, panenForm, panenCreate, panenEditPage, panenUpdate, panenDelete } from "./modules/panen.js";
import { fotoList, fotoForm, fotoSave, fotoEditPage, fotoUpdate, fotoDelete, cloudinaryTestPage } from "./modules/foto.js";
import { catatanList, catatanForm, catatanCreate, catatanEditPage, catatanUpdate, catatanDelete } from "./modules/catatan.js";
import { artikelList, artikelForm, artikelSave, artikelPublish, artikelDelete } from "./modules/artikel.js";
import {
  usersList, userForm, userCreate, userEditPage, userUpdate,
  userResetForm, userResetPassword, userChangePasswordForm, userChangePassword
} from "./modules/users.js";

function cleanPath(pathname) {
  if (!pathname) return "/";
  let path = pathname;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path || "/";
}

function isArticlePath(path) {
  return path === "/artikel" || path === "/artikel/new" || path.startsWith("/artikel/");
}

function isUserManagementPath(path) {
  return path === "/users" || path === "/users/new" || path.startsWith("/users/");
}

async function adminLogin(request, env) {
  const form = await request.formData();
  const password = String(form.get("password") || "");

  if (!env.ADMIN_PASSWORD || !env.ADMIN_SECRET) {
    return html(loginPage("ADMIN_PASSWORD atau ADMIN_SECRET belum dikonfigurasi."), 500);
  }

  if (password !== env.ADMIN_PASSWORD) {
    return html(loginPage("Password admin salah."), 401);
  }

  const token = await createSession(env);
  const headers = new Headers();
  headers.set("Location", "/");
  headers.append("Set-Cookie", [
    `${SESSION_COOKIE}=${token}`,
    "Path=/", "HttpOnly", "Secure", "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_MAX_AGE / 1000)}`
  ].join("; "));

  return new Response(null, { status: 302, headers });
}

async function userLoginHandler(request, env) {
  const form = await request.formData();
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");

  const result = await loginUser(env, username, password);
  if (!result.success) return html(userLoginPage(result.error), 401);

  const headers = new Headers();
  headers.set("Location", "/artikel");
  headers.append("Set-Cookie", userSessionCookie(result.token));

  return new Response(null, { status: 302, headers });
}

async function adminLogout() {
  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/login",
      "Set-Cookie": "avokoka_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
    }
  });
}

async function userLogoutHandler(request, env) {
  await deleteUserSession(request, env);
  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/user-login",
      "Set-Cookie": clearUserSessionCookie()
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = cleanPath(url.pathname);
    const method = request.method.toUpperCase();

    // AUTH ROUTES
    if (path === "/login" && method === "GET") {
      if (await checkSession(request, env)) return redirect(request, "/");
      return html(loginPage());
    }
    if (path === "/login" && method === "POST") return adminLogin(request, env);

    if (path === "/user-login" && method === "GET") {
      const userSession = await checkUserSession(request, env);
      if (userSession && userSession.role === "user") return redirect(request, "/artikel");
      return html(userLoginPage());
    }
    if (path === "/user-login" && method === "POST") return userLoginHandler(request, env);

    if (path === "/logout") return adminLogout();
    if (path === "/user-logout") return userLogoutHandler(request, env);

    // SESSION CHECKS
    const adminLogged = await checkSession(request, env);
    const userSession = await checkUserSession(request, env);
    const isAdmin = !!adminLogged;
    const isUser = !!(userSession && userSession.role === "user");

    if (!isAdmin && !isUser) {
      return redirect(request, isArticlePath(path) ? "/user-login" : "/login");
    }

    if (!isAdmin && isUser && path === "/") return redirect(request, "/artikel");

    if (path === "/account/password" && method === "GET") {
      if (!isUser) return redirect(request, "/user-login");
      return userChangePasswordForm();
    }
    if (path === "/account/password" && method === "POST") {
      if (!isUser) return redirect(request, "/user-login");
      return userChangePassword(request, env);
    }

    if (!isAdmin && isUser && path !== "/account/password" && !isArticlePath(path)) {
      return forbiddenPage("Akun User hanya memiliki akses ke modul Artikel.");
    }

    // ADMIN DASHBOARD
    if (path === "/" && method === "GET") {
      if (!isAdmin) return redirect(request, "/artikel");
      return html(await dashboard(env));
    }

    if (path === "/cloudinary-test" && method === "GET") {
      if (!isAdmin) return redirect(request, "/login");
      return html(await cloudinaryTestPage());
    }

    // POHON
    if (path === "/pohon" && method === "GET") return html(await pohonList(env));
    if ((path === "/pohon/new" || path === "/pohon/tambah") && method === "GET") return html(await pohonForm(env, {}, false));
    if ((path === "/pohon/new" || path === "/pohon/tambah") && method === "POST") return pohonCreate(request, env);
    if (path.match(/^\/pohon\/[^/]+\/edit$/) && method === "GET") return html(await pohonEditPage(env, decodeURIComponent(path.split("/")[2])));
    if (path.match(/^\/pohon\/[^/]+\/kartu$/) && method === "GET") return html(await pohonKartuIdentitas(env, decodeURIComponent(path.split("/")[2])));
    if (path === "/pohon/edit" && method === "POST") return pohonEdit(request, env);
    if (path.match(/^\/pohon\/[^/]+\/update$/) && method === "POST") return pohonEdit(request, env);
    if (path.match(/^\/pohon\/[^/]+\/nonaktifkan$/) && method === "POST") return pohonNonaktifkan(request, env, decodeURIComponent(path.split("/")[2]));

    // POHON SAMPEL
    if (path === "/pohon-sampel" && method === "GET") return html(await pohonSampelList(env));
    if (path === "/pohon-sampel/new" && method === "GET") return html(await pohonSampelForm(env));
    if (path === "/pohon-sampel/new" && method === "POST") return pohonSampelCreate(request, env);
    if (path.match(/^\/pohon-sampel\/[^/]+$/) && method === "GET") return html(await pohonSampelDetail(env, decodeURIComponent(path.split("/")[2])));

    if (path.match(/^\/pohon-sampel\/[^/]+\/pengamatan\/new$/) && method === "GET") return html(await pengamatanForm(env, decodeURIComponent(path.split("/")[2])));
    if (path.match(/^\/pohon-sampel\/[^/]+\/pengamatan\/new$/) && method === "POST") return pengamatanCreate(request, env, decodeURIComponent(path.split("/")[2]));
    if (path.match(/^\/pohon-sampel\/[^/]+\/pengamatan\/[^/]+\/edit$/) && method === "GET") {
      const parts = path.split("/");
      return html(await pengamatanEditForm(env, decodeURIComponent(parts[2]), decodeURIComponent(parts[4])));
    }
    if (path.match(/^\/pohon-sampel\/[^/]+\/pengamatan\/[^/]+\/update$/) && method === "POST") {
      const parts = path.split("/");
      return pengamatanUpdate(request, env, decodeURIComponent(parts[2]), decodeURIComponent(parts[4]));
    }

    if (path.match(/^\/pohon-sampel\/[^/]+\/panen-riset\/new$/) && method === "GET") return html(await panenRisetForm(env, decodeURIComponent(path.split("/")[2])));
    if (path.match(/^\/pohon-sampel\/[^/]+\/panen-riset\/new$/) && method === "POST") return panenRisetCreate(request, env, decodeURIComponent(path.split("/")[2]));
    if (path.match(/^\/pohon-sampel\/[^/]+\/panen-riset\/[^/]+\/edit$/) && method === "GET") {
      const parts = path.split("/");
      return html(await panenRisetEditForm(env, decodeURIComponent(parts[2]), decodeURIComponent(parts[4])));
    }
    if (path.match(/^\/pohon-sampel\/[^/]+\/panen-riset\/[^/]+\/update$/) && method === "POST") {
      const parts = path.split("/");
      return panenRisetUpdate(request, env, decodeURIComponent(parts[2]), decodeURIComponent(parts[4]));
    }
    if (path.match(/^\/pohon-sampel\/[^/]+\/panen-riset\/[^/]+\/delete$/) && method === "POST") {
      const parts = path.split("/");
      return panenRisetDelete(env, decodeURIComponent(parts[2]), decodeURIComponent(parts[4]));
    }

    if (path.match(/^\/pohon-sampel\/[^/]+\/foto\/new$/) && method === "GET") {
  return html(await fotoPohonSampelForm(env, decodeURIComponent(path.split("/")[2])));
}    if (path.match(/^\/pohon-sampel\/[^/]+\/foto\/new$/) && method === "POST") return fotoPohonSampelCreate(request, env, decodeURIComponent(path.split("/")[2]));
    if (path.match(/^\/pohon-sampel\/[^/]+\/foto\/[^/]+\/edit$/) && method === "GET") {
      const parts = path.split("/");
      return html(await fotoPohonSampelEditForm(env, decodeURIComponent(parts[2]), decodeURIComponent(parts[4])));
    }
    if (path.match(/^\/pohon-sampel\/[^/]+\/foto\/[^/]+\/update$/) && method === "POST") {
      const parts = path.split("/");
      return fotoPohonSampelUpdate(request, env, decodeURIComponent(parts[2]), decodeURIComponent(parts[4]));
    }
    if (path.match(/^\/pohon-sampel\/[^/]+\/foto\/[^/]+\/delete$/) && method === "POST") {
      const parts = path.split("/");
      return fotoPohonSampelDelete(request, env, decodeURIComponent(parts[2]), decodeURIComponent(parts[4]));
    }

    // BLOK
    if (path === "/blok" && method === "GET") return html(await blokList(env));
    if (path === "/blok/new" && method === "GET") return html(await blokForm(env, {}, false));
    if (path === "/blok/create" && method === "POST") return blokCreate(request, env);
    if (path.match(/^\/blok\/[^/]+\/edit$/) && method === "GET") return html(await blokEditPage(env, decodeURIComponent(path.split("/")[2])));
    if (path === "/blok/edit" && method === "POST") return blokEdit(request, env);
    if (path.match(/^\/blok\/[^/]+\/nonaktifkan$/) && method === "POST") return blokNonaktifkan(request, env, decodeURIComponent(path.split("/")[2]));
    if (path.match(/^\/blok\/[^/]+\/aktifkan$/) && method === "POST") return blokAktifkan(request, env, decodeURIComponent(path.split("/")[2]));

    // PLOT
    if (path === "/plot" && method === "GET") return html(await plotList(env));
    if (path === "/plot/new" && method === "GET") return html(await plotForm(env, {}, false));
    if (path === "/plot/create" && method === "POST") return plotCreate(request, env);
    if (path.match(/^\/plot\/[^/]+\/edit$/) && method === "GET") return html(await plotEditPage(env, decodeURIComponent(path.split("/")[2])));
    if (path === "/plot/edit" && method === "POST") return plotEdit(request, env);
    if (path.match(/^\/plot\/[^/]+\/nonaktifkan$/) && method === "POST") return plotNonaktifkan(request, env, decodeURIComponent(path.split("/")[2]));
    if (path.match(/^\/plot\/[^/]+\/aktifkan$/) && method === "POST") return plotAktifkan(request, env, decodeURIComponent(path.split("/")[2]));

    // NURSERY
    if (path === "/nursery" && method === "GET") return html(await nurseryList(env));
    if ((path === "/nursery/new" || path === "/nursery/tambah") && method === "GET") return html(await nurseryForm(env, {}, false));
    if ((path === "/nursery/new" || path === "/nursery/tambah") && method === "POST") return nurseryCreate(request, env);
    if (path.match(/^\/nursery\/[^/]+\/edit$/) && method === "GET") return html(await nurseryEditPage(env, decodeURIComponent(path.split("/")[2])));
    if (path === "/nursery/edit" && method === "POST") return nurseryUpdate(request, env);
    if (path.match(/^\/nursery\/[^/]+\/update$/) && method === "POST") return nurseryUpdate(request, env);

    // PRODUKSI
    if (path === "/produksi" && method === "GET") return html(await produksiList(env));
    if ((path === "/produksi/new" || path === "/produksi/tambah") && method === "GET") return html(await produksiForm(env, {}, false));
    if ((path === "/produksi/new" || path === "/produksi/tambah") && method === "POST") return produksiCreate(request, env);
    if (path.match(/^\/produksi\/[^/]+\/edit$/) && method === "GET") return html(await produksiEditPage(env, decodeURIComponent(path.split("/")[2])));
    if (path.match(/^\/produksi\/[^/]+\/update$/) && method === "POST") return produksiUpdate(request, env);
    if (path === "/produksi/edit" && method === "POST") return produksiUpdate(request, env);

    // PEMUPUKAN
    if (path === "/pemupukan" && method === "GET") return html(await pemupukanList(env));
    if ((path === "/pemupukan/new" || path === "/pemupukan/tambah") && method === "GET") return html(await pemupukanForm(env, {}, false));
    if ((path === "/pemupukan/new" || path === "/pemupukan/tambah") && method === "POST") return pemupukanCreate(request, env);
    if (path.match(/^\/pemupukan\/[^/]+\/edit$/) && method === "GET") return html(await pemupukanEditPage(env, decodeURIComponent(path.split("/")[2])));
    if (path === "/pemupukan/edit" && method === "POST") return pemupukanUpdate(request, env);
    if (path.match(/^\/pemupukan\/[^/]+\/update$/) && method === "POST") return pemupukanUpdate(request, env);

    // PENYIRAMAN
    if (path === "/penyiraman" && method === "GET") return html(await penyiramanList(env));
    if ((path === "/penyiraman/new" || path === "/penyiraman/tambah") && method === "GET") return html(await penyiramanForm(env, {}, false));
    if ((path === "/penyiraman/new" || path === "/penyiraman/tambah") && method === "POST") return penyiramanCreate(request, env);
    if (path.match(/^\/penyiraman\/[^/]+\/edit$/) && method === "GET") return html(await penyiramanEditPage(env, decodeURIComponent(path.split("/")[2])));
    if (path === "/penyiraman/edit" && method === "POST") return penyiramanUpdate(request, env);
    if (path.match(/^\/penyiraman\/[^/]+\/update$/) && method === "POST") return penyiramanUpdate(request, env);

    // PENYAKIT
    if (path === "/penyakit" && method === "GET") return html(await penyakitList(env));
    if ((path === "/penyakit/new" || path === "/penyakit/tambah") && method === "GET") return html(await penyakitForm(env, {}, false));
    if ((path === "/penyakit/new" || path === "/penyakit/tambah") && method === "POST") return penyakitCreate(request, env);
    if (path.match(/^\/penyakit\/[^/]+\/edit$/) && method === "GET") return html(await penyakitEditPage(env, decodeURIComponent(path.split("/")[2])));
    if (path === "/penyakit/edit" && method === "POST") return penyakitUpdate(request, env);
    if (path.match(/^\/penyakit\/[^/]+\/update$/) && method === "POST") return penyakitUpdate(request, env);

    // PEMELIHARAAN
    if (path === "/pemeliharaan" && method === "GET") return html(await pemeliharaanList(env));
    if (path === "/pemeliharaan/new" && method === "GET") return html(await pemeliharaanForm(env, {}, false));
    if (path === "/pemeliharaan/new" && method === "POST") return pemeliharaanCreate(request, env);
    if (path.match(/^\/pemeliharaan\/[^/]+\/edit$/) && method === "GET") return html(await pemeliharaanEditPage(env, decodeURIComponent(path.split("/")[2])));
    if (path === "/pemeliharaan/edit" && method === "POST") return pemeliharaanUpdate(request, env);
    if (path.match(/^\/pemeliharaan\/[^/]+\/delete$/) && method === "POST") return pemeliharaanDelete(request, env, decodeURIComponent(path.split("/")[2]));
    if (path.match(/^\/pemeliharaan\/[^/]+\/update$/) && method === "POST") return pemeliharaanUpdate(request, env);

    // PANEN
    if (path === "/panen" && method === "GET") return html(await panenList(env));
    if (path === "/panen/new" && method === "GET") return html(await panenForm(env, {}, false));
    if (path === "/panen/new" && method === "POST") return panenCreate(request, env);
    if (path.match(/^\/panen\/[^/]+\/edit$/) && method === "GET") return html(await panenEditPage(env, decodeURIComponent(path.split("/")[2])));
    if (path.match(/^\/panen\/[^/]+\/update$/) && method === "POST") return panenUpdate(request, env, decodeURIComponent(path.split("/")[2]));
    if (path.match(/^\/panen\/[^/]+\/delete$/) && method === "POST") return panenDelete(request, env, decodeURIComponent(path.split("/")[2]));

    // FOTO
    if (path === "/foto" && method === "GET") return html(await fotoList(env));
    if (path === "/foto/new" && method === "GET") return html(await fotoForm(env, {}, false));
    if (path === "/foto/new" && method === "POST") return fotoSave(request, env);
    if (path.match(/^\/foto\/[^/]+\/edit$/) && method === "GET") return html(await fotoEditPage(env, decodeURIComponent(path.split("/")[2])));
    if (path.match(/^\/foto\/[^/]+\/update$/) && method === "POST") return fotoUpdate(request, env, decodeURIComponent(path.split("/")[2]));
    if (path.match(/^\/foto\/[^/]+\/delete$/) && method === "POST") return fotoDelete(request, env, decodeURIComponent(path.split("/")[2]));

    // CATATAN
    if (path === "/catatan" && method === "GET") return html(await catatanList(env));
    if (path === "/catatan/new" && method === "GET") return html(await catatanForm(env, {}, false));
    if (path === "/catatan/new" && method === "POST") return catatanCreate(request, env);
    if (path.match(/^\/catatan\/[^/]+\/edit$/) && method === "GET") return html(await catatanEditPage(env, decodeURIComponent(path.split("/")[2])));
    if (path.match(/^\/catatan\/[^/]+\/update$/) && method === "POST") return catatanUpdate(request, env, decodeURIComponent(path.split("/")[2]));
    if (path.match(/^\/catatan\/[^/]+\/delete$/) && method === "POST") return catatanDelete(request, env, decodeURIComponent(path.split("/")[2]));

    // ARTIKEL
    if (path === "/artikel" && method === "GET") return html(await artikelList(env, isAdmin ? { type:"admin", session:true } : { type:"user", session:userSession }));
    if (path === "/artikel/new" && method === "GET") return html(await artikelForm(env, isAdmin ? { type:"admin", session:true } : { type:"user", session:userSession }, {}, false));
    if (path === "/artikel/new" && method === "POST") return artikelSave(request, env, isAdmin ? { type:"admin", session:true } : { type:"user", session:userSession });
    if (path.match(/^\/artikel\/[^/]+\/edit$/) && method === "GET") {
      const id = decodeURIComponent(path.split("/")[2]);
      const access = isAdmin ? { type:"admin", session:true } : { type:"user", session:userSession };
      const article = await env.DB.prepare(`SELECT * FROM artikel WHERE id=? LIMIT 1`).bind(id).first();
      if (!article) return forbiddenPage("Artikel tidak ditemukan.");
      return html(await artikelForm(env, access, article, true));
    }
    if (path.match(/^\/artikel\/[^/]+\/update$/) && method === "POST") {
      const id = decodeURIComponent(path.split("/")[2]);
      return artikelSave(request, env, isAdmin ? { type:"admin", session:true } : { type:"user", session:userSession }, id);
    }
    if (path.match(/^\/artikel\/[^/]+\/publish$/) && method === "POST") {
      if (!isAdmin) return forbiddenPage("Hanya Admin yang dapat mempublikasikan artikel.");
      return artikelPublish(request, env, decodeURIComponent(path.split("/")[2]));
    }
    if (path.match(/^\/artikel\/[^/]+\/delete$/) && method === "POST") {
      return artikelDelete(request, env, isAdmin ? { type:"admin", session:true } : { type:"user", session:userSession }, decodeURIComponent(path.split("/")[2]));
    }

    // USER MANAGEMENT
    if (isUserManagementPath(path) && !isAdmin) return forbiddenPage("Modul User Management hanya dapat diakses Admin.");
    if (path === "/users" && method === "GET") return html(await usersList(env));
    if (path === "/users/new" && method === "GET") return html(await userForm(env, {}, false));
    if (path === "/users/new" && method === "POST") return userCreate(request, env);
    if (path.match(/^\/users\/[^/]+\/edit$/) && method === "GET") return html(await userEditPage(env, decodeURIComponent(path.split("/")[2])));
    if (path.match(/^\/users\/[^/]+\/update$/) && method === "POST") return userUpdate(request, env, decodeURIComponent(path.split("/")[2]));
    if (path.match(/^\/users\/[^/]+\/reset$/) && method === "GET") return html(await userResetForm(env, decodeURIComponent(path.split("/")[2])));
    if (path.match(/^\/users\/[^/]+\/reset$/) && method === "POST") return userResetPassword(request, env, decodeURIComponent(path.split("/")[2]));

    // 404
    return html(layout("404", `<div class="card"><div class="notice notice-danger"><strong>404 — Halaman tidak ditemukan.</strong><div>Path: <code>${esc(path)}</code></div></div></div>`, "", isAdmin ? "admin" : "user"), 404);
  }
};
