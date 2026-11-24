/* GPU scenes (WebGL2 via runtime/webgl.js; uniforms and samplers are declared by EM.shader). Everything is a pure function of the timeline time.
 *
 * webgl-globe: deterministic 3D dotted globe with glowing arc connections, a rim halo, an optional big
 *   rolling stat and bright pill badges.
 *   props: { value?, prefix?, suffix?, label?, pills?: [str], arcs?: bool | [[lat1,lon1,lat2,lon2]],
 *            color?: "#hex" (dots + arcs, default --accent), lat?: 20, lon?: -30 (where the globe settles),
 *            size?: 0.40 (radius as a fraction of frame height), spin?: 0.13 (rad/s), center?: bool }
 * shader-card: iridescent foil glass card (GLSL specular, holographic edge sheen, simulated light sweep)
 *   with a clean product / brand overlay.
 *   props: { title, sub?, badge?, metric?: str | {value, label}, src?: image path (art on the card),
 *            accent?: "#hex", tilt?: degrees (default 9) }
 */
(function () {
  const { h, fx } = window.EM;
  const DEG = Math.PI / 180;
  const LAND_B64 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/P8PkP8PAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHD///7///8/AAAAAAAIAAAAHAAAAAAAAAAAAAAAAAAA8P8P/v///wcAAD8BAAAAAAB8AAAAAAAAAAAAAAAAAAMN+PH/////AwAAngEAAAAAAIAAAAAAAAAAAAAAAAAeBHj/wP////8BAAAAAAAAgAEAAG8AAAAAAAAAAAAAAPAf238AwP///wMAAAAAAAAPAID//wEAfgMAAAAAAAAAHwDwAAAA////AQAAAAAAwAEA9P//AAAAAAAAAAAAAID3nxd/AwD+/78AAAAAAABgAC7+////D/gAAAABAAMAAPE/OP4fAPj//wAAAAAaAMCA///////f/48AgADw/w+94v92GP4A9v9/AAAA4H8AABj//////////xs+A/z///9/OOw58AD8/wcAAAD4/4+x/+7///////////8/8P///////x/wD/z/AAAAAPz/H/3/5////////////xj+////////C/gE+A8APwAAf/zx////////////////AMD///////948AP4BwAPAIB//////////////////38A+P//////PzDAAPADAAAA8J///////////////////wD8//////8fAB4A4AMAAADwj///////////////f/QHAOA38P///x8AfgAAAAAAAPAf8P////////////8/DAAAAAfA////PwD+BwAAAAAwMA/+////////////DwAGAACABQD+////APwPAAAAADBAjv////////////8HgA8AADAAAPz///8H/h8AAAAAYECD/////////////wGABwAAAAAA+P///x//fwAAAADOwPv/////////////KYADAAAAAADw////P///AAAAAOb5//////////////8/gAEAAAAAAOD//////38AAAAA4P3//////////////y+AAAAAAAAA4P//////gQEAAAAA/v//////////////LwAAAAAAAACA/v///3/DAwAAAOD///////////////8vAAAAAAAAAAD//////wMBAAAAwP////f//////////ycAAAAAAAAAAP//////HwAAAACA//8f+cP/////////AwAAAAAAAAAA//////8CAAAAAID/+Q/48f////////8hAAAAAAAAAID/////PwAAAAAA/gPzD+Dj////////fzAAAAAAAAAAAP////8fAAAAAAD8Q8aP4+f///////8PAAAAAAAAAAAA/////wcAAAAAAPxAyPj/5///////nwcQAAAAAAAAAAD/////BwAAAAAA/gCI+f/H//////8PBhgAAAAAAAAAAP7///8DAAAAAAB8AIT4/8///////38MDAAAAAAAAAAA/P///wMAAAAAAAD/AAD8////////HwwOAAAAAAAAAAD8////AQAAAAAA+H8AAPz///////8fYAEAAAAAAAAAAOD///8AAAAAAAD8/wAA/v///////z9wAAAAAAAAAAAAoP//PwAAAAAAAP7/xwP+////////fwAAAAAAAAAAAAAA//84AAAAAAAA/v////////////8/AAAAAAAAAAAAAAD/D2AAAAAAAAD///////P//////38AAAAAAAAAAAAAwP4HYAAAAAAAgP/////+5///////PwAAAAAAAAAAAAAA/QdAAAAAAADA//////wf/v////8fAAAAAAAAAAAAAAD5BwABAAAAAOD/////+Z8A/////08AAAAAAAAAAAAAAPADAAAAAAAA8P/////x/wP+////JwAAAAAAAAAAAAAA4AeAAQAAAADw//////P/A/5//v8AAAAAAAAAAAAAAADgBwMGAAAAAPD/////8/8B8D/8TwAAAAAAAAAAAAAAAMCPA3AAAAAA8P/////n/wHwD/hnAAAAAAAAAAAAAAAAAP8BAAAAAADw/////8d/APAH+A9AAAAAAAAAAAAAAAAA/AEAAAAAAPD/////zx8A8APoH0AAAAAAAAAAAAAAAADAHwAAAAAA8P////+fBwDgAcA/AAAAAAAAAAAAAAAAAAAeAAAAAADw/////78BAOABQD8AAAAAAAAAAAAAAAAAAAwAAAAAAPD/////fwAAwAFAPgAAAAAAAAAAAAAAAAAAGPwdAAAAwP////9/DwDAAUAMgAAAAAAAAAAAAAAAAACw/R8AAADA//////8PAMACQACAAgAAAAAAAAAAAAAAAED/PwAAAID//////wcAAAIAAIADAAAAAAAAAAAAAAAAAP5/AAAAAP//////BwAAAoABCAEAAAAAAAAAAAAAAAAA/v8HAAAATPD///8DAAAAsAEMAAAAAAAAAAAAAAAAAAD+/w8AAAAAgP///wMAAABgAw4AAAAAAAAAAAAAAAAAAP//DwAAAACA////AAAAAMCCDwAAAAAAAAAAAAAAAACA//8PAAAAAID//38AAAAAwMHvAQAAAAAAAAAAAAAAAID//x8AAAAAwP//PwAAAACAw49AAAAAAAAAAAAAAAAAwP///wAAAACA//8fAAAAAADDZ8AGAAAAAAAAAAAAAACA////DwAAAAD//w8AAAAAAAZmwD8AAAAAAAAAAAAAAMD///8/AAAAAP//DwAAAAAABKAA/gAAAAAAAAAAAAAAwP///38AAAAA/v8PAAAAAAAYAID8QQAAAAAAAAAAAACA////fwAAAAD+/w8AAAAAAMABAPwBAAAAAAAAAAAAAAD///9/AAAAAP7/DwAAAAAAAAABIAMEAAAAAAAAAAAAAP7//z8AAAAA/P8fAAAAAAAAAAAAAAAAAAAAAAAAAAAA/v//HwAAAAD8/x8AAAAAAAAAQCAAAAAAAAAAAAAAAAD8//8PAAAAAP7/HwgAAAAAAADgIQAAAAAAAAAAAAAAAPz//w8AAAAA/v8fDAAAAAAAAPZgAEAAAAAAAAAAAAAA8P//DwAAAAD//w8HAAAAAAAA/3MAAAAAAAAAAAAAAADg//8PAAAAAP//hwcAAAAAAID/9wAAQAAAAAAAAAAAAMD//w8AAAAA/v+BBwAAAAAAwP//AAAAAAAAAAAAAAAAwP//BwAAAAD+/4EHAAAAAADw//8DAAAAAAAAAAAAAADA//8HAAAAAPz/gQMAAAAAAPz//wNAAAAAAAAAAAAAAMD//wEAAAAA/P+BAwAAAAAA/v//BwAAAAAAAAAAAAAAwP8/AAAAAAD8/4EDAAAAAAD+//8PAAAAAAAAAAAAAADA/x8AAAAAAPh/AAAAAAAAAP7//x8AAAAAAAAAAAAAAMD/HwAAAAAA+H8AAAAAAAAA/v//HwAAAAAAAAAAAAAA4P8fAAAAAADwfwAAAAAAAAD8//8fAAAAAAAAAAAAAADg/w8AAAAAAPA/AAAAAAAAAPz//x8AAAAAAAAAAAAAAOD/BwAAAAAA4B8AAAAAAAAA/M//HwAAAAAAAAAAAAAA4P8HAAAAAADgDwAAAAAAAAD8AP8PAAAAAAAAAAAAAADgvwMAAAAAAEAAAAAAAAAAABwA/QcAAAAAAAAAAAAAAPB/AAAAAAAAAAAAAAAAAAAAAAD4BwAIAAAAAAAAAAAA8H8AAAAAAAAAAAAAAAAAAAAAAPAHABAAAAAAAAAAAADwPwAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAPAPAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAA+AMAAAAAAAAAAAAAAAAAAAAAAIABAAwAAAAAAAAAAAD4AwAAAAAAAAAAAAAAAAAAAAAAAAEABgAAAAAAAAAAAPgDAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAA+AAAAAAAAAAAAAAAAAAAAAAAAAAAwAEAAAAAAAAAAAD4AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAADwAQBAAMeH/wEAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAP//Af7//////wEAAAAAAAAAAAAAAOAHAAAAAAAAAID3//+B/////////wEAAAAAAAAAAAAAYA8AAAAACPz///////H//////////wAAAAAAAAAADwAgHwAAAID/////////////////////AQAAAACABoD///sfAAAA8P///////////////////38AAAAA+P///////wMAAAD4////////////////////HwAAAID///////83AAAA8P////////////////////8PAAAA/////////wcAwID//////////////////////x8AAGDA////////AQDwgfj/////////////////////BwAAAID///////8/HBwA//////////////////////8DAAAA+P////////8f/P///////////////////////w8AAAD4/////////////////////////////////////wD/HwD8/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==";

  function landCanvas() {
    if (landCanvas.c) return landCanvas.c;
    const W = 256, H = 128;
    const bin = atob(LAND_B64);
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    const img = g.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const on = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1;
      img.data[i * 4] = on ? 255 : 0;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return (landCanvas.c = c);
  }

  const HUBS = {
    sf: [37.8, -122.4], nyc: [40.7, -74.0], lon: [51.5, -0.1], lag: [6.5, 3.4], dxb: [25.2, 55.3], bom: [19.1, 72.9],
    sin: [1.35, 103.8], tyo: [35.7, 139.7], syd: [-33.9, 151.2], gru: [-23.5, -46.6], ber: [52.5, 13.4], sea: [47.6, -122.3],
  };
  const DEFAULT_ARCS = [["sf", "lon"], ["nyc", "dxb"], ["lon", "sin"], ["tyo", "sf"], ["gru", "lon"], ["sin", "syd"], ["dxb", "lag"], ["nyc", "ber"]].map(([a, b]) => [...HUBS[a], ...HUBS[b]]);

  const sph = (lat, lon) => [Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG), Math.cos(lat * DEG) * Math.cos(lon * DEG)];
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function slerp(a, b, u) {
    const d = Math.max(-1, Math.min(1, dot3(a, b)));
    const om = Math.acos(d), s = Math.sin(om) || 1e-6;
    const k0 = Math.sin((1 - u) * om) / s, k1 = Math.sin(u * om) / s;
    return [a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1];
  }
  const ease = (x) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
  const rgba = (c, a) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;

  // ---------------------------------------------------------------------------------------------
  const GLOBE_FRAG = `
    mat3 rotG(float th, float al){
      // world -> globe frame: Ry(-th) * Rx(-al)
      float ct = cos(th), st = sin(th), ca = cos(al), sa = sin(al);
      mat3 ry = mat3(ct, 0., st,   0., 1., 0.,  -st, 0., ct);
      mat3 rx = mat3(1., 0., 0.,   0., ca, -sa,  0., sa, ca);
      return ry * rx;
    }
    void main(){
      vec2 fc = gl_FragCoord.xy;
      vec2 s = (fc - uRes*.5) / uRes.y - uCenter;
      vec3 ro = vec3(0., 0., uD), rd = normalize(vec3(s, -uZoom));
      float b = dot(ro, rd), c = dot(ro, ro) - 1.;
      float disc = b*b - c;
      float dmin = length(ro - rd*b);
      float halo = exp(-max(dmin - 1., 0.)*7.5) * (dmin > 1. ? 1. : 0.);
      vec3 col = vec3(0.); float a = 0.;
      float k = uRes.y / 1080.;
      if (disc > 0.) {
        float t = -b - sqrt(disc);
        vec3 pw = ro + rd*t;
        vec3 n = pw;
        vec3 pg = rotG(uRot.x, uRot.y) * pw;
        float lat = asin(clamp(pg.y, -1., 1.)) / 3.14159265 * 180.;
        float lon = atan(pg.x, pg.z) / 3.14159265 * 180.;
        float row = floor(lat / uDots + .5), latc = row * uDots;
        float cnt = max(1., floor(360. * cos(latc*.0174533) / uDots + .5));
        float dl = 360. / cnt;
        float lonc = floor(lon / dl + .5) * dl;
        vec3 cg = vec3(cos(latc*.0174533)*sin(lonc*.0174533), sin(latc*.0174533), cos(latc*.0174533)*cos(lonc*.0174533));
        float d = length(pg - cg) / (uDots * .0174533);
        float land = texture(uLand, vec2(lonc/360. + .5, latc/180. + .5)).r;
        float cx = acos(clamp(pw.z, -1., 1.)) / 3.14159265;
        float grow = smoothstep(0., 1., uReveal*1.7 - cx*1.1);
        float seed = em_hash21(vec2(row, floor(lon/dl + .5)));
        float tw = .86 + .14*sin(uTime*1.6 + seed*6.2831);
        float rad = mix(.17, .36, land) * grow;
        float aa = max(fwidth(d), .02);
        float dotm = smoothstep(rad + aa, rad - aa, d);
        vec3 L = normalize(vec3(-.55, .55, .65));
        float nl = dot(n, L);
        float lit = .32 + .68*smoothstep(-.35, 1., nl);
        float fres = pow(1. - max(dot(n, -rd), 0.), 3.);
        vec3 sphere = uBase * (.85 + .3*smoothstep(-.4, 1., nl)) + uColor*fres*.16*grow;
        vec3 dotc = mix(uInk * mix(.40, 1., land), mix(uInk, uColor, .45), land*.35) * lit * tw * (1. - .6*fres);
        float da = dotm * mix(.20, 1., land);
        col = mix(sphere, dotc, da) + uColor * fres * .30 * uReveal;
        a = 1.;
        // soft limb: thin bright atmosphere inside the edge
        col += uColor * pow(fres, 4.) * .40;
        col += uColor * halo * .18 * uReveal;
      } else {
        float g = halo * .30 * uReveal;
        col = uColor * g; a = clamp(g * 1.2, 0., 1.);
      }
      col += (em_ign(fc) - .5) / 255. * a;
      outColor = vec4(col, a);
    }`;

  EM.scene("webgl-globe", {
    build(ctx) {
      const { tl, start, dur, props: p, cam } = ctx;
      const W = cam.offsetWidth || 1920, H = cam.offsetHeight || 1080;
      const hasStat = p.value != null || p.label || (p.pills && p.pills.length);
      const centered = p.center === true || (!hasStat && p.center !== false) || W / H < 1.3;
      const accent = p.color ? EM.color(p.color) : EM.cssColor(ctx.el, "--accent", [0.43, 0.36, 1]);
      const bg = EM.cssColor(ctx.el, "--bg", [0.06, 0.06, 0.07]);
      const dark = EM.luma(bg) < 0.5;
      const radius = p.size || (centered ? 0.4 : 0.36);
      const D = 3.4, zoom = radius * Math.sqrt(D * D - 1);
      const cx = centered ? 0 : (W - radius * H - 0.06 * W - W / 2) / H;
      const cy = centered ? 0 : 0.0;
      const lat0 = p.lat != null ? p.lat : 22, lon0 = p.lon != null ? p.lon : -28;
      const spin = p.spin != null ? p.spin : 0.13;
      const arcsOn = p.arcs !== false;
      const arcs = (Array.isArray(p.arcs) ? p.arcs : DEFAULT_ARCS).map((a) => ({ a: sph(a[0], a[1]), b: sph(a[2], a[3]), la: [a[0], a[1]], lb: [a[2], a[3]] }));
      const ang = (A) => Math.acos(Math.max(-1, Math.min(1, dot3(A.a, A.b))));

      const stage = h("div", { class: "gl-stage", "data-layout-allow-overflow": "" });
      const canvas = h("canvas", { class: "em-gl" });
      stage.appendChild(canvas);
      cam.appendChild(stage);

      const rotAt = (lt) => {
        const settle = Math.exp(-lt / 1.35);
        const th = -(lon0 * DEG) - (1.15 * settle) - spin * lt * 0.9 + 0;
        const al = lat0 * DEG;
        return [th, al];
      };
      const proj = (pw, rot) => {
        const x = pw[0] * Math.cos(rot[0]) + pw[2] * Math.sin(rot[0]);
        const z0 = -pw[0] * Math.sin(rot[0]) + pw[2] * Math.cos(rot[0]);
        const y0 = pw[1];
        const y = y0 * Math.cos(rot[1]) - z0 * Math.sin(rot[1]);
        const z = y0 * Math.sin(rot[1]) + z0 * Math.cos(rot[1]);
        return [x, y, z];
      };
      const visible = (q) => {
        // is the world point q (camera at (0,0,D)) hidden behind the unit sphere?
        const dx = q[0], dy = q[1], dz = q[2] - D;
        const len = Math.hypot(dx, dy, dz);
        const rdx = dx / len, rdy = dy / len, rdz = dz / len;
        const b = D * rdz, c = D * D - 1;
        const disc = b * b - c;
        if (disc <= 0) return true;
        const t = -b - Math.sqrt(disc);
        return !(t > 0 && t < len - 1e-3);
      };
      const overlay = (g, t, u, PW, PH) => {
        if (!arcsOn) return;
        const k = PH / 1080;
        const rot = u.uRot;
        const world = (A, lift) => proj([A[0] * lift, A[1] * lift, A[2] * lift], rot);
        const toPx = (q) => [PW / 2 + (q[0] / (D - q[2]) * zoom + cx) * PH, PH / 2 - (q[1] / (D - q[2]) * zoom + cy) * PH];
        const lt = t;
        g.save();
        g.globalCompositeOperation = "lighter";
        g.lineCap = "round";
        g.lineJoin = "round";
        arcs.forEach((A, i) => {
          const t0 = 0.9 + i * 0.28;
          const draw = ease((lt - t0) / 1.3);
          if (draw <= 0) return;
          const om = ang(A);
          const lift = (u2) => 1 + (0.05 + 0.20 * (om / Math.PI)) * Math.sin(Math.PI * u2) * 1.6;
          const N = 56;
          const pts = [];
          for (let s = 0; s <= N; s++) {
            const u2 = s / N;
            const pg = slerp(A.a, A.b, u2);
            const q = world(pg, lift(u2));
            pts.push({ p: toPx(q), vis: visible(q), u: u2 });
          }
          const head = draw;
          const period = 2.6 + (i % 3) * 0.35;
          const comet = draw >= 1 ? ((lt - t0 - 1.3) / period) % 1 : -1;
          const widths = [[9 * k, 0.07], [4.2 * k, 0.17], [1.7 * k, 0.9]];
          for (const [wd, al] of widths) {
            g.lineWidth = wd;
            for (let s = 0; s < N; s++) {
              const a = pts[s], b2 = pts[s + 1];
              if (!a.vis || !b2.vis) continue;
              const um = (a.u + b2.u) / 2;
              if (um > head) continue;
              let alpha = 0.34 * al;
              // faint trail behind the draw-on head
              if (draw < 1) alpha = al * (0.2 + 0.8 * Math.max(0, 1 - (head - um) / 0.35));
              if (comet >= 0) {
                const dd = um - comet;
                if (dd < 0 && dd > -0.22) alpha += al * 1.6 * (1 + dd / 0.22);
              }
              g.strokeStyle = rgba([accent[0] * 0.55 + 0.45, accent[1] * 0.55 + 0.45, accent[2] * 0.55 + 0.45], Math.min(1, alpha));
              g.beginPath();
              g.moveTo(a.p[0], a.p[1]);
              g.lineTo(b2.p[0], b2.p[1]);
              g.stroke();
            }
          }
          // endpoints: dot + expanding ring, only while facing the camera
          [[A.a, 0, t0], [A.b, N, t0 + 1.2]].forEach(([pg, idx, tt]) => {
            const q = world(pg, 1.003);
            if (!visible(q) || lt < tt) return;
            const pp = toPx(q);
            const ph = ((lt - tt) / 2.0) % 1;
            g.fillStyle = rgba([1, 1, 1], 0.95);
            g.beginPath();
            g.arc(pp[0], pp[1], 3.4 * k, 0, 7);
            g.fill();
            g.lineWidth = 1.6 * k;
            g.strokeStyle = rgba(accent, 0.7 * (1 - ph));
            g.beginPath();
            g.arc(pp[0], pp[1], (6 + 26 * ph) * k, 0, 7);
            g.stroke();
          });
        });
        g.restore();
      };

      const ink = dark ? [0.93, 0.94, 0.96] : [0.09, 0.09, 0.11];
      const base = dark ? [0.085, 0.085, 0.10] : [0.93, 0.93, 0.95];
      const runner = EM.shader(canvas, {
        width: W,
        height: H,
        dpr: 1,
        frag: GLOBE_FRAG,
        uniforms: {
          uRot: [0, 0], uZoom: zoom, uD: D, uDots: 2.1, uReveal: 0, uDark: dark ? 1 : 0, uCenter: [cx, cy],
          uColor: [Math.min(1, accent[0] * 0.8 + 0.2), Math.min(1, accent[1] * 0.8 + 0.2), Math.min(1, accent[2] * 0.8 + 0.2)],
          uInk: ink, uBase: base,
        },
        textures: { uLand: { src: landCanvas(), nearest: true } },
        overlay,
        fallback(g, t, pw, ph) {
          g.fillStyle = "#17171a";
          g.beginPath();
          g.arc(pw / 2 + cx * ph, ph / 2, radius * ph, 0, 7);
          g.fill();
        },
      });
      runner.bind(tl, start, dur, {
        extra: (lt) => ({ uRot: rotAt(lt), uReveal: ease(lt / 1.7) }),
      });

      // copy: big rolling stat, label, pills
      if (hasStat && !centered) {
        const col = h("div", { class: "gl-copy" });
        const els = [];
        if (p.value != null) {
          const num = h("div", { class: "gl-stat" });
          // fit the numeral to the copy column so it never runs into the globe
          const chars = ((p.prefix || "") + String(p.value) + (p.suffix || "")).length;
          const colW = Math.max(400, (W / 2 + cx * H - radius * H - 0.07 * W) - 150);
          num.style.fontSize = Math.round(Math.max(120, Math.min(232, colW / (chars * 0.6)))) + "px";
          col.style.width = colW + "px";
          col.appendChild(num);
          els.push(num);
          const raw = String(p.value);
          const n = parseFloat(raw.replace(/,/g, ""));
          if (Number.isFinite(n) && /^[\d,.\s]+$/.test(raw)) {
            const dec = (raw.split(".")[1] || "").length;
            const fmt = (v) => {
              const [a, b] = v.toFixed(dec).split(".");
              return (p.prefix || "") + a.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (b ? "." + b : "") + (p.suffix || "");
            };
            const cd = Math.min(2.4, dur * 0.6);
            // seek-safe roll: a pure function of time through a setter driver (no onUpdate)
            num.textContent = fmt(0);
            EM.drive(tl, start + 0.5, cd, (lt, pr) => (num.textContent = fmt(n * (1 - Math.pow(1 - pr, 3)))), { ease: "none" });
          } else num.textContent = (p.prefix || "") + raw + (p.suffix || "");
        }
        if (p.label) {
          const lab = h("div", { class: "gl-label" }, p.label);
          col.appendChild(lab);
          els.push(lab);
        }
        let pillEls = [];
        if (p.pills && p.pills.length) {
          const row = h("div", { class: "gl-pills" });
          pillEls = p.pills.slice(0, 5).map((t) => h("div", { class: "gl-pill" }, h("i"), t));
          row.append(...pillEls);
          col.appendChild(row);
        }
        cam.appendChild(col);
        if (els.length) fx.focusIn(tl, els, start + 0.3, { stagger: 0.12 });
        if (pillEls.length) fx.focusIn(tl, pillEls, start + 0.9, { stagger: 0.14, blur: 10 });
      } else if (hasStat) {
        const col = h("div", { class: "gl-copy gl-copy-c" });
        const bits = [];
        if (p.value != null) bits.push(h("div", { class: "gl-stat" }, (p.prefix || "") + p.value + (p.suffix || "")));
        if (p.label) bits.push(h("div", { class: "gl-label" }, p.label));
        col.append(...bits);
        cam.appendChild(col);
        fx.focusIn(tl, bits, start + 0.3, { stagger: 0.12 });
      }
    },
  });

  // ---------------------------------------------------------------------------------------------
  const CARD_FRAG = `
    float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
    vec3 tri(float x){ x = fract(x)*3.; return x < 1. ? mix(uA, uB, x) : (x < 2. ? mix(uB, uC, x - 1.) : mix(uC, uA, x - 2.)); }
    vec3 irid(float x){ return .5 + .5*cos(6.2831853*(x + vec3(0., .33, .67))); }
    void main(){
      float k = uRes.x / uSize.x;
      vec2 p = (vUv - .5) * uRes;              // px from centre
      vec2 hf = uSize * .5 * k;
      float rad = 46. * k;
      float d = sdRR(p, hf, rad);            // < 0 inside
      float aa = clamp(.5 - d, 0., 1.);
      if (aa <= 0.) { outColor = vec4(0.); return; }
      vec2 uv = p / hf;                      // -1..1
      float t = uTime;
      // virtual light: moves with the sweep and the card tilt (simulated pointer)
      vec2 lp = vec2(mix(-1.5, 1.5, uSweep) , mix(.9, -.6, uSweep)) + uTilt * 4.;
      vec2 lv = uv - lp;
      float spot = exp(-dot(lv*vec2(.8, 1.2), lv*vec2(.8, 1.2)) * 2.4);
      // diagonal sheen band
      float band = dot(uv, normalize(vec2(1., .55))) - mix(-1.9, 1.9, uSweep) - uTilt.x*2.;
      float bandI = exp(-band*band*11.) * .9 + exp(-(band-.40)*(band-.40)*60.) * .35;
      // brushed anisotropic grain (streaks along x)
      float streak = em_noise(vec2(p.x*.006 + t*.02, p.y*.9)) * .6 + em_noise(vec2(p.x*.02, p.y*2.7)) * .4;
      // foil phase: shifts with tilt, sweep and slow noise
      float ph = dot(uv, vec2(.55, .35)) + em_fbm(uv*1.4 + t*.03)*.9 + uTilt.x*2.2 - uTilt.y*1.6 + uSweep*.6;
      vec3 foil = mix(tri(ph), irid(ph*.8), .30);
      // body: dark glass, subtle vertical + corner lift
      vec3 bodyDark = mix(vec3(.108, .108, .125), vec3(.060, .060, .070), smoothstep(-.9, .9, uv.y*.7 + uv.x*.3));
      bodyDark += vec3(.030) * spot;
      // guilloche micro lines (security print), faint
      float gl = abs(sin(length(uv*vec2(1.2, 1.)  - vec2(.62, -.35))*95.)) ;
      float guil = smoothstep(.93, 1., gl) * smoothstep(1.35, .25, length(uv - vec2(.62, -.35))) * .10;
      vec3 col = bodyDark + guil * foil;
      // foil reveal where light + band hit, brushed by the streaks
      float foilAmt = clamp(bandI*.85 + spot*.55, 0., 1.) * (.55 + .45*streak);
      col = mix(col, foil*.9 + vec3(.04), foilAmt * .52);
      col += vec3(1.) * pow(bandI, 2.) * (.10 + .10*streak);
      // holographic edge sheen: thin, brightest facing the light
      float edge = exp(max(d, -60.*k) / (5.*k));
      float edgeLit = .30 + .70*smoothstep(-1., 1., dot(normalize(p + 1e-4), normalize(vec2(-lp.x, -lp.y))*-1.));
      vec3 edgeC = mix(irid(ph*1.3 + uv.x*.2), foil, .5);
      col += edgeC * edge * edgeLit * .55;
      col += vec3(.9, .92, 1.) * exp(max(d, -60.*k)/(1.6*k)) * .10;
      col = col / (1. + col*.15);
      if (uPass > .5) {
        // gloss pass drawn OVER the card content: light only, transparent
        float g = (bandI*.16 + spot*.10) * (.7 + .3*streak) + edge*edgeLit*.30;
        vec3 gc = mix(vec3(1.), foil, .35);
        outColor = vec4(gc * g * aa, g * aa * .9);
        return;
      }
      col += (em_ign(gl_FragCoord.xy) - .5) / 255.;
      outColor = vec4(col * aa, aa);
    }`;

  EM.scene("shader-card", {
    build(ctx) {
      const { tl, start, dur, props: p, cam } = ctx;
      const CW = 1040, CH = 656;
      const a = p.accent ? EM.color(p.accent) : EM.cssColor(ctx.el, "--accent", [0.43, 0.36, 1]);
      const b = p.accent ? a.map((x) => Math.min(1, x * 0.7 + 0.25)) : EM.cssColor(ctx.el, "--accent2", [1, 0.36, 0.66]);
      const c = p.accent ? a.map((x, i) => [0.3, 0.8, 1][i] * 0.5 + x * 0.3) : EM.cssColor(ctx.el, "--accent3", [0.16, 0.78, 1]);
      const tiltDeg = p.tilt != null ? p.tilt : 9;

      const wrap = h("div", { class: "sc-wrap", style: { width: CW + "px", height: CH + "px" } });
      const rig = h("div", { class: "sc-rig" });
      const body = h("canvas", { class: "em-gl sc-body" });
      const content = h("div", { class: "sc-content" });
      const gloss = h("canvas", { class: "em-gl sc-gloss" });
      rig.append(body, content, gloss);
      wrap.appendChild(rig);
      cam.appendChild(wrap);

      // content
      const top = h("div", { class: "sc-top" });
      const brand = p.src ? null : fx.brandImg(ctx, "mark", { height: 52 });
      if (p.badge) top.appendChild(h("div", { class: "sc-badge" }, h("i"), p.badge));
      else if (brand) top.appendChild(brand.wrap);
      content.appendChild(top);
      let art = null;
      if (p.src) {
        art = h("div", { class: "sc-art" }, h("img", { src: p.src }));
        content.appendChild(art);
      }
      const bottom = h("div", { class: "sc-bottom" });
      const txt = h("div", { class: "sc-text" });
      if (p.title) txt.appendChild(h("div", { class: "sc-title" }, p.title));
      if (p.sub) txt.appendChild(h("div", { class: "sc-sub" }, p.sub));
      bottom.appendChild(txt);
      const metric = typeof p.metric === "object" && p.metric ? p.metric : p.metric ? { value: String(p.metric) } : null;
      let metricEl = null;
      if (metric) {
        metricEl = h("div", { class: "sc-metric" }, h("div", { class: "sc-metric-v" }, metric.value), metric.label ? h("div", { class: "sc-metric-l" }, metric.label) : null);
        bottom.appendChild(metricEl);
      }
      content.appendChild(bottom);

      const uniforms = { uPass: 0, uSweep: 0, uDark: 1, uTilt: [0, 0], uSize: [CW, CH], uA: a, uB: b, uC: c };
      const opts = { width: CW, height: CH, dpr: 1.5, frag: CARD_FRAG, fallbackColors: ["#1c1c20", "#101012"] };
      const r0 = EM.shader(body, Object.assign({}, opts, { uniforms: Object.assign({}, uniforms) }));
      const r1 = EM.shader(gloss, Object.assign({}, opts, { uniforms: Object.assign({}, uniforms, { uPass: 1 }) }));

      // motion: arrival is a focus pull on the wrapper; the rig sways (pure function of time)
      const sw = (lt) => ease((lt - 0.35) / Math.max(1.5, dur - 0.9));
      const sway = (lt) => {
        const u = Math.min(1, lt / Math.max(1, dur));
        const settle = 1 - Math.exp(-lt / 0.9);
        return [(-0.45 + 0.9 * (0.5 - 0.5 * Math.cos(Math.PI * u))) * tiltDeg * settle + (1 - settle) * tiltDeg * -1.6, (0.25 - 0.5 * Math.sin(Math.PI * u)) * tiltDeg * 0.5 * settle];
      };
      EM.drive(tl, start, dur, (lt) => {
        const [ry, rx] = sway(lt);
        rig.style.transform = `perspective(2200px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`;
        const tilt = [ry * DEG * 0.9, rx * DEG * 0.9];
        const ex = { uSweep: sw(lt), uTilt: tilt };
        r0.render(lt, ex);
        r1.render(lt, ex);
      });
      fx.focusIn(tl, wrap, start + 0.1, { dur: 0.7, blur: 18, scale: 1.05, y: 40 });
      fx.focusIn(tl, [top, txt], start + 0.55, { stagger: 0.12, blur: 10, scale: 1.02 });
      if (metricEl) fx.focusIn(tl, metricEl, start + 0.85, { blur: 10, scale: 1.02 });
      if (art) fx.focusIn(tl, art, start + 0.45, { blur: 14, scale: 1.04 });
    },
  });
})();
