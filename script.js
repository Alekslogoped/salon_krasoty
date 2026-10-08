"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";
  const STORE = "salon-manikyura-v1";
  const colors = [
    ["Красный", "#ed4a56"],
    ["Розовый", "#f793bc"],
    ["Малиновый", "#ce316e"],
    ["Оранжевый", "#ff954a"],
    ["Жёлтый", "#ffd852"],
    ["Салатовый", "#b6de65"],
    ["Зелёный", "#38ae7a"],
    ["Мятный", "#79d6bf"],
    ["Голубой", "#79c9ed"],
    ["Синий", "#4876df"],
    ["Сиреневый", "#b4a0e8"],
    ["Фиолетовый", "#884cc4"],
    ["Молочный", "#fff7e6"],
    ["Персиковый", "#ffc0a0"],
  ];
  const designs = [
    ["none", "Без рисунка"],
    ["french", "Френч"],
    ["dots", "Горошек"],
    ["stripes", "Полоски"],
    ["heart", "Сердечко"],
    ["flower", "Цветочек"],
    ["stars", "Звёздочки"],
  ];
  const gems = [
    ["crystal", "Кристалл", "◉"],
    ["diamond", "Ромбик", "◆"],
    ["pearl", "Жемчужинка", "●"],
    ["star", "Звёздочка", "★"],
  ];
  const glitters = [
    ["gold", "Золотые", "#d5a52c"],
    ["silver", "Серебряные", "#b5c4d9"],
    ["multi", "Разноцветные", "#d580c7"],
    ["none", "Убрать блёстки", "#eee0e8"],
  ];
  const rings = [
    ["gold", "Золотое"],
    ["silver", "Серебряное"],
    ["heart", "С сердечком"],
    ["flower", "С цветочком"],
  ];
  const bracelets = [
    ["gold", "Золотой"],
    ["silver", "Серебряный"],
    ["pearl", "Жемчужный"],
    ["beads", "Цветные бусины"],
  ];
  const fingerConfig = [
    { key: "little", name: "Мизинец", x: 150, y: 249, rotation: -4 },
    { key: "ring", name: "Безымянный", x: 218, y: 169, rotation: -2 },
    { key: "middle", name: "Средний", x: 286, y: 132, rotation: 0 },
    { key: "index", name: "Указательный", x: 354, y: 178, rotation: 3 },
    { key: "thumb", name: "Большой", x: 444, y: 366, rotation: 36 },
  ];
  const ids = ["left", "right"].flatMap((hand) =>
    fingerConfig.map((f) => `${hand}-${f.key}`),
  );
  const emptyNail = () => ({
    color: null,
    design: "none",
    gems: [],
    glitter: null,
    particles: [],
  });
  const fresh = () => ({
    nails: Object.fromEntries(ids.map((id) => [id, emptyNail()])),
    ring: null,
    bracelet: null,
    mode: "edit",
  });
  let state = fresh();
  let history = [];
  let selected = {
    tab: "polish",
    color: colors[1][1],
    design: "heart",
    gem: "crystal",
    glitter: "gold",
    ringHand: "left",
    braceletHand: "left",
    eraser: false,
  };
  let toastTimer, exportURL;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  // Only accept known decorations and finite local coordinates from optional storage.
  function restore() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE));
      if (!data || !data.nails) return false;
      for (const id of ids) {
        const n = data.nails[id];
        if (!n) continue;
        state.nails[id] = {
          color: colors.some((c) => c[1] === n.color) ? n.color : null,
          design: designs.some((d) => d[0] === n.design) ? n.design : "none",
          gems: Array.isArray(n.gems)
            ? n.gems
                .filter(
                  (g) =>
                    gems.some((v) => v[0] === g.type) &&
                    Number.isFinite(g.x) &&
                    Number.isFinite(g.y) &&
                    Math.abs(g.x) <= 18 &&
                    Math.abs(g.y) <= 29,
                )
                .slice(0, 15)
            : [],
          glitter: ["gold", "silver", "multi"].includes(n.glitter)
            ? n.glitter
            : null,
          particles: Array.isArray(n.particles)
            ? n.particles
                .filter(
                  (p) =>
                    Number.isFinite(p.x) &&
                    Number.isFinite(p.y) &&
                    Math.abs(p.x) <= 18 &&
                    Math.abs(p.y) <= 29 &&
                    [
                      "#d5a52c",
                      "#fff0a6",
                      "#b5c4d9",
                      "#ffffff",
                      "#f56da3",
                      "#6acbb6",
                      "#a28bea",
                      "#ffcc59",
                    ].includes(p.color),
                )
                .slice(0, 48)
                .map((p) => ({
                  x: p.x,
                  y: p.y,
                  color: p.color,
                  r: Math.min(1.6, Math.max(0.5, Number(p.r) || 1)),
                }))
            : [],
        };
      }
      for (const [key, types] of [
        ["ring", rings],
        ["bracelet", bracelets],
      ]) {
        const j = data[key];
        if (
          j &&
          ["left", "right"].includes(j.hand) &&
          types.some((t) => t[0] === j.type)
        )
          state[key] = { hand: j.hand, type: j.type };
      }
      state.mode = data.mode === "result" && complete() ? "result" : "edit";
      return true;
    } catch {
      return false;
    }
  }
  function persist() {
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch {
      /* Storage is optional, including in sandboxed embeds. */
    }
  }
  function complete() {
    return (
      ids.every((id) => state.nails[id].color) &&
      !!state.ring &&
      !!state.bracelet
    );
  }
  function change(fn) {
    const before = clone(state);
    fn();
    if (JSON.stringify(before) === JSON.stringify(state)) return;
    history.push(before);
    if (history.length > 80) history.shift();
    persist();
    render();
  }
  function toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 2600);
  }
  const nailPath =
    "M -17 -14 Q -17 -28 0 -29 Q 17 -28 17 -14 L 18 17 Q 18 29 0 29 Q -18 29 -18 17 Z";
  const handPath =
    "M180 720 L179 591 Q178 545 158 506 Q135 472 133 427 L119 267 Q117 211 148 210 Q177 208 180 247 L187 366 L188 174 Q188 130 218 130 Q248 130 248 174 L254 346 L256 139 Q255 94 286 94 Q317 94 317 139 L322 345 L324 183 Q324 141 354 141 Q384 141 384 183 L380 413 L421 350 Q440 321 459 342 Q481 364 461 396 L415 488 Q397 537 358 561 L350 720 Z";
  function star(x, y, r, color) {
    return `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3}Z" fill="${color}"/>`;
  }
  function heart(x, y, size, color) {
    return `<path transform="translate(${x} ${y}) scale(${size / 20})" d="M0 10 C-30 -7 -10 -27 0 -12 C10 -27 30 -7 0 10Z" fill="${color}"/>`;
  }
  function flower(x, y, r, color) {
    return `<g>${Array.from({ length: 5 }, (_, i) => {
      const a = (i * Math.PI * 2) / 5;
      return `<circle cx="${x + Math.sin(a) * r * 0.62}" cy="${y + Math.cos(a) * r * 0.62}" r="${r * 0.48}" fill="${color}"/>`;
    }).join(
      "",
    )}<circle cx="${x}" cy="${y}" r="${r * 0.3}" fill="#ffd257"/></g>`;
  }
  function contrast(color) {
    if (!color) return "#a86490";
    const c = color
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16));
    return c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114 > 168
      ? "#77486e"
      : "#fffaf5";
  }
  function designArt(type, color) {
    const ink = contrast(color);
    if (type === "french")
      return `<path d="M-20 -32 H20 V-14 Q0 -4 -20 -14Z" fill="#fffdf6"/>`;
    if (type === "dots")
      return Array.from(
        { length: 12 },
        (_, i) =>
          `<circle cx="${((i % 3) - 1) * 12}" cy="${Math.floor(i / 3) * 14 - 22}" r="2.4" fill="${ink}"/>`,
      ).join("");
    if (type === "stripes")
      return [-16, 0, 16]
        .map(
          (y) =>
            `<path d="M-23 ${y + 8} L23 ${y - 8}" stroke="${ink}" stroke-width="3.1"/>`,
        )
        .join("");
    if (type === "heart") return heart(0, 2, 12, ink);
    if (type === "flower") return flower(0, 0, 10, ink);
    if (type === "stars")
      return star(-7, -11, 6, ink) + star(8, 7, 5, ink) + star(-5, 20, 3, ink);
    return "";
  }
  function gemArt(g) {
    const { x, y, type } = g;
    if (type === "pearl")
      return `<circle cx="${x}" cy="${y}" r="4" fill="url(#pearl)" stroke="#cebac4" stroke-width=".6"/>`;
    if (type === "star")
      return (
        star(x, y, 5, "#ffdf73") +
        `<circle cx="${x - 1}" cy="${y - 1}" r=".9" fill="white"/>`
      );
    if (type === "diamond")
      return `<path d="M${x} ${y - 5} L${x + 4} ${y} L${x} ${y + 5} L${x - 4} ${y}Z" fill="#c1e9fb" stroke="#7e9fc7" stroke-width=".6"/><path d="M${x} ${y - 5} L${x} ${y + 5} M${x - 4} ${y} H${x + 4}" stroke="white" stroke-width=".8"/>`;
    return `<circle cx="${x}" cy="${y}" r="4" fill="#bce1fb" stroke="#90a4c5" stroke-width=".7"/><path d="M${x} ${y - 3} L${x + 3} ${y} L${x} ${y + 3} L${x - 3} ${y}Z" fill="#fff9"/>`;
  }
  function nailArt(id) {
    const n = state.nails[id];
    return `<g class="art" clip-path="url(#clip-${id})" pointer-events="none"><path d="${nailPath}" fill="${n.color || "#f5dcd5"}"/>${designArt(n.design, n.color)}${n.particles.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${p.color}" opacity=".8"/>`).join("")}${n.gems.map(gemArt).join("")}<path d="M-10 -17 Q-9 -23 -3 -23" fill="none" stroke="white" stroke-width="3" opacity=".48" stroke-linecap="round"/></g><path class="nail-border" d="${nailPath}" fill="none" stroke="#bb827c" stroke-width="1" opacity=".6" pointer-events="none"/><path class="hit" d="${nailPath}" fill="transparent"/>`;
  }
  function ringArt(type) {
    const metal = type === "silver" ? "#aebbd0" : "#dfb555";
    let jewel =
      type === "heart"
        ? heart(219, 286, 8, "#e37fa1")
        : type === "flower"
          ? flower(219, 281, 8, "#fff4fa")
          : `<path d="M219 271 L225 278 L219 286 L213 278Z" fill="${type === "silver" ? "#a5d7ee" : "#ebbbd1"}" stroke="white" stroke-width="1"/>`;
    return `<g class="jewel art" pointer-events="none"><path d="M193 281 Q217 293 244 282" stroke="#8c645638" stroke-width="11" fill="none"/><path d="M193 278 Q217 289 244 279" stroke="${metal}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M195 276 Q218 286 242 277" stroke="#fff5bd" opacity=".65" stroke-width="2" fill="none"/>${jewel}</g>`;
  }
  function braceletArt(type) {
    if (type === "gold" || type === "silver") {
      const metal = type === "gold" ? "#ddb75a" : "#adbcd0";
      return `<g class="jewel art" pointer-events="none"><path d="M181 620 Q265 649 351 620" stroke="#926b4b28" stroke-width="20" fill="none"/><path d="M181 616 Q265 644 351 616" stroke="${metal}" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M182 613 Q265 641 350 613" stroke="#fff7d1" stroke-width="3" fill="none" opacity=".65"/>${star(264, 636, 7, type === "gold" ? "#fff3b4" : "#f2f8ff")}</g>`;
    }
    return `<g class="jewel art" pointer-events="none"><path d="M183 617 Q266 646 349 617" stroke="#d6b2c0" stroke-width="3" fill="none"/>${Array.from(
      { length: 14 },
      (_, i) => {
        const x = 183 + i * 12.8,
          y = 618 + Math.sin((i / 13) * Math.PI) * 15;
        const c =
          type === "pearl"
            ? "url(#pearl)"
            : ["#ef9cb5", "#a895d8", "#8bcec2", "#f2d078"][i % 4];
        return `<circle cx="${x}" cy="${y}" r="7.4" fill="${c}" stroke="#b597aa" stroke-width=".7"/><circle cx="${x - 2}" cy="${y - 2}" r="1.7" fill="white" opacity=".6"/>`;
      },
    ).join("")}</g>`;
  }
  function createTable() {
    $("table").innerHTML =
      `<defs><linearGradient id="skin" x1="0" y1="0" x2="1" y2=".2"><stop stop-color="#e7b6a3"/><stop offset=".25" stop-color="#f7d3bd"/><stop offset=".65" stop-color="#f9dac5"/><stop offset="1" stop-color="#eabdac"/></linearGradient><linearGradient id="table-bg" x2="0" y2="1"><stop stop-color="#fffaf5"/><stop offset="1" stop-color="#f5e9e5"/></linearGradient><radialGradient id="pearl" cx=".3" cy=".25"><stop stop-color="white"/><stop offset=".6" stop-color="#fff6e8"/><stop offset="1" stop-color="#cbbbc7"/></radialGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#956c64" flood-opacity=".16"/></filter>${ids.map((id) => `<clipPath id="clip-${id}"><path d="${nailPath}"/></clipPath>`).join("")}</defs><rect width="1000" height="700" fill="url(#table-bg)"/><rect x="54" y="60" width="892" height="660" rx="100" fill="#fffdf9" stroke="#efe4de" stroke-width="2"/><rect x="70" y="75" width="860" height="660" rx="90" fill="none" stroke="#ede2db" stroke-width="1" stroke-dasharray="3 7"/><g opacity=".65" pointer-events="none">${star(92, 172, 11, "#d8b8c9")}${star(919, 515, 9, "#c7b8d6")}<circle cx="92" cy="192" r="3" fill="#d8b8c9"/><circle cx="919" cy="537" r="3" fill="#c7b8d6"/></g>${["left", "right"].map((hand) => `<g id="hand-${hand}" transform="${hand === "right" ? "translate(1000 0) scale(-1 1)" : "translate(0 0)"}"><path d="${handPath}" fill="url(#skin)" stroke="#d8a795" stroke-width="1.5" filter="url(#shadow)"/><g fill="none" stroke="#c8907e" stroke-width="1.2" opacity=".25" stroke-linecap="round"><path d="M138 326 Q151 323 167 326 M204 264 Q219 261 233 264 M272 240 Q287 237 301 240 M339 280 Q353 277 368 280 M420 405 L439 416 M233 514 Q276 529 316 512 M209 571 Q262 585 321 567"/></g>${fingerConfig.map((f) => `<g data-nail="${hand}-${f.key}" transform="translate(${f.x} ${f.y}) rotate(${f.rotation})" role="button" tabindex="0" aria-label="${hand === "left" ? "Левая" : "Правая"} рука: ${f.name.toLowerCase()}, нанести выбранный инструмент"></g>`).join("")}<g id="ring-${hand}"></g><g id="bracelet-${hand}"></g></g>`).join("")}<g id="effects" pointer-events="none"></g>`;
    $("table").addEventListener("pointerdown", nailEvent);
    $("table").addEventListener("keydown", (e) => {
      if (
        (e.key === "Enter" || e.key === " ") &&
        e.target.closest("[data-nail]")
      ) {
        e.preventDefault();
        nailEvent(e);
      }
    });
  }
  function nailEvent(e) {
    const target = e.target.closest("[data-nail]");
    if (!target || state.mode !== "edit") return;
    e.preventDefault();
    const id = target.dataset.nail;
    let x = 0,
      y = 0;
    if (e.type === "pointerdown") {
      const p = $("table").createSVGPoint();
      p.x = e.clientX;
      p.y = e.clientY;
      const local = p.matrixTransform(target.getScreenCTM().inverse());
      x = local.x;
      y = local.y;
    }
    if (
      selected.tab === "gems" &&
      !selected.eraser &&
      state.nails[id].gems.length >= 15
    ) {
      toast("На этом ноготке уже много блеска! Можно украсить другой.");
      return;
    }
    change(() => {
      const n = state.nails[id];
      if (selected.eraser) {
        state.nails[id] = emptyNail();
        return;
      }
      if (selected.tab === "polish") n.color = selected.color;
      if (selected.tab === "design") n.design = selected.design;
      if (selected.tab === "gems") n.gems.push({ type: selected.gem, x, y });
      if (selected.tab === "glitter") applyGlitter(n);
    });
    if (selected.tab !== "jewelry") animateNail(id);
  }
  function applyGlitter(n) {
    n.glitter = selected.glitter === "none" ? null : selected.glitter;
    const palette = {
      gold: ["#d5a52c", "#fff0a6"],
      silver: ["#b5c4d9", "#ffffff"],
      multi: ["#f56da3", "#6acbb6", "#a28bea", "#ffcc59"],
    }[n.glitter];
    n.particles = palette
      ? Array.from({ length: 40 }, () => ({
          x: Math.random() * 34 - 17,
          y: Math.random() * 56 - 28,
          r: 0.55 + Math.random() * 0.75,
          color: palette[Math.floor(Math.random() * palette.length)],
        }))
      : [];
  }
  function animateNail(id) {
    const nail = document.querySelector(`[data-nail="${id}"]`);
    nail.classList.remove("applied");
    void nail.getBoundingClientRect();
    nail.classList.add("applied");
    setTimeout(() => nail.classList.remove("applied"), 600);
    if (
      selected.tab === "glitter" &&
      selected.glitter !== "none" &&
      !selected.eraser
    ) {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "sparkle-effect");
      g.setAttribute("pointer-events", "none");
      g.innerHTML = Array.from({ length: 8 }, (_, i) =>
        star(((i % 3) - 1) * 13, Math.floor(i / 3) * 19 - 36, 2.2, "#d7b753"),
      ).join("");
      nail.append(g);
      setTimeout(() => g.remove(), 650);
    }
  }
  function previewDesign(type) {
    return `<svg viewBox="-24 -35 48 70" aria-hidden="true"><defs><clipPath id="preview-${type}"><path d="${nailPath}"/></clipPath></defs><g clip-path="url(#preview-${type})"><path d="${nailPath}" fill="#e88fad"/>${designArt(type, "#e88fad")}</g><path d="${nailPath}" fill="none" stroke="#ce8aa5"/></svg>`;
  }
  function optionButton(label, art, active, fn) {
    const b = document.createElement("button");
    b.className = "option";
    b.setAttribute("aria-label", label);
    b.setAttribute("aria-pressed", String(active));
    b.innerHTML = art + `<span>${label}</span>`;
    b.onclick = fn;
    return b;
  }
  function grid(parent) {
    const g = document.createElement("div");
    g.className = "option-grid";
    parent.append(g);
    return g;
  }
  function actionButton(text, cls, fn, parent = $("options")) {
    const b = document.createElement("button");
    b.className = cls;
    b.textContent = text;
    b.onclick = fn;
    parent.append(b);
    return b;
  }
  function choose(key, value) {
    selected[key] = value;
    selected.eraser = false;
    renderOptions();
    renderStatus();
  }
  function renderTabs() {
    const tabs = [
      ["polish", "◕", "Лак"],
      ["design", "✿", "Дизайн"],
      ["gems", "◆", "Стразы"],
      ["glitter", "✦", "Блёстки"],
      ["jewelry", "♧", "Украшения"],
    ];
    $("tabs").replaceChildren();
    for (const [tab, icon, label] of tabs) {
      const b = document.createElement("button");
      b.innerHTML = `<span aria-hidden="true">${icon}</span>${label}`;
      b.setAttribute(
        "aria-pressed",
        String(selected.tab === tab && !selected.eraser),
      );
      b.onclick = () => {
        selected.tab = tab;
        selected.eraser = false;
        renderTabs();
        renderOptions();
        renderStatus();
      };
      $("tabs").append(b);
    }
  }
  function renderOptions() {
    const o = $("options");
    o.replaceChildren();
    if (state.ring) selected.ringHand = state.ring.hand;
    if (state.bracelet) selected.braceletHand = state.bracelet.hand;
    const title = document.createElement("p");
    title.className = "section-caption";
    title.textContent = {
      polish: "С какого цвета начнём?",
      design: "Маленький узор, большое настроение",
      gems: "Укрась ноготок капельками блеска",
      glitter: "Пусть ноготки немного сияют",
      jewelry: "Последний штрих к твоему образу",
    }[selected.tab];
    o.append(title);
    if (selected.tab === "polish") {
      const g = grid(o);
      for (const [label, c] of colors)
        g.append(
          optionButton(
            label,
            `<span class="swatch" style="--swatch:${c}" aria-hidden="true"></span>`,
            selected.color === c,
            () => choose("color", c),
          ),
        );
      actionButton("◕ Покрасить все", "mass", () => {
        change(() =>
          ids.forEach((id) => (state.nails[id].color = selected.color)),
        );
        ids.forEach(animateNail);
      });
    }
    if (selected.tab === "design") {
      const g = grid(o);
      for (const [d, label] of designs)
        g.append(
          optionButton(label, previewDesign(d), selected.design === d, () =>
            choose("design", d),
          ),
        );
    }
    if (selected.tab === "gems") {
      const g = grid(o);
      for (const [v, label] of gems)
        g.append(
          optionButton(
            label,
            `<svg viewBox="-12 -12 24 24" aria-hidden="true">${gemArt({ x: 0, y: 0, type: v })}</svg>`,
            selected.gem === v,
            () => choose("gem", v),
          ),
        );
    }
    if (selected.tab === "glitter") {
      const g = grid(o);
      for (const [v, label, c] of glitters)
        g.append(
          optionButton(
            label,
            `<span class="symbol" style="color:${c}" aria-hidden="true">${v === "none" ? "○" : "✦"}</span>`,
            selected.glitter === v,
            () => choose("glitter", v),
          ),
        );
      const b = actionButton("✦ Посыпать все", "mass", () => {
        const painted = ids.filter((id) => state.nails[id].color);
        if (!painted.length) {
          toast("Сначала покрась хотя бы один ноготок");
          return;
        }
        change(() => painted.forEach((id) => applyGlitter(state.nails[id])));
        painted.forEach(animateNail);
      });
      if (selected.glitter === "none") b.textContent = "Убрать блёстки со всех";
    }
    if (selected.tab === "jewelry") {
      for (const [key, collection, title] of [
        ["ring", rings, "Колечко"],
        ["bracelet", bracelets, "Браслетик"],
      ]) {
        const h = document.createElement("h3");
        h.className = "jewelry-title";
        h.textContent = title;
        o.append(h);
        const picker = document.createElement("div");
        picker.className = "hand-picker";
        picker.setAttribute(
          "aria-label",
          key === "ring" ? "Рука для колечка" : "Рука для браслета",
        );
        o.append(picker);
        for (const [hand, label] of [
          ["left", "Левая рука"],
          ["right", "Правая рука"],
        ]) {
          const b = actionButton(
            label,
            "soft",
            () => {
              selected[key + "Hand"] = hand;
              change(() => {
                if (state[key]) state[key].hand = hand;
              });
              renderOptions();
            },
            picker,
          );
          b.setAttribute(
            "aria-pressed",
            String(selected[key + "Hand"] === hand),
          );
        }
        const g = grid(o);
        for (const [type, label] of collection) {
          const art =
            key === "ring"
              ? `<svg viewBox="187 261 65 38" aria-hidden="true">${ringArt(type)}</svg>`
              : `<svg viewBox="172 605 190 48" aria-hidden="true">${braceletArt(type)}</svg>`;
          g.append(
            optionButton(label, art, state[key]?.type === type, () => {
              change(
                () => (state[key] = { type, hand: selected[key + "Hand"] }),
              );
              const el = $(`${key}-${selected[key + "Hand"]}`);
              el.classList.add("applied");
              setTimeout(() => el.classList.remove("applied"), 600);
              renderOptions();
            }),
          );
        }
        actionButton(
          key === "ring" ? "Снять колечко" : "Снять браслет",
          "soft remove",
          () => {
            change(() => (state[key] = null));
            renderOptions();
          },
        );
      }
    }
    renderTabs();
  }
  function renderStatus() {
    const count = ids.filter((id) => state.nails[id].color).length;
    $("counter").textContent = `Покрашено: ${count} из 10`;
    $("undo").disabled = !history.length;
    $("eraser").setAttribute("aria-pressed", String(selected.eraser));
    $("tip").textContent = selected.eraser
      ? "Нажми на ноготок, чтобы его очистить"
      : {
          polish: "Выбери лак и нажми на ноготок",
          design: "Выбери рисунок и нажми на ноготок",
          gems: "Нажми туда, где будет страз",
          glitter: "Добавь немного блеска",
          jewelry: "Выбери руку и украшения",
        }[selected.tab];
    const needed = [];
    if (count < 10)
      needed.push(
        `Покрась ещё ${10 - count} ${10 - count === 1 ? "ноготок" : 10 - count < 5 ? "ноготка" : "ноготков"}`,
      );
    if (!state.ring) needed.push("Выбери колечко");
    if (!state.bracelet) needed.push("Добавь браслетик");
    $("missing").textContent = needed.length
      ? needed.join(" · ")
      : "Всё готово! Можно любоваться результатом";
    $("finish").disabled = !complete();
    const done = state.mode === "result";
    document.querySelector(".app").classList.toggle("finished", done);
    $("tools").hidden = done;
    $("editing-actions").hidden = done;
    $("result").hidden = !done;
    document.querySelectorAll("[data-nail]").forEach((n) => {
      n.setAttribute("tabindex", done ? "-1" : "0");
      n.setAttribute("aria-disabled", String(done));
    });
  }
  function render() {
    for (const id of ids)
      document.querySelector(`[data-nail="${id}"]`).innerHTML = nailArt(id);
    for (const hand of ["left", "right"]) {
      $(`ring-${hand}`).innerHTML =
        state.ring?.hand === hand ? ringArt(state.ring.type) : "";
      $(`bracelet-${hand}`).innerHTML =
        state.bracelet?.hand === hand ? braceletArt(state.bracelet.type) : "";
    }
    renderStatus();
  }
  function celebration() {
    const g = $("effects");
    g.setAttribute("class", "celebration");
    g.innerHTML = Array.from({ length: 24 }, (_, i) =>
      star(
        90 + (i % 8) * 116,
        90 + Math.floor(i / 8) * 200,
        5 + (i % 3),
        ["#d9b962", "#d994ba", "#a09bcf"][i % 3],
      ),
    ).join("");
    setTimeout(() => {
      g.replaceChildren();
      g.removeAttribute("class");
    }, 1100);
  }
  async function exportPicture() {
    const button = $("export");
    button.disabled = true;
    let sourceURL;
    try {
      const svg = $("table").cloneNode(true);
      svg.setAttribute("width", "1800");
      svg.setAttribute("height", "1260");
      svg
        .querySelectorAll(".hit,.sparkle-effect,#effects")
        .forEach((n) => n.remove());
      svg.querySelectorAll("[data-nail]").forEach((n) => {
        n.removeAttribute("tabindex");
        n.removeAttribute("role");
        n.removeAttribute("aria-label");
        n.removeAttribute("class");
      });
      const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
        type: "image/svg+xml;charset=utf-8",
      });
      sourceURL = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("image"));
        img.src = sourceURL;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 1800;
      canvas.height = 1260;
      canvas.getContext("2d").drawImage(img, 0, 0);
      const png = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!png) throw new Error("png");
      if (exportURL) URL.revokeObjectURL(exportURL);
      exportURL = URL.createObjectURL(png);
      $("export-preview").src = exportURL;
      $("download-link").href = exportURL;
      $("download").showModal();
      $("download-link").click();
    } catch {
      toast(
        "Не удалось создать картинку. Попробуй открыть игру отдельно и сохранить ещё раз.",
      );
    } finally {
      if (sourceURL) URL.revokeObjectURL(sourceURL);
      button.disabled = false;
    }
  }
  const restored = restore();
  createTable();
  renderTabs();
  renderOptions();
  render();
  $("eraser").onclick = () => {
    selected.eraser = !selected.eraser;
    renderTabs();
    renderStatus();
  };
  $("undo").onclick = () => {
    if (!history.length) return;
    state = history.pop();
    persist();
    render();
    renderOptions();
  };
  $("finish").onclick = () => {
    if (!complete()) return;
    state.mode = "result";
    persist();
    renderStatus();
    celebration();
  };
  $("continue").onclick = () => {
    state.mode = "edit";
    persist();
    renderStatus();
  };
  $("export").onclick = exportPicture;
  $("close-download").onclick = () => $("download").close();
  $("help").onclick = () => $("welcome").showModal();
  $("start").onclick = () => $("welcome").close();
  $("reset").onclick = $("new").onclick = () => $("confirm").showModal();
  $("cancel-reset").onclick = () => $("confirm").close();
  $("confirm-reset").onclick = () => {
    change(() => {
      state = fresh();
    });
    $("confirm").close();
    renderOptions();
  };
  if (!restored) $("welcome").showModal();
})();
