"use strict";
/* ===========================================================================
   Datos comunes, utilidades y capa de datos (Store).
   =========================================================================== */

const CATS = [
  { id: "anillos", n: "Anillos", subs: [["tejidos", "Anillos tejidos"], ["macizos", "Anillos macizos"]] },
  { id: "cadenas", n: "Cadenas y collares", subs: [] },
  { id: "pulseras", n: "Pulseras y pulsos", subs: [["balin", "Pulseras de balín"], ["lazo", "Pulseras de lazo completo"]] },
  { id: "aretes", n: "Aretes", subs: [] },
  { id: "dijes", n: "Dijes", subs: [] }
];

const DEPTOS = ["Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca", "Vaupés", "Vichada"];

/* ---------- Utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(+n || 0);
const dec = n => String(n).replace(".", ",");
const catOf = id => CATS.find(c => c.id === id);
const subName = (cat, sub) => { const c = catOf(cat); const s = c && c.subs.find(x => x[0] === sub); return s ? s[1] : ""; };

const nameOf = p => [p.nombre, p.material].filter(Boolean).join(" ");
const specsOf = p => [p.peso ? dec(p.peso) + " Gr" : "", p.grosor ? dec(p.grosor) + " Mm" : "", p.largo ? dec(p.largo) + " Cm" : ""].filter(Boolean).join(" / ");
const titleOf = p => [nameOf(p), specsOf(p)].filter(Boolean).join(" / ");
const hasTallas = p => p.cat === "anillos" && Array.isArray(p.tallas) && p.tallas.length > 0;
const stockOf = p => hasTallas(p) ? p.tallas.reduce((a, t) => a + (+t.stock || 0), 0) : (+p.stock || 0);
const isOffer = p => +p.anterior > +p.precio;
const pctOff = p => Math.round((1 - p.precio / p.anterior) * 100);
const normWa = v => {
  const d = String(v || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10 && d[0] === "3") return "57" + d;
  if (d.length === 12 && d.startsWith("57")) return d;
  return null;
};

function toast(msg, bad) {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    document.body.append(t);
  }
  t.textContent = msg;
  t.className = "show" + (bad ? " bad" : "");
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.className = ""; }, 3800);
}

/* Imagen provisional dibujada (se usa mientras una joya no tiene foto). */
const _ph = {};
function placeholder(cat, sub) {
  const key = cat + "|" + (sub || "");
  if (_ph[key]) return _ph[key];
  const defs = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e3a4"/><stop offset=".5" stop-color="#c39a3b"/><stop offset="1" stop-color="#f0d684"/></linearGradient><radialGradient id="b" cx=".5" cy=".4" r=".85"><stop offset="0" stop-color="#2e2e2e"/><stop offset="1" stop-color="#050505"/></radialGradient></defs><rect width="400" height="400" fill="url(#b)"/>';
  let s = "";
  if (cat === "anillos") {
    s = '<ellipse cx="200" cy="215" rx="88" ry="100" fill="none" stroke="url(#g)" stroke-width="28"/>';
    s += sub === "tejidos"
      ? '<ellipse cx="200" cy="215" rx="88" ry="100" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="28" stroke-dasharray="3 10"/>'
      : '<rect x="166" y="92" width="68" height="44" rx="8" fill="url(#g)"/>';
  } else if (cat === "cadenas") {
    for (let i = 0; i <= 18; i++) {
      const t = i / 18, x = 50 + 300 * t, y = 90 + 200 * (1 - Math.pow(2 * t - 1, 2));
      const ang = Math.atan(-800 * (2 * t - 1) / 300) * 180 / Math.PI;
      const rx = i % 2 ? 15 : 11, ry = i % 2 ? 7 : 10;
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx}" ry="${ry}" transform="rotate(${ang.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="none" stroke="url(#g)" stroke-width="5"/>`;
    }
  } else if (cat === "pulseras") {
    if (sub === "balin") {
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * Math.PI * 2;
        s += `<circle cx="${(200 + 108 * Math.cos(a)).toFixed(1)}" cy="${(205 + 108 * Math.sin(a)).toFixed(1)}" r="11" fill="url(#g)"/>`;
      }
    } else {
      s = '<circle cx="200" cy="205" r="106" fill="none" stroke="url(#g)" stroke-width="24"/><circle cx="200" cy="205" r="106" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="24" stroke-dasharray="3 12"/>';
    }
  } else if (cat === "aretes") {
    s = '<circle cx="135" cy="215" r="52" fill="none" stroke="url(#g)" stroke-width="13"/><circle cx="265" cy="215" r="52" fill="none" stroke="url(#g)" stroke-width="13"/><circle cx="135" cy="150" r="8" fill="url(#g)"/><circle cx="265" cy="150" r="8" fill="url(#g)"/>';
  } else {
    s = '<path d="M110 50 Q200 170 290 50" fill="none" stroke="url(#g)" stroke-width="5"/><circle cx="200" cy="250" r="80" fill="url(#g)"/><circle cx="200" cy="250" r="60" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="3"/><circle cx="200" cy="250" r="14" fill="#000" fill-opacity=".4"/>';
  }
  return (_ph[key] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">${defs}${s}</svg>`));
}
const imgOf = p => p.img || placeholder(p.cat, p.sub);
/* Galería: foto principal (img) + hasta 3 secundarias (fotos). Los productos con una sola foto siguen funcionando. */
const MAX_FOTOS = 4;
const photosOf = p => [p.img, ...(Array.isArray(p.fotos) ? p.fotos : [])].filter(u => typeof u === "string" && u).slice(0, MAX_FOTOS);
const galleryOf = p => { const l = photosOf(p); return l.length ? l : [placeholder(p.cat, p.sub)]; };

/* Reduce la foto antes de subirla (los celulares generan fotos de varios MB). */
async function shrink(file, max = 1400, q = 0.86) {
  if (!/^image\//.test(file.type)) throw new Error("Elige una imagen JPG, PNG o WebP.");
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch {
    src = await new Promise((ok, no) => {
      const i = new Image(), u = URL.createObjectURL(file);
      i.onload = () => { URL.revokeObjectURL(u); ok(i); };
      i.onerror = () => no(new Error("No se pudo leer la imagen."));
      i.src = u;
    });
  }
  const w = src.width, h = src.height, k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(src, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, "image/jpeg", q));
  if (!blob) throw new Error("No se pudo preparar la foto.");
  return blob;
}

/* ===========================================================================
   Store: una sola puerta de entrada a los datos
   - Producción (GitHub Pages): el panel guarda los cambios como archivos del
     repositorio usando la API de GitHub. El token se guarda cifrado con la
     contraseña de la dueña en data/admin.json.
   - Vista previa local (localhost / archivo suelto): guarda en el navegador.
   =========================================================================== */
const Store = (() => {
  const host = location.hostname;
  const LOCAL = location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) || host.endsWith(".local");
  const KEY = "joyeria_demo_v1", DEMO_PW = "demo1234", MIN_PW = 10, SK = "joyeria_gh", MK = "joyeria_modo";
  const safe = fn => { try { return fn(); } catch { return null; } };
  const q = new URLSearchParams(location.search).get("modo");
  if (LOCAL && (q === "github" || q === "demo")) safe(() => localStorage.setItem(MK, q));
  const DEMO = LOCAL && safe(() => localStorage.getItem(MK)) !== "github";

  const fail = (m, status) => { const e = new Error(m); if (status) e.status = status; throw e; };
  const n0 = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v || 0)));
  const nf = (v, max) => { const f = parseFloat(String(v ?? "").replace(",", ".")); return f > 0 ? Math.round(Math.min(f, max) * 100) / 100 : null; };
  const rid = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, "0")).join("");

  /* ---------- Validación de datos (igual para las dos modalidades) ---------- */
  function clean(i, old) {
    const c = catOf(i.cat); if (!c) fail("Elige una categoría.");
    const nombre = String(i.nombre || "").trim().slice(0, 100); if (!nombre) fail("Escribe el nombre de la joya.");
    const precio = n0(i.precio, 0, 1e8); if (precio < 1) fail("Escribe el precio.");
    let anterior = n0(i.anterior, 0, 1e8); if (anterior <= precio) anterior = 0;
    let stock = n0(i.stock, 0, 9999); const tallas = [];
    if (i.cat === "anillos") {
      const seen = {};
      (i.tallas || []).forEach(t => { const n = String(t.t || "").trim().slice(0, 10), k = n.toLowerCase(); if (n && !seen[k]) { seen[k] = 1; tallas.push({ t: n, stock: n0(t.stock, 0, 9999) }); } });
      stock = tallas.reduce((a, t) => a + t.stock, 0);
    }
    return {
      id: old ? old.id : "p" + rid(6), cat: i.cat, sub: c.subs.some(s => s[0] === i.sub) ? i.sub : "",
      nombre, material: String(i.material || "").trim().slice(0, 60),
      peso: nf(i.peso, 9999), grosor: nf(i.grosor, 99), largo: nf(i.largo, 999), tallas, stock, precio, anterior,
      img: old ? old.img : "", fotos: old && Array.isArray(old.fotos) ? old.fotos : [], desc: String(i.desc || "").trim().slice(0, 600), activo: !!i.activo,
      creado: old ? old.creado : Math.floor(Date.now() / 1000)
    };
  }
  function cleanSettings(s, prev) {
    const wa = normWa(s.whatsapp); if (wa === null) fail("El WhatsApp debe tener 10 dígitos, por ejemplo 3001234567.");
    const tienda = String(s.tienda || "").trim().slice(0, 40); if (!tienda) fail("Escribe el nombre de la tienda.");
    const t = (v, n) => String(v || "").trim().slice(0, n);
    return { ...prev, tienda, whatsapp: wa, anuncio: t(s.anuncio, 120), heroTitulo: t(s.heroTitulo, 120), heroTexto: t(s.heroTexto, 240), garantia: t(s.garantia, 1200) };
  }
  const readBlob = b => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(b); });

  /* ---------- Cifrado de la clave (AES-GCM + PBKDF2) ---------- */
  const b64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode(...u8.subarray(i, i + 8192)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const utf8 = s => b64(new TextEncoder().encode(s));
  const unutf8 = s => new TextDecoder().decode(unb64(s));
  async function keyFrom(pw, salt, it) {
    const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: it, hash: "SHA-256" }, km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function seal(obj, pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), it = 600000;
    const k = await keyFrom(pw, salt, it);
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(JSON.stringify(obj)));
    return { v: 1, it, salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(ct)) };
  }
  async function unseal(e, pw) {
    try {
      const k = await keyFrom(pw, unb64(e.salt), e.it);
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(e.iv) }, k, unb64(e.data));
      return JSON.parse(new TextDecoder().decode(pt));
    } catch { return null; }
  }

  /* ---------- Modalidad vista previa (navegador) ---------- */
  const db = {
    get() {
      const d = safe(() => JSON.parse(localStorage.getItem(KEY)));
      if (d && d.products && d.settings) return d;
      return JSON.parse(JSON.stringify(SEED));
    },
    set(d) {
      try { localStorage.setItem(KEY, JSON.stringify(d)); }
      catch { fail("El navegador no tiene espacio para guardar más fotos en la vista previa."); }
    }
  };
  const demoNeed = () => { if (sessionStorage.getItem("joyeria_demo_auth") !== "1") fail("Tu sesión terminó. Ingresa de nuevo.", 401); };
  const demoDriver = {
    async readAll() { demoNeed(); return db.get(); },
    async mutProducts(fn) { demoNeed(); const d = db.get(); d.products = fn(d.products); db.set(d); },
    async mutSettings(fn) { demoNeed(); const d = db.get(); d.settings = fn(d.settings); db.set(d); return d.settings; },
    async putImage(blob) { demoNeed(); return readBlob(blob); },
    async delImage() { /* las fotos viven dentro del producto */ }
  };

  /* ---------- Modalidad GitHub ---------- */
  let conf = null, sess = safe(() => JSON.parse(sessionStorage.getItem(SK)));
  let chain = Promise.resolve();
  const serial = fn => { const r = chain.then(fn, fn); chain = r.catch(() => {}); return r; };

  async function gh(path, o = {}, auth = sess) {
    if (!auth) fail("Tu sesión terminó. Ingresa de nuevo.", 401);
    let r;
    try {
      r = await fetch(`https://api.github.com/repos/${auth.owner}/${auth.repo}${path}`, {
        method: o.method || "GET",
        headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + auth.token, "X-GitHub-Api-Version": "2022-11-28", ...(o.body ? { "Content-Type": "application/json" } : {}) },
        body: o.body ? JSON.stringify(o.body) : undefined, cache: "no-store"
      });
    } catch { fail("No hay conexión con GitHub. Revisa tu internet."); }
    if (r.status === 404 && o.allow404) return null;
    if (r.status === 401) { safe(() => sessionStorage.removeItem(SK)); sess = null; fail("El token de GitHub no es válido o venció. Genera uno nuevo y, para configurarlo otra vez, borra el archivo data/admin.json de tu repositorio en GitHub.", 401); }
    if (r.status === 403 || r.status === 429) fail("GitHub no permitió el cambio (permisos del token o demasiadas solicitudes). Espera un momento e inténtalo de nuevo.");
    if (r.status === 404) fail("No se encontró el repositorio. Revisa el usuario y el nombre.");
    const d = r.status === 204 ? null : await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d && d.message ? "GitHub: " + d.message : "Error de GitHub."); e.status = r.status; throw e; }
    return d;
  }
  const ref = a => `ref=${encodeURIComponent((a || sess).branch)}`;
  async function ghRead(path) {
    const r = await gh(`/contents/${path}?${ref()}`, { allow404: true });
    return r ? { sha: r.sha, text: unutf8(r.content) } : null;
  }
  const ghPut = (path, content64, msg, sha, a = sess) => gh(`/contents/${path}`, { method: "PUT", body: { message: msg, content: content64, branch: a.branch, ...(sha ? { sha } : {}) } }, a);
  async function ghMutJson(path, fn, msg, fallback) {
    for (let i = 0; i < 3; i++) {
      const cur = await ghRead(path);
      const next = fn(cur ? JSON.parse(cur.text) : fallback);
      try { await ghPut(path, utf8(JSON.stringify(next, null, 1)), msg, cur && cur.sha); return next; }
      catch (e) { if (i === 2 || (e.status !== 409 && e.status !== 422)) throw e; }
    }
  }
  const ghDriver = {
    async readAll() {
      const [p, s] = await Promise.all([ghRead("data/products.json"), ghRead("data/settings.json")]);
      return { products: p ? JSON.parse(p.text) : [], settings: s ? JSON.parse(s.text) : {} };
    },
    mutProducts: fn => ghMutJson("data/products.json", fn, "Panel: actualiza productos", []),
    mutSettings: fn => ghMutJson("data/settings.json", fn, "Panel: actualiza ajustes", {}),
    async putImage(blob) {
      const path = `uploads/f${rid(8)}.jpg`;
      await ghPut(path, (await readBlob(blob)).split(",")[1], "Panel: sube foto");
      return path;
    },
    async delImage(url) {
      if (!/^uploads\/f[a-f0-9]{16}\.(jpg|png|webp)$/.test(url)) return;
      try {
        const cur = await gh(`/contents/${url}?${ref()}`, { allow404: true });
        if (cur) await gh(`/contents/${url}`, { method: "DELETE", body: { message: "Panel: borra foto", sha: cur.sha, branch: sess.branch } });
      } catch { /* si no se puede borrar, no pasa nada */ }
    }
  };
  const D = DEMO ? demoDriver : ghDriver;

  async function loadConf() {
    if (conf) return conf;
    try {
      const r = await fetch("data/admin.json?v=" + Date.now(), { cache: "no-store" });
      if (r.ok) conf = await r.json();
    } catch { /* sin configurar */ }
    return conf;
  }
  async function staticJson(path) {
    let r;
    try { r = await fetch(path + "?v=" + Date.now(), { cache: "no-store" }); } catch { fail("No se pudo cargar " + path); }
    if (!r.ok) fail("No se pudo cargar " + path);
    return r.json();
  }

  /* ---------- API ---------- */
  return {
    mode: () => DEMO ? "demo" : "github",
    async init() { return DEMO ? "demo" : "github"; },
    async getPublic() {
      if (DEMO) { const d = db.get(); return { settings: d.settings, products: d.products.filter(p => p.activo) }; }
      const [settings, products] = await Promise.all([staticJson("data/settings.json"), staticJson("data/products.json")]);
      return { settings, products: products.filter(p => p.activo) };
    },
    async getSession() {
      if (DEMO) return { auth: sessionStorage.getItem("joyeria_demo_auth") === "1", configured: true };
      await loadConf();
      return { auth: !!sess, configured: !!conf };
    },
    /* Configuración inicial (solo GitHub): guarda el token cifrado con la contraseña. */
    async setup({ owner, repo, token, password }) {
      if (DEMO) fail("La configuración no se usa en la vista previa local.");
      owner = owner.trim(); repo = repo.trim(); token = token.trim();
      if (password.length < MIN_PW) fail(`La contraseña debe tener mínimo ${MIN_PW} caracteres.`);
      const probe = { owner, repo, token, branch: "main" };
      const info = await gh("", {}, probe);
      if (info.permissions && info.permissions.push === false) fail("Ese token no puede escribir en el repositorio. Dale permiso \"Contents: Read and write\".");
      const a = { owner, repo, token, branch: info.default_branch || "main" };
      const enc = await seal({ token }, password);
      const prev = await gh(`/contents/data/admin.json?${ref(a)}`, { allow404: true }, a);
      const file = { owner, repo, branch: a.branch, enc };
      await ghPut("data/admin.json", utf8(JSON.stringify(file, null, 1)), "Panel: configuración inicial", prev && prev.sha, a);
      conf = file; sess = a; safe(() => sessionStorage.setItem(SK, JSON.stringify(a)));
    },
    async login(pw) {
      if (DEMO) {
        if (pw !== (db.get().pw || DEMO_PW)) fail("Contraseña incorrecta.");
        sessionStorage.setItem("joyeria_demo_auth", "1"); return;
      }
      await loadConf(); if (!conf) fail("El panel aún no está configurado.");
      const k = await unseal(conf.enc, pw);
      if (!k || !k.token) fail("Contraseña incorrecta.");
      sess = { owner: conf.owner, repo: conf.repo, branch: conf.branch, token: k.token };
      safe(() => sessionStorage.setItem(SK, JSON.stringify(sess)));
    },
    async logout() {
      safe(() => sessionStorage.removeItem(SK)); safe(() => sessionStorage.removeItem("joyeria_demo_auth")); sess = null;
    },
    async adminList() { const d = await D.readAll(); return { settings: d.settings, products: d.products, avisos: {} }; },
    /* fotos: lista de hasta 4 casillas en orden; cada una es null, { url } (foto que ya existe) o { file } (foto nueva).
       La primera foto que quede es la principal; las demás son las miniaturas. */
    saveProduct(p, fotos) {
      return serial(async () => {
        const slots = (fotos || []).slice(0, MAX_FOTOS);
        const nuevas = [];
        for (const sl of slots) nuevas.push(sl && sl.file ? await D.putImage(sl.file) : null);
        let saved, antes = [];
        await D.mutProducts(list => {
          const i = list.findIndex(x => x.id === p.id), old = i >= 0 ? list[i] : null;
          if (p.id && !old) fail("Esta joya ya no existe. Recarga la página.");
          saved = clean(p, old);
          antes = old ? photosOf(old) : [];
          const final = slots.map((sl, k) => nuevas[k] || (sl && sl.url && antes.includes(sl.url) ? sl.url : "")).filter(Boolean);
          if (fotos) { saved.img = final[0] || ""; saved.fotos = final.slice(1); }
          if (old) list[i] = saved; else list.unshift(saved);
          return list;
        });
        const quedan = photosOf(saved);
        for (const u of antes) if (!quedan.includes(u)) await D.delImage(u);
        return saved;
      });
    },
    deleteProduct(id) {
      return serial(async () => {
        let imgs = [];
        await D.mutProducts(list => list.filter(x => { if (x.id === id) imgs = photosOf(x); return x.id !== id; }));
        for (const u of imgs) await D.delImage(u);
      });
    },
    setStock(id, stock) {
      return serial(async () => {
        let out;
        await D.mutProducts(list => {
          const p = list.find(x => x.id === id); if (!p) fail("Esta joya ya no existe. Recarga la página.");
          if (hasTallas(p)) fail("Los anillos se editan por talla desde \"Editar\".");
          p.stock = n0(stock, 0, 9999); out = p; return list;
        });
        return out;
      });
    },
    setActive(id, activo) {
      return serial(async () => {
        let out;
        await D.mutProducts(list => {
          const p = list.find(x => x.id === id); if (!p) fail("Esta joya ya no existe. Recarga la página.");
          p.activo = !!activo; out = p; return list;
        });
        return out;
      });
    },
    saveSettings(s) { return serial(() => D.mutSettings(prev => cleanSettings(s, prev))); },
    async changePassword(actual, nueva) {
      if (nueva.length < MIN_PW) fail(`La nueva contraseña debe tener mínimo ${MIN_PW} caracteres.`);
      if (DEMO) {
        demoNeed(); const d = db.get(); if (actual !== (d.pw || DEMO_PW)) fail("La contraseña actual no es correcta.");
        d.pw = nueva; db.set(d); return;
      }
      await loadConf();
      if (!(await unseal(conf.enc, actual))) fail("La contraseña actual no es correcta.");
      const cur = await ghRead("data/admin.json");
      const file = { ...conf, enc: await seal({ token: sess.token }, nueva) };
      await ghPut("data/admin.json", utf8(JSON.stringify(file, null, 1)), "Panel: cambia la contraseña", cur && cur.sha);
      conf = file;
    }
  };
})();
