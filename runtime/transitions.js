/* Scene-to-scene transitions. Each receives prev/next scene elements and an absolute window
 * [at, at+d]. They only move whole scenes; true shutter blur at render turns every fast move
 * into a real smear, so transforms stay simple and fast.
 */
(function () {
  const EM = window.EM;
  const T = EM.transition;

  // Camera flies INTO the old scene, new scene emerges from depth.
  T("zoom-through", ({ tl, prev, next, at, d }) => {
    // Both layers stay >= full frame so a scene never reads as a small card on black.
    tl.fromTo(prev, { scale: 1, opacity: 1, filter: "blur(0px)" }, { scale: 2.4, opacity: 0, filter: "blur(16px)", duration: d, ease: "expo.in", immediateRender: false }, at);
    tl.fromTo(next, { scale: 1.45, opacity: 0, filter: "blur(18px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: d, ease: "expo.out" }, at + d * 0.4);
  });

  // Pull back: old scene recedes with defocus, new scene settles from slightly above scale.
  T("zoom-out", ({ tl, prev, next, at, d }) => {
    tl.fromTo(prev, { scale: 1, opacity: 1, filter: "blur(0px)" }, { scale: 0.86, opacity: 0, filter: "blur(14px)", duration: d, ease: "expo.in", immediateRender: false }, at);
    tl.fromTo(next, { scale: 1.25, opacity: 0, filter: "blur(16px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: d, ease: "expo.out" }, at + d * 0.4);
  });

  function push(dx, dy) {
    return ({ tl, prev, next, at, d }) => {
      tl.fromTo(prev, { xPercent: 0, yPercent: 0 }, { xPercent: -100 * dx, yPercent: -100 * dy, duration: d, ease: "power3.inOut", immediateRender: false }, at);
      tl.fromTo(next, { xPercent: 100 * dx, yPercent: 100 * dy, opacity: 1 }, { xPercent: 0, yPercent: 0, duration: d, ease: "power3.inOut" }, at);
    };
  }
  T("push-left", push(1, 0));
  T("push-right", push(-1, 0));
  T("push-up", push(0, 1));
  T("push-down", push(0, -1));

  // Whip pan: very fast lateral travel; real shutter blur does the smear.
  T("whip", ({ tl, prev, next, at, d }) => {
    tl.fromTo(prev, { xPercent: 0 }, { xPercent: -120, duration: d, ease: "expo.in", immediateRender: false }, at);
    tl.fromTo(next, { xPercent: 120, opacity: 1 }, { xPercent: 0, duration: d, ease: "expo.out" }, at + d * 0.5);
  });

  T("blur-dissolve", ({ tl, prev, next, at, d }) => {
    tl.fromTo(prev, { opacity: 1, filter: "blur(0px)" }, { opacity: 0, filter: "blur(24px)", duration: d, ease: "power2.inOut", immediateRender: false }, at);
    tl.fromTo(next, { opacity: 0, filter: "blur(24px)", scale: 1.04 }, { opacity: 1, filter: "blur(0px)", scale: 1, duration: d, ease: "power2.inOut" }, at);
  });

  // Circle wipe from a point (e.g. where the cursor clicked). opts.x/opts.y in px.
  T("iris", ({ tl, prev, next, at, d, opts }) => {
    const x = opts.x ?? 960, y = opts.y ?? 540;
    tl.fromTo(next, { clipPath: `circle(0px at ${x}px ${y}px)`, opacity: 1 }, { clipPath: `circle(2300px at ${x}px ${y}px)`, duration: d, ease: "expo.inOut" }, at);
    tl.to(prev, { scale: 0.92, duration: d, ease: "power3.inOut" }, at);
  });

  // Vertical slat wipe in brand colour, very Burnwe.
  T("wipe", ({ tl, prev, next, at, d, sb }) => {
    const bar = EM.h("div", { class: "em-wipe" });
    next.parentNode.appendChild(bar);
    gsap.set(bar, { xPercent: -101 });
    tl.set(bar, { autoAlpha: 1 }, at);
    tl.to(bar, { xPercent: 0, duration: d / 2, ease: "expo.in" }, at);
    tl.set(next, { opacity: 1 }, at + d / 2);
    tl.set(prev, { opacity: 0 }, at + d / 2);
    tl.to(bar, { xPercent: 101, duration: d / 2, ease: "expo.out" }, at + d / 2);
    tl.set(bar, { autoAlpha: 0 }, at + d);
  });

  // Scale-down card: old scene becomes a card that drops away, new scene underneath.
  T("card-drop", ({ tl, prev, next, at, d }) => {
    tl.to(prev, { scale: 0.8, borderRadius: 48, y: 1200, rotation: -4, duration: d, ease: "power3.in" }, at);
    tl.fromTo(next, { scale: 1.1, opacity: 0 }, { scale: 1, opacity: 1, duration: d, ease: "power3.out" }, at + d * 0.3);
  });
})();
