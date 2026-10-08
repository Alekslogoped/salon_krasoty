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
  // Nail centers and separate width/length scales calibrated to the new
  // illustration. Coordinates stay in the shared 1000 × 700 scene.
  const fingerConfig = [
    {
      key: "little",
      name: "Мизинец",
      x: 148.5,
      y: 215,
      rotation: 1,
      sx: 0.8,
      sy: 0.91,
    },
    {
      key: "ring",
      name: "Безымянный",
      x: 220,
      y: 124,
      rotation: 3,
      sx: 0.94,
      sy: 1.06,
    },
    {
      key: "middle",
      name: "Средний",
      x: 286.5,
      y: 83,
      rotation: 0,
      sx: 1.08,
      sy: 1.08,
    },
    {
      key: "index",
      name: "Указательный",
      x: 352,
      y: 131,
      rotation: 2,
      sx: 1.02,
      sy: 1.04,
    },
    {
      key: "thumb",
      name: "Большой",
      x: 456.5,
      y: 354,
      rotation: 23,
      sx: 0.85,
      sy: 0.94,
    },
  ];
  const rightOffsets = {
    little: [0, 0],
    ring: [2, 0],
    middle: [-2, 0],
    index: [3, -1],
    thumb: [-1, 0],
  };
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
                    Math.abs(g.x) <= 20 &&
                    Math.abs(g.y) <= 35,
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
                    Math.abs(p.x) <= 20 &&
                    Math.abs(p.y) <= 35 &&
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
    "M0 -35 C11 -35 17 -25 17 -11 L18 10 C18 22 10 30 0 30 C-10 30 -18 22 -18 10 L-17 -11 C-17 -25 -11 -35 0 -35Z";
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
    return `<circle cx="${x}" cy="${y}" r="4" fill="url(#crystal)" stroke="#90a4c5" stroke-width=".7"/><path d="M${x} ${y - 3} L${x + 3} ${y} L${x} ${y + 3} L${x - 3} ${y}Z" fill="#fff9"/>`;
  }
  function nailArt(id) {
    const n = state.nails[id];
    return `<g class="art" clip-path="url(#clip-${id})" pointer-events="none"><path d="${nailPath}" fill="${n.color || "transparent"}"/>${n.color ? `<path d="${nailPath}" fill="url(#polish-light)"/>` : ""}${designArt(n.design, n.color)}${n.particles.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${p.color}" opacity=".8"/>`).join("")}${n.gems.map(gemArt).join("")}${n.color ? `<path d="M-12 -19 Q-11 -25 -5 -25" fill="none" stroke="white" stroke-width="3.5" opacity=".65" stroke-linecap="round"/><path d="M-13 -14 L-13 -5" stroke="white" stroke-width="1.8" opacity=".3" stroke-linecap="round"/>` : ""}</g><path class="nail-border" d="${nailPath}" fill="none" stroke="#bb827c" stroke-width="1" opacity=".22" pointer-events="none"/><path class="hit" d="${nailPath}" fill="transparent"/>`;
  }
  // Each decoration uses its own cell of the illustrated transparent sheet.
  // Nested SVG viewports crop without modifying the original artwork; these
  // same viewports work in the tool cards, on the hands and in PNG exports.
  const jewelryCells = {
    ring: { gold: 0, silver: 1, heart: 2, flower: 3 },
    bracelet: { gold: 0, silver: 1, pearl: 2, beads: 3 },
  };
  function jewelrySprite(kind, type, x, y, width, height) {
    const cell = jewelryCells[kind][type];
    const cropY = kind === "ring" ? 210 : 660;
    const cropHeight = kind === "ring" ? 170 : 190;
    return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${cell * 384 + 8} ${cropY} 368 ${cropHeight}" preserveAspectRatio="none" overflow="hidden" pointer-events="none"><image href="./assets/jewelry-sheet.png" width="1536" height="1024"/></svg>`;
  }
  function ringArt(type) {
    return `<g class="jewel art" pointer-events="none">${jewelrySprite("ring", type, 193, 260, 55, 25.4)}</g>`;
  }
  function braceletArt(type) {
    return `<g class="jewel art" pointer-events="none">${jewelrySprite("bracelet", type, 169, 603, 166, 65)}</g>`;
  }
  function jewelryPreview(kind, type) {
    return `<svg class="jewelry-preview" viewBox="0 0 100 60" aria-hidden="true">${jewelrySprite(kind, type, 2, 5, 96, kind === "ring" ? 44 : 49)}</svg>`;
  }
  function createTable() {
    $("table").innerHTML = `
    <defs>
      <radialGradient id="pearl" cx=".3" cy=".25"><stop stop-color="white"/><stop offset=".6" stop-color="#fff6e8"/><stop offset="1" stop-color="#cbbbc7"/></radialGradient>
      <linearGradient id="polish-light" x1="0" x2="1"><stop stop-color="#6a1833" stop-opacity=".17"/><stop offset=".27" stop-color="white" stop-opacity=".18"/><stop offset=".65" stop-color="white" stop-opacity="0"/><stop offset="1" stop-color="#581635" stop-opacity=".22"/></linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#aa7427"/><stop offset=".3" stop-color="#ffedab"/><stop offset=".5" stop-color="#d5a64c"/><stop offset=".75" stop-color="#ffe8a1"/><stop offset="1" stop-color="#b88429"/></linearGradient>
      <linearGradient id="silver" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#8899b4"/><stop offset=".3" stop-color="#ffffff"/><stop offset=".5" stop-color="#acbfd3"/><stop offset=".8" stop-color="#eff6ff"/><stop offset="1" stop-color="#8190ab"/></linearGradient>
      <radialGradient id="crystal"><stop stop-color="#ffffff"/><stop offset=".4" stop-color="#d9f4ff"/><stop offset="1" stop-color="#829bc4"/></radialGradient>
      ${ids.map((id) => `<clipPath id="clip-${id}"><path d="${nailPath}"/></clipPath>`).join("")}
    </defs>
    <image class="scene-image" href="./assets/salon-table.png" width="1000" height="700" preserveAspectRatio="none" pointer-events="none"/>
    <image class="scene-image" href="./assets/client-hands.png" width="1000" height="700" preserveAspectRatio="none" pointer-events="none"/>
    ${["left", "right"]
      .map(
        (
          hand,
        ) => `<g id="hand-${hand}" transform="${hand === "right" ? "translate(1000 0) scale(-1 1)" : "translate(0 0)"}">
      ${fingerConfig
        .map((f) => {
          const offset = hand === "right" ? rightOffsets[f.key] : [0, 0];
          return `<g data-nail="${hand}-${f.key}" transform="translate(${f.x + offset[0]} ${f.y + offset[1]}) rotate(${f.rotation}) scale(${f.sx} ${f.sy})" role="button" tabindex="0" aria-label="${hand === "left" ? "Левая" : "Правая"} рука: ${f.name.toLowerCase()}, нанести выбранный инструмент"></g>`;
        })
        .join("")}
      <g id="ring-${hand}"></g><g id="bracelet-${hand}"></g>
    </g>`,
      )
      .join("")}
    <g id="effects" pointer-events="none"></g>`;
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
          x: Math.random() * 38 - 19,
          y: Math.random() * 62 - 31,
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
    return `<svg viewBox="-24 -39 48 74" aria-hidden="true"><defs><clipPath id="preview-${type}"><path d="${nailPath}"/></clipPath></defs><g clip-path="url(#preview-${type})"><path d="${nailPath}" fill="#e88fad"/>${designArt(type, "#e88fad")}</g><path d="${nailPath}" fill="none" stroke="#ce8aa5"/></svg>`;
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
  function bottleArt(color) {
    return `<svg class="bottle" viewBox="0 0 64 80" aria-hidden="true"><ellipse cx="32" cy="73" rx="23" ry="4" fill="#b2809a" opacity=".12"/><rect x="22" y="5" width="20" height="27" rx="5" fill="#664561"/><path d="M26 9 V27 M30 9 V27 M34 9 V27 M38 9 V27" stroke="#b59caf" stroke-width="1" opacity=".35"/><rect x="23" y="29" width="18" height="6" rx="2" fill="#d6b378"/><rect x="10" y="34" width="44" height="36" rx="10" fill="${color}" stroke="#71516c" stroke-opacity=".15" stroke-width="1.5"/><path d="M15 44 Q15 39 22 39 H43" stroke="white" opacity=".65" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M15 48 V59" stroke="white" opacity=".3" stroke-width="3" stroke-linecap="round"/><path d="M18 66 H45" stroke="#532738" opacity=".12" stroke-width="3" stroke-linecap="round"/><rect x="23" y="47" width="20" height="15" rx="5" fill="#fffdf0" opacity=".88"/>${flower(33, 54, 4, "#ac668c")}</svg>`;
  }
  function glitterJar(type, color) {
    if (type === "none")
      return `<svg viewBox="0 0 64 80" aria-hidden="true"><path d="M17 26 L35 10 Q39 7 43 11 L54 22 Q57 26 53 30 L35 47Z" fill="#ead6ec" stroke="#b493ba"/><path d="M17 26 L35 47 L24 58 Q20 61 16 58 L7 49 Q3 45 7 41Z" fill="#f6d2de" stroke="#c38fa8"/><path d="M13 68 H49" stroke="#ded0e3" stroke-width="3" stroke-linecap="round"/></svg>`;
    const palette =
      type === "multi"
        ? ["#e997bf", "#8dbbd6", "#d0ae5e", "#b2a0d4"]
        : [color, "#fff6de"];
    return `<svg viewBox="0 0 64 80" aria-hidden="true"><ellipse cx="32" cy="70" rx="25" ry="4" fill="#9d7da5" opacity=".12"/><rect x="9" y="30" width="46" height="37" rx="12" fill="#fffdfd" stroke="#c6b6d1" stroke-width="1.5"/><rect x="12" y="37" width="40" height="27" rx="9" fill="${color}" opacity=".2"/><rect x="7" y="24" width="50" height="11" rx="5" fill="#baa4cc"/><path d="M12 27 H52" stroke="#f4e8ff" stroke-width="2"/>${Array.from({ length: 15 }, (_, i) => star(17 + (i % 5) * 7, 42 + Math.floor(i / 5) * 8, 1.8, palette[i % palette.length])).join("")}${star(43, 10, 6, palette[0])}${star(24, 15, 4, palette[1])}</svg>`;
  }
  function toolIcon(type) {
    let drawing =
      type === "polish"
        ? `<rect x="10" y="14" width="16" height="18" rx="5" fill="#eb90b5" stroke="#b26691"/><rect x="14" y="3" width="8" height="12" rx="2" fill="#6b4b6c"/><path d="M13 19 V25" stroke="white" stroke-width="2" stroke-linecap="round"/>`
        : type === "design"
          ? flower(18, 18, 12, "#bd8cc3")
          : type === "gems"
            ? `<path d="M10 7 H26 L32 15 L18 32 L4 15Z" fill="#b7ddf3" stroke="#8c9ebe"/><path d="M10 7 L13 15 L18 32 L23 15 L26 7 M4 15 H32" fill="none" stroke="white" stroke-width="1.5"/>`
            : type === "glitter"
              ? star(17, 17, 12, "#dfb56c") +
                star(29, 6, 4, "#d795b4") +
                star(5, 30, 3, "#b49dd6")
              : `<ellipse cx="17" cy="23" rx="10" ry="8" fill="none" stroke="#d4aa56" stroke-width="4"/><path d="M11 10 L17 4 L23 10 L17 17Z" fill="#eaaac5" stroke="#b98dc2"/>`;
    return `<svg class="tool-icon" viewBox="0 0 36 36" aria-hidden="true">${drawing}</svg>`;
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
      b.innerHTML = toolIcon(tab) + `<span>${label}</span>`;
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
          optionButton(label, bottleArt(c), selected.color === c, () =>
            choose("color", c),
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
          optionButton(label, glitterJar(v, c), selected.glitter === v, () =>
            choose("glitter", v),
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
          const art = jewelryPreview(key, type);
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
  const embeddedAssets = new Map();
  async function embeddedImage(path) {
    if (!embeddedAssets.has(path)) {
      const promise = (async () => {
        const response = await fetch(new URL(path, document.baseURI));
        if (!response.ok) throw new Error("Artwork unavailable");
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      })();
      embeddedAssets.set(path, promise);
      promise.catch(() => embeddedAssets.delete(path));
    }
    return embeddedAssets.get(path);
  }
  async function exportPicture() {
    const button = $("export");
    button.disabled = true;
    let sourceURL;
    try {
      const svg = $("table").cloneNode(true);
      svg.setAttribute("width", "1800");
      svg.setAttribute("height", "1260");
      await Promise.all(
        Array.from(svg.querySelectorAll("image"), async (image) => {
          image.setAttribute(
            "href",
            await embeddedImage(image.getAttribute("href")),
          );
        }),
      );
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
