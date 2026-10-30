"use strict";
/* Tienda pública: menú, colecciones, catálogo y compra por WhatsApp. */
(async () => {
  let S = {}, P = [], cur = null;
  const F = { cat: "", sub: "", oferta: false, q: "", sort: "nuevos" };

  const GROUPS = [{ oferta: true, t: "Ofertas" }].concat(
    CATS.flatMap(c => c.subs.length ? c.subs.map(([s, n]) => ({ cat: c.id, sub: s, t: n })) : [{ cat: c.id, t: c.n }])
  );
  const inGroup = (p, g) => g.oferta ? isOffer(p) : p.cat === g.cat && (!g.sub || p.sub === g.sub);
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const CHEV = '<svg class="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const waLink = (txt) => `https://wa.me/${S.whatsapp}` + (txt ? `?text=${encodeURIComponent(txt)}` : "");

  /* ---------- Carga ---------- */
  async function load() {
    const d = await Store.getPublic();
    S = d.settings;
    P = d.products;
  }

  /* ---------- Textos del sitio ---------- */
  function paintSettings() {
    document.title = `${S.tienda} | Laminado de oro 18k`;
    $("#brand").textContent = S.tienda;
    $("#fBrand").textContent = S.tienda;
    paintTicker();
    const ht = $("#hT");
    ht.textContent = S.heroTitulo;
    ht.classList.toggle("long", String(S.heroTitulo || "").length > 32);
    $("#hP").textContent = S.heroTexto;
    $("#gT").textContent = S.garantia;
    const wa = !!S.whatsapp;
    $("#topWa").hidden = !wa;
    $("#wa").hidden = !wa;
    $("#heroWa").hidden = !wa;
    $("#garWa").hidden = !wa;
    if (wa) {
      const hi = `Hola, quiero más información de ${S.tienda}.`;
      ["#wa", "#topWa", "#heroWa", "#garWa"].forEach(s => { $(s).href = waLink(hi); });
    }
    $("#demoPill").hidden = Store.mode() !== "demo";
  }

  function paintTicker() {
    const frases = String(S.anuncio || "").split(/(?<=[.!?])\s+|\s*\|\s*/).map(x => x.trim().replace(/\.$/, "")).filter(Boolean);
    const tk = $("#ticker");
    if (!frases.length) { tk.innerHTML = ""; return; }
    let g = frases.map(f => `<span>${esc(f)}</span>`).join("");
    while (g.length < 700) g += g;
    tk.innerHTML = `<div class="tk"><div class="tk-g">${g}</div><div class="tk-g" aria-hidden="true">${g}</div></div>`;
  }

  /* ---------- Menú ---------- */
  function paintNav() {
    $("#nav").innerHTML =
      `<a class="nv of" href="#catalogo" data-oferta="1">Ofertas</a>` +
      CATS.map(c => c.subs.length
        ? `<div class="dd"><button class="nv" type="button" aria-expanded="false" aria-haspopup="true">${esc(c.n)} ${CHEV}</button>
           <div class="sub"><a href="#catalogo" data-cat="${c.id}">Ver todos</a>${c.subs.map(([s, n]) => `<a href="#catalogo" data-cat="${c.id}" data-sub="${s}">${esc(n)}</a>`).join("")}</div></div>`
        : `<a class="nv" href="#catalogo" data-cat="${c.id}">${esc(c.n)}</a>`).join("") +
      `<a class="nv" href="#garantia">Garantía</a>`;
  }
  function closeMenus() {
    $$(".dd.open").forEach(d => { d.classList.remove("open"); $(".nv", d).setAttribute("aria-expanded", "false"); });
  }
  function closeNav() {
    $("#nav").classList.remove("open");
    $("#burger").setAttribute("aria-expanded", "false");
    closeMenus();
  }

  /* ---------- Portada y colecciones ---------- */
  function paintHero() {
    const pick = [], seen = new Set();
    P.forEach(p => { if (pick.length < 3 && !seen.has(p.cat)) { seen.add(p.cat); pick.push(p); } });
    P.forEach(p => { if (pick.length < 3 && !pick.includes(p)) pick.push(p); });
    const imgs = pick.map(imgOf);
    while (imgs.length < 3) imgs.push(placeholder(["cadenas", "anillos", "pulseras"][imgs.length], "balin"));
    $("#heroArt").innerHTML = imgs.map((u, i) => `<figure class="t t${i + 1}"><img src="${u}" alt=""></figure>`).join("") + '<span class="stk-new">Lo nuevo</span>';
  }
  function paintCols() {
    const html = GROUPS.map((g, i) => {
      const list = P.filter(p => inGroup(p, g));
      if (!list.length) return "";
      const rep = list.find(p => p.img) || list[0];
      const on = (F.oferta && g.oferta) || (!F.oferta && !g.oferta && F.cat === g.cat && (F.sub || "") === (g.sub || ""));
      return `<button class="col" type="button" data-g="${i}" aria-pressed="${on}"><img src="${imgOf(rep)}" alt="" loading="lazy" width="150" height="150"><b>${esc(g.t)}</b><small>${list.length} ${list.length === 1 ? "pieza" : "piezas"}</small></button>`;
    }).join("");
    $("#cols").innerHTML = html;
    requestAnimationFrame(() => {
      const c = $("#cols");
      $(".car").classList.toggle("has-more", c.scrollWidth > c.clientWidth + 4);
    });
  }

  /* ---------- Catálogo ---------- */
  function label() {
    if (F.oferta) return "Ofertas";
    if (F.sub) return subName(F.cat, F.sub);
    if (F.cat) return catOf(F.cat).n;
    return "Todo el catálogo";
  }
  function visible() {
    let l = P.filter(p => F.oferta ? isOffer(p) : (!F.cat || p.cat === F.cat) && (!F.sub || p.sub === F.sub));
    const q = norm(F.q).trim();
    if (q) l = l.filter(p => norm(titleOf(p) + " " + p.desc + " " + catOf(p.cat).n).includes(q));
    const by = F.sort === "menor" ? (a, b) => a.precio - b.precio : F.sort === "mayor" ? (a, b) => b.precio - a.precio : (a, b) => (b.creado || 0) - (a.creado || 0);
    return l.sort((a, b) => ((stockOf(a) < 1) - (stockOf(b) < 1)) || by(a, b));
  }
  function card(p) {
    const st = stockOf(p);
    const stk = st < 1 ? '<p class="stk no">Se acabó</p>' : st <= 3 ? `<p class="stk low">Quedan ${st}, vuela</p>` : `<p class="stk">Disponible: ${st} unidades</p>`;
    const tallas = hasTallas(p) ? `<div class="tl" aria-label="Tallas disponibles">${p.tallas.filter(t => t.stock > 0).map(t => `<span>Talla ${esc(t.t)}</span>`).join("")}</div>` : "";
    return `<article class="card" data-id="${esc(p.id)}">
      <div class="ph"><img src="${esc(imgOf(p))}" alt="${esc(nameOf(p))}" loading="lazy" width="400" height="400">${photosOf(p).length > 1 ? `<span class="nfo">${photosOf(p).length} fotos</span>` : ""}${isOffer(p) && st > 0 ? `<span class="tag">-${pctOff(p)}%</span>` : ""}${st < 1 ? '<span class="tag no">Agotado</span>' : ""}</div>
      <div class="bd">
        <h3>${esc(nameOf(p))}</h3>
        ${specsOf(p) ? `<p class="sp">${esc(specsOf(p))}</p>` : ""}
        ${tallas}
        ${p.desc ? `<p class="ds">${esc(p.desc)}</p>` : ""}
        <p class="pr">${isOffer(p) ? `<s>${money(p.anterior)}</s>` : ""}<b>${money(p.precio)}</b></p>
        ${stk}
        <button class="btn gold" type="button" data-buy="${esc(p.id)}" ${st < 1 ? "disabled" : ""}>${st < 1 ? "Agotado" : "La quiero"}</button>
      </div></article>`;
  }
  function paintGrid() {
    const l = visible();
    $("#cTitle").textContent = label();
    $("#cCount").textContent = `${l.length} ${l.length === 1 ? "pieza" : "piezas"}`;
    $("#clear").hidden = !(F.cat || F.oferta || F.q);
    $("#grid").innerHTML = l.length ? l.map(card).join("") : '<p class="vacio">No hay piezas con ese filtro. Prueba con otra búsqueda.</p>';
  }
  function paintAll() { paintHero(); paintCols(); paintGrid(); }

  function setFilter(o) {
    F.cat = o.cat || ""; F.sub = o.sub || ""; F.oferta = !!o.oferta;
    if (o.resetQ) { F.q = ""; $("#q").value = ""; }
    closeNav();
    paintCols();
    paintGrid();
  }

  /* ---------- Detalle, galería y pedido ---------- */
  let gal = [], gi = 0;
  function dlg(d) { if (d.showModal) d.showModal(); else d.setAttribute("open", ""); }
  function undlg(d) { if (d.close) d.close(); else d.removeAttribute("open"); }

  function showPhoto(i) {
    if (!gal.length) return;
    gi = (i + gal.length) % gal.length;
    const m = $("#gMain");
    m.src = gal[gi];
    m.alt = `${nameOf(cur)}, foto ${gi + 1} de ${gal.length}`;
    $$("#gTh button").forEach((b, k) => b.setAttribute("aria-pressed", String(k === gi)));
    $("#gCount").textContent = `${gi + 1}/${gal.length}`;
  }
  function paintGallery() {
    gal = galleryOf(cur);
    const many = gal.length > 1;
    $("#gTh").hidden = !many;
    $("#gPrev").hidden = $("#gNext").hidden = $("#gCount").hidden = !many;
    $("#gTh").innerHTML = many ? gal.map((u, k) => `<button type="button" data-ph="${k}" aria-label="Ver foto ${k + 1} de ${gal.length}" aria-pressed="false"><img src="${esc(u)}" alt="" width="96" height="96"></button>`).join("") : "";
    showPhoto(0);
  }

  function maxQty() {
    if (!cur) return 1;
    if (hasTallas(cur)) { const t = cur.tallas.find(x => x.t === $("#bTalla").value); return t ? t.stock : 1; }
    return stockOf(cur);
  }
  function syncQty() {
    const q = $("#bQty"), m = Math.max(1, maxQty());
    q.max = m;
    if (+q.value > m) q.value = m;
    if (+q.value < 1) q.value = 1;
    $("#bTot").textContent = `Total: ${money(cur.precio * (+q.value || 1))}`;
  }
  async function openBuy(id) {
    try { await load(); paintAll(); } catch { /* si falla, sigue con lo que ya hay */ }
    cur = P.find(p => p.id === id);
    if (!cur) { toast("Esa pieza ya no está disponible.", true); return; }
    const st = stockOf(cur), tl = hasTallas(cur), sp = specsOf(cur);
    $("#bCat").textContent = [catOf(cur.cat).n, cur.sub ? subName(cur.cat, cur.sub) : ""].filter(Boolean).join(" / ");
    $("#bN").textContent = nameOf(cur);
    $("#bSp").textContent = sp; $("#bSp").hidden = !sp;
    $("#bD").textContent = cur.desc || ""; $("#bD").hidden = !cur.desc;
    $("#bP").innerHTML = (isOffer(cur) ? `<s>${money(cur.anterior)}</s>` : "") + `<b>${money(cur.precio)}</b>`;
    const stk = $("#bStk");
    stk.className = "stk" + (st < 1 ? " no" : st <= 3 ? " low" : "");
    stk.textContent = st < 1 ? "Se acabó" : st <= 3 ? `Quedan ${st}, vuela` : `Disponible: ${st} unidades`;
    $("#fTalla").hidden = !tl;
    $("#bTalla").required = tl;
    $("#bTalla").innerHTML = tl ? cur.tallas.filter(t => t.stock > 0).map(t => `<option value="${esc(t.t)}">Talla ${esc(t.t)} (${t.stock} disp.)</option>`).join("") : "";
    $("#bQty").value = 1;
    $("#bErr").textContent = "";
    $("#bEnv").open = false;
    const go = $("#bGo");
    go.disabled = st < 1 || !S.whatsapp;
    go.textContent = st < 1 ? "Agotado" : !S.whatsapp ? "WhatsApp aún no configurado" : "Pedir por WhatsApp";
    paintGallery();
    syncQty();
    dlg($("#buy"));
  }
  /* Los datos de envío son opcionales: solo se agregan al mensaje los que la persona llene. */
  function submitBuy(ev) {
    ev.preventDefault();
    if (!cur || stockOf(cur) < 1 || !S.whatsapp) return;
    const f = ev.target, err = $("#bErr");
    err.textContent = "";
    if (!f.checkValidity()) { f.reportValidity(); return; }
    let tel = f.t.value.replace(/\D/g, "");
    if (tel.length === 12 && tel.startsWith("57")) tel = tel.slice(2);
    if (tel && tel.length !== 10) {
      $("#bEnv").open = true;
      err.textContent = "Si escribes un celular, debe tener 10 dígitos, por ejemplo 3001234567. O déjalo en blanco.";
      f.t.focus(); return;
    }
    const v = k => f[k].value.trim();
    const envio = [
      v("n") && `Nombre: ${v("n")}`, tel && `Teléfono: ${tel}`, v("d") && `Dirección: ${v("d")}`,
      v("m") && `Municipio: ${v("m")}`, f.e.value && `Departamento: ${f.e.value}`
    ].filter(Boolean);
    const qty = Math.max(1, Math.min(+$("#bQty").value || 1, maxQty()));
    const talla = hasTallas(cur) ? $("#bTalla").value : "";
    const msg = [
      `Hola, quiero hacer un pedido en ${S.tienda}:`, "",
      `*Producto:* ${titleOf(cur)}`,
      talla ? `*Talla:* ${talla}` : null,
      `*Cantidad:* ${qty}`,
      `*Precio unitario:* ${money(cur.precio)}`,
      `*Total:* ${money(cur.precio * qty)}`, "",
      ...(envio.length ? ["*Datos de envío*", ...envio, "País: Colombia", "", "¿Me indicas los medios de pago disponibles?"] : ["¿Me confirmas disponibilidad, envío y medios de pago?"])
    ].filter(l => l !== null).join("\n");
    const a = document.createElement("a");
    a.href = waLink(msg); a.target = "_blank"; a.rel = "noopener";
    document.body.append(a); a.click(); a.remove();
    undlg($("#buy"));
    f.reset();
  }
  function openZoom() {
    $("#lbImg").src = gal[gi]; $("#lbImg").alt = $("#gMain").alt;
    dlg($("#lb"));
  }

  /* ---------- Eventos ---------- */
  document.addEventListener("click", e => {
    const t = e.target;
    const dd = t.closest(".dd > .nv");
    if (dd) {
      const box = dd.parentElement, open = !box.classList.contains("open");
      closeMenus(); box.classList.toggle("open", open); dd.setAttribute("aria-expanded", String(open));
      return;
    }
    if (!t.closest(".dd")) closeMenus();
    const f = t.closest("[data-cat],[data-oferta]");
    if (f && f.closest("#nav")) {
      e.preventDefault();
      setFilter({ cat: f.dataset.cat, sub: f.dataset.sub, oferta: f.dataset.oferta, resetQ: true });
      $("#catalogo").scrollIntoView();
      return;
    }
    if (t.closest("#nav a")) closeNav();
    const g = t.closest("[data-g]");
    if (g) { const x = GROUPS[+g.dataset.g]; setFilter({ cat: x.cat, sub: x.sub, oferta: x.oferta, resetQ: true }); $("#catalogo").scrollIntoView(); return; }
    const a = t.closest(".arr");
    if (a) { const c = $("#cols"); c.scrollBy({ left: a.dataset.dir * c.clientWidth * .8, behavior: "smooth" }); return; }
    const b = t.closest("[data-buy]");
    if (b) { openBuy(b.dataset.buy); return; }
    const c = t.closest(".card");
    if (c && (t.closest(".ph") || t.closest("h3"))) { openBuy(c.dataset.id); return; }
    const th = t.closest("[data-ph]");
    if (th) showPhoto(+th.dataset.ph);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeMenus();
    if ($("#buy").open && !$("#lb").open && gal.length > 1 && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) showPhoto(gi + (e.key === "ArrowRight" ? 1 : -1));
  });
  $("#gPrev").onclick = () => showPhoto(gi - 1);
  $("#gNext").onclick = () => showPhoto(gi + 1);
  $("#gZoom").onclick = $("#gMain").onclick = openZoom;
  $("#lb").onclick = () => undlg($("#lb"));
  $("#burger").onclick = () => {
    const o = $("#nav").classList.toggle("open");
    $("#burger").setAttribute("aria-expanded", String(o));
    $("#burger").setAttribute("aria-label", o ? "Cerrar menú" : "Abrir menú");
  };
  $("#verTodo").onclick = () => { setFilter({ resetQ: true }); $("#catalogo").scrollIntoView(); };
  $("#clear").onclick = () => setFilter({ resetQ: true });
  $("#q").oninput = e => { F.q = e.target.value; paintGrid(); };
  $("#sort").onchange = e => { F.sort = e.target.value; paintGrid(); };
  $("#bX").onclick = () => undlg($("#buy"));
  $("#buy").addEventListener("click", e => { if (e.target === e.currentTarget) undlg($("#buy")); });
  $("#bTalla").onchange = syncQty;
  $("#bQty").oninput = () => { if (cur) syncQty(); };
  $("#bf").onsubmit = submitBuy;
  $("#e").innerHTML = '<option value="">Selecciona…</option>' + DEPTOS.map(d => `<option>${esc(d)}</option>`).join("");
  window.addEventListener("resize", () => { const c = $("#cols"); $(".car").classList.toggle("has-more", c.scrollWidth > c.clientWidth + 4); });

  /* ---------- Inicio ---------- */
  try {
    await Store.init();
    await load();
  } catch (e) {
    $("#grid").innerHTML = `<p class="vacio">No pudimos cargar el catálogo en este momento. Recarga la página o vuelve a intentarlo en unos minutos.</p>`;
    console.error(e);
    return;
  }
  paintSettings();
  paintNav();
  paintAll();
})();
