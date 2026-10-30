"use strict";
/* Panel de administración: ingreso, productos, stock en vivo, fotos y ajustes. */
(async () => {
  let S = {}, P = [], editing = null, slots = [null, null, null, null];
  const flt = { q: "", cat: "" };
  const timers = {};

  const show = id => ["boot", "setup", "login", "app"].forEach(x => { $("#" + x).hidden = x !== id; });
  const numOf = v => { const f = parseFloat(String(v).replace(",", ".")); return f > 0 ? f : null; };

  /* Envuelve las llamadas: si la sesión terminó vuelve al ingreso; si falla muestra el motivo. */
  async function guard(fn) {
    try { return await fn(); }
    catch (e) {
      if (e.status === 401) { await toLogin(e.message); return undefined; }
      toast(e.message || "Ocurrió un error.", true);
      return undefined;
    }
  }

    const pub = () => Store.mode() === "github" ? ". Se verá en la tienda en 1 o 2 minutos." : "";

  /* ---------- Configuración inicial ---------- */
  function toSetup() {
    const m = location.hostname.match(/^([^.]+)\.github\.io$/);
    if (m) {
      $("#su-o").value = m[1];
      $("#su-r").value = location.pathname.split("/").filter(Boolean).filter(x => !/\.html$/.test(x))[0] || location.hostname;
    }
    $("#suerr").textContent = "";
    show("setup");
  }
  $("#suf").onsubmit = async e => {
    e.preventDefault();
    const f = e.target, err = $("#suerr"), b = $("#sugo");
    err.textContent = "";
    if (f.pw.value !== f.pw2.value) { err.textContent = "Las contraseñas no coinciden."; return; }
    b.disabled = true; b.textContent = "Conectando…";
    try {
      await Store.setup({ owner: f.owner.value, repo: f.repo.value, token: f.token.value, password: f.pw.value });
      f.reset();
      await toApp();
      toast("Listo: el panel quedó conectado. Se activa del todo en 1 o 2 minutos.");
    } catch (x) {
      err.textContent = x.message || "No se pudo guardar la configuración.";
    } finally {
      b.disabled = false; b.textContent = "Guardar configuración";
    }
  };

  /* ---------- Ingreso ---------- */
  async function toLogin(msg) {
    try { await Store.getSession(); } catch { /* sigue */ }
    $("#lBrand").textContent = S.tienda || "Joyería";
    $("#lDemo").hidden = Store.mode() !== "demo";
    $("#lerr").textContent = msg || "";
    $("#pw").value = "";
    show("login");
    $("#pw").focus();
  }
  $("#pwSee").onclick = () => {
    const i = $("#pw"), v = i.type === "password";
    i.type = v ? "text" : "password";
    $("#pwSee").textContent = v ? "Ocultar" : "Mostrar";
  };
  $("#lf").onsubmit = async e => {
    e.preventDefault();
    const b = $("#lgo"), err = $("#lerr");
    err.textContent = "";
    b.disabled = true; b.textContent = "Ingresando…";
    try {
      await Store.login($("#pw").value);
      await toApp();
    } catch (x) {
      err.textContent = x.message || "No se pudo ingresar.";
      $("#pw").select();
    } finally {
      b.disabled = false; b.textContent = "Ingresar";
    }
  };
  $("#logout").onclick = async () => { await guard(() => Store.logout()); await toLogin(); };

  /* ---------- Panel ---------- */
  let AV = {};
  async function refresh() {
    const d = await guard(() => Store.adminList());
    if (!d) return false;
    S = d.settings; P = d.products; AV = d.avisos || {};
    return true;
  }
  async function toApp() {
    if (!(await refresh())) return;
    $("#aBrand").textContent = S.tienda;
    document.title = `Panel | ${S.tienda}`;
    paintAvisos(); paintList(); fillSettings();
    $("#nota").hidden = Store.mode() !== "github";
    show("app");
  }
  function paintAvisos() {
    const a = [];
    if (!S.whatsapp) a.push('<div class="aviso rojo"><b>Falta tu WhatsApp.</b> Sin él los clientes no pueden enviarte pedidos. <button class="link" type="button" data-goto="aj">Configurarlo ahora</button></div>');
    $("#avisos").innerHTML = a.join("");
  }
  function tab(which) {
    const aj = which === "aj";
    $("#tabP").setAttribute("aria-selected", String(!aj));
    $("#tabA").setAttribute("aria-selected", String(aj));
    $("#tProd").hidden = aj; $("#tAj").hidden = !aj;
  }
  $("#tabP").onclick = () => tab("p");
  $("#tabA").onclick = () => tab("aj");
  $("#avisos").onclick = e => { if (e.target.dataset.goto) tab("aj"); };

  /* ---------- Lista de productos ---------- */
  $("#fc").innerHTML += CATS.map(c => `<option value="${c.id}">${esc(c.n)}</option>`).join("");
  function stockCell(p) {
    if (hasTallas(p)) {
      return `<span class="stk-l">Stock por talla</span><span class="stk-t">${p.tallas.map(t => `${esc(t.t)}: <b>${t.stock}</b>`).join(" / ")}</span>`;
    }
    return `<span class="stk-l">Cantidad disponible</span><span class="stp"><button type="button" data-dec aria-label="Restar uno">&minus;</button><input type="number" min="0" step="1" inputmode="numeric" value="${stockOf(p)}" aria-label="Cantidad disponible" data-stock><button type="button" data-inc aria-label="Sumar uno">+</button></span>`;
  }
  function item(p) {
    const st = stockOf(p);
    return `<li class="it ${p.activo ? "" : "off"}" data-id="${esc(p.id)}">
      <img class="th" src="${imgOf(p)}" alt="" loading="lazy" width="72" height="72">
      <div class="inf">
        <b>${esc(nameOf(p))}</b>
        <span>${esc(subName(p.cat, p.sub) || catOf(p.cat).n)}${specsOf(p) ? " / " + esc(specsOf(p)) : ""}</span>
        <span class="pc">${money(p.precio)}${isOffer(p) ? `<s>${money(p.anterior)}</s>` : ""}</span>
        <span>${st < 1 ? '<span class="badge no">Agotado</span> ' : ""}${p.activo ? "" : '<span class="badge">Oculto en la tienda</span>'}</span>
      </div>
      <div class="st">${stockCell(p)}</div>
      <div class="ac">
        <button class="btn line sm" type="button" data-edit>Editar</button>
        <button class="btn line sm" type="button" data-tog>${p.activo ? "Ocultar" : "Mostrar"}</button>
        <button class="btn danger sm" type="button" data-del>Eliminar</button>
      </div></li>`;
  }
  function paintList() {
    const q = String(flt.q).toLowerCase();
    const l = P.filter(p => (!flt.cat || p.cat === flt.cat) && (!q || titleOf(p).toLowerCase().includes(q)));
    const ag = P.filter(p => stockOf(p) < 1).length, oc = P.filter(p => !p.activo).length;
    $("#stats").textContent = `${P.length} ${P.length === 1 ? "joya" : "joyas"} en total / ${ag} agotadas / ${oc} ocultas`;
    $("#list").innerHTML = l.length ? l.map(item).join("") : '<li class="mut" style="padding:1rem 0">No hay joyas con ese filtro.</li>';
  }
  $("#fq").oninput = e => { flt.q = e.target.value; paintList(); };
  $("#fc").onchange = e => { flt.cat = e.target.value; paintList(); };

  /* Stock en vivo: se guarda solo medio segundo después del último cambio. */
  function queueStock(id, input) {
    const v = Math.max(0, Math.min(9999, Math.round(+input.value || 0)));
    input.value = v;
    clearTimeout(timers[id]);
    timers[id] = setTimeout(async () => {
      const p = await guard(() => Store.setStock(id, v));
      if (!p) { await refresh(); paintList(); return; }
      const i = P.findIndex(x => x.id === id); if (i >= 0) P[i] = p;
      toast("Cantidad guardada" + pub());
      const li = $(`.it[data-id="${id}"]`);
      paintStatsOnly();
      if (li) updateBadges(li, p);
    }, 900);
  }
  function paintStatsOnly() {
    const ag = P.filter(p => stockOf(p) < 1).length, oc = P.filter(p => !p.activo).length;
    $("#stats").textContent = `${P.length} ${P.length === 1 ? "joya" : "joyas"} en total / ${ag} agotadas / ${oc} ocultas`;
  }
  function updateBadges(li, p) {
    const sp = $(".inf > span:last-child", li);
    sp.innerHTML = (stockOf(p) < 1 ? '<span class="badge no">Agotado</span> ' : "") + (p.activo ? "" : '<span class="badge">Oculto en la tienda</span>');
  }

  $("#list").onclick = async e => {
    const li = e.target.closest(".it"); if (!li) return;
    const id = li.dataset.id, p = P.find(x => x.id === id);
    if (e.target.closest("[data-inc],[data-dec]")) {
      const inp = $("[data-stock]", li);
      inp.value = Math.max(0, (+inp.value || 0) + (e.target.closest("[data-inc]") ? 1 : -1));
      queueStock(id, inp);
    } else if (e.target.closest("[data-edit]")) {
      openEditor(p);
    } else if (e.target.closest("[data-tog]")) {
      const r = await guard(() => Store.setActive(id, !p.activo));
      if (r) { Object.assign(p, r); paintList(); toast(r.activo ? "Ahora se muestra en la tienda" : "Ahora está oculta en la tienda"); }
    } else if (e.target.closest("[data-del]")) {
      if (!confirm(`¿Eliminar "${nameOf(p)}"?\nEsta acción no se puede deshacer.`)) return;
      const r = await guard(async () => { await Store.deleteProduct(id); return true; });
      if (r) { P = P.filter(x => x.id !== id); paintList(); toast("Joya eliminada"); }
    }
  };
  $("#list").onchange = e => { const inp = e.target.closest("[data-stock]"); if (inp) queueStock(inp.closest(".it").dataset.id, inp); };

  /* ---------- Editor ---------- */
  const ed = $("#ef");
  const open = d => { if (d.showModal) d.showModal(); else d.setAttribute("open", ""); };
  const close = d => { if (d.close) d.close(); else d.removeAttribute("open"); };

  $("#e-cat").innerHTML = CATS.map(c => `<option value="${c.id}">${esc(c.n)}</option>`).join("");
  function syncCat() {
    const c = catOf(ed.cat.value);
    $("#e-sub").innerHTML = '<option value="">Sin tipo</option>' + c.subs.map(([s, n]) => `<option value="${s}">${esc(n)}</option>`).join("");
    $("#e-subw").hidden = !c.subs.length;
    const rings = c.id === "anillos";
    $("#e-tallasw").hidden = !rings;
    $("#e-stockw").hidden = rings;
    $("#e-larL").textContent = c.id === "cadenas" || c.id === "pulseras" ? "Largo (cm)" : "Medida (cm)";
  }
  function addTalla(t = "", s = 1) {
    const r = document.createElement("div");
    r.className = "tr";
    r.innerHTML = `<input data-t maxlength="10" placeholder="Talla, ej. 8" aria-label="Talla" value="${esc(t)}"><input data-s type="number" min="0" step="1" inputmode="numeric" aria-label="Cantidad de esta talla" value="${s}"><button class="x" type="button" data-rm aria-label="Quitar talla">&times;</button>`;
    $("#tallas").append(r);
  }
  function readForm() {
    const v = n => ed.elements[n].value.trim();
    const o = { id: editing ? editing.id : "", cat: v("cat"), sub: ed.sub.value, nombre: v("nombre"), material: v("material"), peso: v("peso"), grosor: v("grosor"), largo: v("largo"), precio: v("precio"), anterior: v("anterior"), stock: v("stock"), desc: ed.desc.value.trim(), activo: ed.activo.checked, tallas: [] };
    if (o.cat === "anillos") o.tallas = $$("#tallas .tr").map(r => ({ t: $("[data-t]", r).value.trim(), stock: $("[data-s]", r).value })).filter(t => t.t);
    return o;
  }
  function preview() {
    const o = readForm();
    const t = titleOf({ ...o, peso: numOf(o.peso), grosor: numOf(o.grosor), largo: numOf(o.largo) });
    $("#e-pv").textContent = t || "Escribe el nombre para ver cómo queda";
  }
  /* Cada casilla guarda null, { url } (foto que ya estaba) o { file, prev } (foto nueva, con su vista previa). */
  function paintFoto() {
    const o = readForm();
    $$("#slots .slot").forEach((el, i) => {
      const s = slots[i], img = $("img", el);
      img.src = s ? (s.file ? s.prev : s.url) : placeholder(o.cat, o.sub);
      el.classList.toggle("vacio", !s);
      $("[data-q]", el).hidden = !s;
    });
  }
  function openEditor(p) {
    editing = p || null;
    slots.forEach(s => { if (s && s.prev) URL.revokeObjectURL(s.prev); });
    slots = [0, 1, 2, 3].map(i => (p && photosOf(p)[i]) ? { url: photosOf(p)[i] } : null);
    $("#edT").textContent = p ? "Editar joya" : "Agregar joya";
    ed.reset();
    $$("#slots input[type=file]").forEach(i => { i.value = ""; });
    ed.cat.value = p ? p.cat : "cadenas";
    syncCat();
    ed.sub.value = p ? p.sub : "";
    ed.nombre.value = p ? p.nombre : "";
    ed.material.value = p ? p.material : "Laminado oro 18k";
    ed.peso.value = p && p.peso ? p.peso : "";
    ed.grosor.value = p && p.grosor ? p.grosor : "";
    ed.largo.value = p && p.largo ? p.largo : "";
    ed.precio.value = p ? p.precio : "";
    ed.anterior.value = p && p.anterior ? p.anterior : "";
    ed.stock.value = p ? p.stock : 1;
    ed.desc.value = p ? p.desc : "";
    ed.activo.checked = p ? !!p.activo : true;
    $("#tallas").innerHTML = "";
    if (p && hasTallas(p)) p.tallas.forEach(t => addTalla(t.t, t.stock)); else addTalla();
    $("#eerr").textContent = "";
    paintFoto(); preview();
    open($("#ed"));
  }
  $("#nuevo").onclick = () => openEditor(null);
  $("#edX").onclick = $("#edC").onclick = () => close($("#ed"));
  ed.cat.onchange = () => { syncCat(); paintFoto(); preview(); };
  ed.sub.onchange = paintFoto;
  ed.addEventListener("input", preview);
  $("#addTalla").onclick = () => { addTalla("", 1); const i = $$("#tallas [data-t]").pop(); i.focus(); };
  $("#tallas").onclick = e => { const b = e.target.closest("[data-rm]"); if (b) { b.parentElement.remove(); preview(); } };
  $("#slots").addEventListener("click", e => {
    const q = e.target.closest("[data-q]"); if (!q) return;
    const i = +q.dataset.q, s = slots[i];
    if (s && s.prev) URL.revokeObjectURL(s.prev);
    slots[i] = null; $$("#slots input[type=file]")[i].value = ""; paintFoto();
  });
  $("#slots").addEventListener("change", async e => {
    const inp = e.target; if (inp.type !== "file") return;
    const i = +inp.closest(".slot").dataset.i, f = inp.files[0]; if (!f) return;
    try {
      const file = await shrink(f, Store.mode() === "demo" ? 900 : 1400, Store.mode() === "demo" ? .8 : .86);
      if (slots[i] && slots[i].prev) URL.revokeObjectURL(slots[i].prev);
      slots[i] = { file, prev: URL.createObjectURL(file) }; $("#eerr").textContent = ""; paintFoto();
    } catch (x) { inp.value = ""; $("#eerr").textContent = x.message; }
  });
  ed.onsubmit = async e => {
    e.preventDefault();
    const err = $("#eerr"), o = readForm();
    err.textContent = "";
    if (!o.nombre) { err.textContent = "Escribe el nombre de la joya."; ed.nombre.focus(); return; }
    if (!(+o.precio > 0)) { err.textContent = "Escribe el precio."; ed.precio.focus(); return; }
    if (o.cat === "anillos" && !o.tallas.length) { err.textContent = "Agrega al menos una talla con su cantidad."; return; }
    const b = $("#edS");
    b.disabled = true; b.textContent = "Guardando…";
    const r = await guard(() => Store.saveProduct(o, slots));
    b.disabled = false; b.textContent = "Guardar";
    if (!r) return;
    close($("#ed"));
    await refresh(); paintAvisos(); paintList();
    toast((o.id ? "Cambios guardados" : "Joya agregada") + pub());
  };

  /* ---------- Ajustes ---------- */
  function fillSettings() {
    const f = $("#sf");
    f.tienda.value = S.tienda || "";
    f.whatsapp.value = S.whatsapp ? S.whatsapp.replace(/^57/, "") : "";
    f.anuncio.value = S.anuncio || "";
    f.heroTitulo.value = S.heroTitulo || "";
    f.heroTexto.value = S.heroTexto || "";
    f.garantia.value = S.garantia || "";
  }
  $("#sf").onsubmit = async e => {
    e.preventDefault();
    const f = e.target, err = $("#serr");
    err.textContent = "";
    if (normWa(f.whatsapp.value) === null) { err.textContent = "El WhatsApp debe tener 10 dígitos, por ejemplo 3001234567."; f.whatsapp.focus(); return; }
    const r = await guard(() => Store.saveSettings({ tienda: f.tienda.value, whatsapp: f.whatsapp.value, anuncio: f.anuncio.value, heroTitulo: f.heroTitulo.value, heroTexto: f.heroTexto.value, garantia: f.garantia.value }));
    if (!r) return;
    S = r; $("#aBrand").textContent = S.tienda; paintAvisos(); fillSettings();
    toast("Ajustes guardados" + pub());
  };
  $("#pf").onsubmit = async e => {
    e.preventDefault();
    const err = $("#perr");
    err.textContent = "";
    if ($("#p-n").value !== $("#p-r").value) { err.textContent = "Las contraseñas nuevas no coinciden."; return; }
    try {
      await Store.changePassword($("#p-a").value, $("#p-n").value);
      e.target.reset();
      toast("Contraseña cambiada");
    } catch (x) {
      if (x.status === 401) { await toLogin(x.message); return; }
      err.textContent = x.message;
    }
  };

  /* ---------- Inicio ---------- */
  try {
    await Store.init();
  } catch (e) {
    $("#boot").textContent = "No se pudo iniciar el panel. Recarga la página.";
    console.error(e);
    return;
  }
  try { const pub = await Store.getPublic(); S = pub.settings; } catch { /* sigue */ }
  const ses = await Store.getSession();
  if (ses.auth) await toApp(); else if (!ses.configured) toSetup(); else await toLogin();
})();
