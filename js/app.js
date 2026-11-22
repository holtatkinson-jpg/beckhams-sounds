(() => {
  const $ = sel => document.querySelector(sel);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ---------- saved progress (stays on this device) ----------
  const STORE = 'beckhams-sounds-v1';
  const state = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORE)) || {};
      return {
        visited: s.visited || [], favs: s.favs || [], trophies: s.trophies || 0,
        custom: s.custom || [], customSeq: s.customSeq || 0, maker: s.maker || null,
        home: s.home || 'us', flown: s.flown || {}, missions: s.missions || {}, heard: s.heard || {}, found: s.found || {},
      };
    } catch (e) {
      return { visited: [], favs: [], trophies: 0, custom: [], customSeq: 0, maker: null, home: 'us', flown: {}, missions: {}, heard: {}, found: {} };
    }
  })();
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} };

  const byId = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));
  const keyOf = (c, serviceId, sound) => `${c.id}/${serviceId}/${sound.id}`;
  function findSound(key) {
    const [cid, sid, nid] = key.split('/');
    if (cid === 'my') return findCustom(nid);
    const c = byId[cid], svc = c && c.services[sid];
    const sound = svc && svc.sounds.find(s => s.id === nid);
    return sound ? { c, sid, svc, sound } : null;
  }

  // other features (explore.js) plug in here
  const hooks = { paint: [], close: [] };
  let intercept = null; // lets a mission or a flight take over what tapping a country does
  function chooseCountry(c) {
    if (intercept && intercept(c)) return;
    Globe.visit(c);
  }

  // ---------- toast ----------
  let toastTimer = 0;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  // ---------- playing sounds ----------
  let playingKey = null;
  let cur = null, serviceId = 'fire', lastKey = null; // what the station screen shows
  let driveTimer = 0;
  const DRIVE_SECONDS = 5;
  const stage = $('#stage');

  function playKey(key, { toggle = true, restart = false } = {}) {
    const hit = findSound(key);
    if (!hit) return;
    if (playingKey === key && !restart) {
      if (toggle) Sirens.stop();
      return;
    }
    Sirens.play(hit.sound, () => {
      if (playingKey === key) { playingKey = null; endDrive(); paintPlaying(); }
    });
    playingKey = key;
    if (hit.c.id !== 'my' && !state.heard[key]) { state.heard[key] = 1; save(); }
    paintPlaying();
  }

  function paintPlaying() {
    document.querySelectorAll('.pad').forEach(el => el.classList.toggle('on', el.dataset.key === playingKey));
    document.querySelectorAll('.fav').forEach(el => {
      const on = el.dataset.key === playingKey;
      el.classList.toggle('on', on);
      el.classList.toggle('lights-on', on);
    });
    const here = !!(cur && playingKey && playingKey.startsWith(`${cur.id}/${serviceId}/`));
    stage.classList.toggle('playing', here);
    $('#vehicle').classList.toggle('lights-on', here);
    if (here) $('#says').textContent = `“${findSound(playingKey).sound.says}”`;
    Game.paint();
    Maker.paint();
    hooks.paint.forEach(f => f(playingKey));
  }

  let driveStage = null;
  function stationDriveBy() {
    const svc = cur.services[serviceId];
    const mine = playingKey && playingKey.startsWith(`${cur.id}/${serviceId}/`);
    driveBy(stage, mine ? playingKey : (lastKey || keyOf(cur, serviceId, svc.sounds[0])));
  }
  function driveBy(el, key) {
    endDrive();
    playKey(key, { toggle: false });
    Sirens.driveBy(DRIVE_SECONDS);
    driveStage = el;
    el.style.setProperty('--drive-time', DRIVE_SECONDS + 's');
    void el.offsetWidth; // restart the animation
    el.classList.add('driving');
    driveTimer = setTimeout(() => Sirens.stop(), DRIVE_SECONDS * 1000);
  }
  function endDrive() {
    clearTimeout(driveTimer);
    if (driveStage) driveStage.classList.remove('driving');
  }

  // ---------- favourites ----------
  function toggleFav(key) {
    const i = state.favs.indexOf(key);
    if (i >= 0) {
      state.favs.splice(i, 1);
      if (key.startsWith('my/')) { // a siren he made himself: taking it out deletes it
        if (playingKey === key) Sirens.stop();
        state.custom = state.custom.filter(m => `my/${m.kind}/${m.id}` !== key);
      }
    } else { state.favs.push(key); toast('⭐ Parked in your garage!'); }
    save();
    document.querySelectorAll(`.pad-wrap .star[data-key="${key}"]`).forEach(el => el.classList.toggle('on', i < 0));
    renderGarage();
  }

  function renderGarage() {
    const grid = $('#garage-grid');
    const items = state.favs.map(findSound).filter(Boolean);
    if (!items.length) {
      grid.innerHTML = '<div class="empty"><span>🅿️</span>Your garage is empty.<br>Tap the ⭐ next to any sound to park it here!</div>';
      return;
    }
    grid.innerHTML = items.map(({ c, sid, svc, sound }) => {
      const key = keyOf(c, sid, sound);
      return `<div class="fav" data-key="${key}">
        <button class="fav-play" data-play="${key}">
          ${vehicleSVG(sid, svc.livery)}
          <b>${sound.icon} ${sound.name}</b>
          <small>${c.flag} ${c.name} · ${svc.label}</small>
        </button>
        <button class="star on" data-fav="${key}" aria-label="Remove from garage">⭐</button>
      </div>`;
    }).join('');
    paintPlaying();
  }

  // ---------- station screen ----------
  function renderStation() {
    $('#station-title').textContent = `${cur.flag} ${cur.name}`;
    $('#fact').textContent = '💡 ' + cur.fact;
    $('#tabs').innerHTML = SERVICES.filter(s => cur.services[s.id]).map(s => {
      const svc = cur.services[s.id];
      return `<button class="tab" data-service="${s.id}">
        <span class="mini">${vehicleSVG(s.id, svc.livery)}</span>
        <span class="t"><b>${svc.label}</b><small>📞 ${svc.call}</small></span>
      </button>`;
    }).join('');
    renderService();
  }

  function renderService() {
    const svc = cur.services[serviceId];
    lastKey = null;
    document.querySelectorAll('.tab').forEach(el => el.classList.toggle('on', el.dataset.service === serviceId));
    $('#vehicle').innerHTML = vehicleSVG(serviceId, svc.livery);
    $('#pads').innerHTML = svc.sounds.map(sound => {
      const key = keyOf(cur, serviceId, sound);
      const fav = state.favs.includes(key);
      return `<div class="pad-wrap">
        ${sound.file ? '<i class="real">🎙️ Real</i>' : ''}
        <button class="pad" data-key="${key}" data-play="${key}">
          <span class="ico">${sound.icon}</span>
          <span><b>${sound.name}</b><small>${sound.says}</small></span>
        </button>
        <button class="star ${fav ? 'on' : ''}" data-key="${key}" data-fav="${key}" aria-label="Add ${sound.name} to garage">⭐</button>
      </div>`;
    }).join('');
    paintPlaying();
  }

  function openStation(c) {
    cur = c;
    serviceId = SERVICES.find(s => c.services[s.id]).id; // some countries only have one service
    renderStation();
    openSheet('#station');
    if (!state.visited.includes(c.id)) {
      state.visited.push(c.id);
      save();
      paintVisited();
      toast(state.visited.length === COUNTRIES.length
        ? '🏆 You visited every country!'
        : `🛂 New stamp: ${c.name}!`);
    }
  }

  function renderCredits() {
    $('#credits-body').innerHTML = `
      <p>For grown-ups. Sounds marked "🎙️ Real" are real recordings shared by the people below. Each one was trimmed, converted to AAC and adjusted in volume. Every other sound is synthesized by the app.</p>
      ${(window.CREDITS || []).map(c => `<div class="credit">
        <b>${c.what}</b>
        <span>"${c.title}" by ${c.by}</span>
        <span>Licence: ${c.licence}</span>
        <span>${c.url}</span>
      </div>`).join('')}
      <p>The globe is drawn with D3 and TopoJSON using Natural Earth map data.</p>`;
  }

  function openSheet(sel) {
    const el = $(sel);
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    el.scrollTop = 0;
  }
  function closeSheet(el) {
    Sirens.stop();
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    if (el.id === 'station') Globe.zoomOut();
    hooks.close.forEach(f => f(el.id));
  }

  function paintVisited() {
    $('#passport').innerHTML = `🛂 <span>${state.visited.length} / ${COUNTRIES.length} stamps</span>`;
    document.querySelectorAll('[data-country]').forEach(el =>
      el.classList.toggle('visited', state.visited.includes(el.dataset.country)));
    Globe.redraw();
  }

  // ---------- one click handler for everything ----------
  document.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    Sirens.unlock();
    if (t.dataset.fav) return toggleFav(t.dataset.fav);
    if (t.dataset.play) {
      if (t.classList.contains('pad')) { lastKey = t.dataset.play; endDrive(); }
      return playKey(t.dataset.play);
    }
    if (t.dataset.service) {
      if (t.dataset.service !== serviceId) { Sirens.stop(); serviceId = t.dataset.service; renderService(); }
      return;
    }
    if (t.dataset.country) return chooseCountry(byId[t.dataset.country]);
    if ('close' in t.dataset) return closeSheet(t.closest('.sheet'));
    if ('garage' in t.dataset || t.id === 'open-garage') { Sirens.stop(); renderGarage(); return openSheet('#garage'); }
    if (t.id === 'open-game') { openSheet('#game'); return Game.start(); }
    if (t.id === 'open-credits') { renderCredits(); return openSheet('#credits'); }
    if (t.dataset.choice) return Game.answer(+t.dataset.choice);
    if (t.id === 'next') return Game.next();
    if (t.id === 'play-again') return Game.start();
    if (t.id === 'drive-by') return stationDriveBy();
    if (t.id === 'open-maker') { openSheet('#maker'); return Maker.open(); }
    if (t.dataset.mk) { const [k, v] = t.dataset.mk.split('='); return Maker.set(k, v); }
    if (t.id === 'maker-play') return Maker.toggle();
    if (t.id === 'maker-drive') return driveBy($('#maker-stage'), LIVE);
    if (t.id === 'maker-save') return Maker.keep();
    if (t.id === 'maker-random') return Maker.random();
    if (t.id === 'stop' || t.id === 'garage-stop') return Sirens.stop();
    if (t.id === 'zoom-in') return Globe.zoomBy(1.35);
    if (t.id === 'zoom-out') return Globe.zoomBy(1 / 1.35);
  });

  document.addEventListener('input', e => {
    if (e.target.matches('#maker input[type="range"]')) Maker.slide(e.target);
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = [...document.querySelectorAll('.sheet.open')].pop();
    if (open) closeSheet(open);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) Sirens.stop(); });
  document.addEventListener('gesturestart', e => e.preventDefault()); // no page pinch-zoom on iPad

  // ---------- the globe ----------
  const Globe = (() => {
    const wrap = $('#globe-wrap'), canvas = $('#globe'), g = canvas.getContext('2d');
    const projection = d3.geoOrthographic().clipAngle(90).precision(0.4);
    const path = d3.geoPath(projection, g);
    const grid = d3.geoGraticule10();
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0, H = 0, dpr = 1, baseR = 100, zoom = 1;
    let rot = [98, -34, 0]; // start looking at the USA
    let land = null, dirty = true, fly = null, vel = [0, 0];
    let lastTouch = -1e9;
    let allLand = [], overlay = null, ticker = null, hold = false, tapHook = null, plain = false; // used by Fly There, Missions and Find It

    const pins = COUNTRIES.map(c => {
      const el = document.createElement('button');
      el.className = 'pin';
      el.dataset.country = c.id;
      el.textContent = c.flag;
      el.setAttribute('aria-label', c.name);
      $('#pins').append(el);
      return { c, el };
    });

    $('#flag-strip').innerHTML = COUNTRIES.map(c =>
      `<button class="flag-chip" data-country="${c.id}"><span class="f">${c.flag}</span>${c.name}</button>`).join('');

    fetch('vendor/countries-110m.json').then(r => r.json()).then(world => {
      const feats = topojson.feature(world, world.objects.countries).features;
      const byIso = new Map(COUNTRIES.map(c => [c.iso, c]));
      const rest = [];
      for (const f of feats) {
        const c = byIso.get(String(f.id).padStart(3, '0'));
        if (c) c.feature = f; else rest.push(f);
      }
      land = { type: 'FeatureCollection', features: rest };
      allLand = feats;
      dirty = true;
    });

    function resize() {
      const r = wrap.getBoundingClientRect();
      W = r.width; H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      baseR = Math.max(60, Math.min(W, H) * 0.46);
      dirty = true;
    }
    new ResizeObserver(resize).observe(wrap);

    function draw() {
      const R = baseR * zoom, cx = W / 2, cy = H / 2;
      projection.translate([cx, cy]).scale(R).rotate(rot);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      // glow around the planet
      let grad = g.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.16);
      grad.addColorStop(0, 'rgba(110,190,255,.5)');
      grad.addColorStop(1, 'rgba(110,190,255,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(cx, cy, R * 1.16, 0, Math.PI * 2); g.fill();

      // ocean
      grad = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R);
      grad.addColorStop(0, '#4fb4ff');
      grad.addColorStop(1, '#1257c4');
      g.fillStyle = grad;
      g.beginPath(); path({ type: 'Sphere' }); g.fill();

      g.beginPath(); path(grid);
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.stroke();

      if (land) {
        g.beginPath(); path(land);
        g.fillStyle = '#3fb873'; g.fill();
        g.strokeStyle = '#2c9159'; g.lineWidth = 1; g.stroke();
        g.lineJoin = 'round';
        for (const c of COUNTRIES) {
          if (!c.feature) continue;
          g.beginPath(); path(c.feature);
          // "plain" hides which countries have sirens, so Find It does not give answers away
          g.fillStyle = plain ? '#3fb873' : state.visited.includes(c.id) ? '#ff9f43' : '#ffd23f';
          g.fill();
          g.strokeStyle = plain ? '#2c9159' : '#8a5a00'; g.lineWidth = plain ? 1 : 1.5; g.stroke();
        }
      }

      // round shading so it looks like a ball
      grad = g.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.1, cx, cy, R);
      grad.addColorStop(0, 'rgba(255,255,255,.22)');
      grad.addColorStop(0.55, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(3,10,40,.45)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();

      if (overlay) overlay({ g, projection, path, R, W, H, centre: [-rot[0], -rot[1]] });

      // flag pins
      const centre = [-rot[0], -rot[1]];
      const size = clamp(0.8 + 0.2 * zoom, 0.9, 1.3);
      const placed = []; // pins that would sit on top of an earlier one stay hidden until he zooms in
      for (const { c, el } of pins) {
        const d = d3.geoDistance(c.pin, centre);
        if (d > 1.32) { el.style.display = 'none'; continue; }
        const [x, y] = projection(c.pin);
        const scale = size * (1 - 0.3 * (d / 1.32) ** 2);
        if (placed.some(([px, py]) => Math.hypot(px - x, py - y) < 30 * scale)) { el.style.display = 'none'; continue; }
        placed.push([x, y]);
        el.style.display = '';
        el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      }
    }

    function tick(now) {
      if (ticker && ticker(now)) dirty = true;
      if (fly) {
        const k = clamp((now - fly.t0) / fly.dur, 0, 1);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        rot[0] = fly.r0[0] + (fly.r1[0] - fly.r0[0]) * e;
        rot[1] = fly.r0[1] + (fly.r1[1] - fly.r0[1]) * e;
        zoom = fly.z0 + (fly.z1 - fly.z0) * e;
        dirty = true;
        if (k >= 1) { const done = fly.done; fly = null; if (done) done(); }
      } else if (!ptrs.size) {
        if (Math.abs(vel[0]) + Math.abs(vel[1]) > 0.02) {
          rot[0] += vel[0];
          rot[1] = clamp(rot[1] + vel[1], -75, 75);
          vel[0] *= 0.93; vel[1] *= 0.93;
          dirty = true;
        } else if (!hold && !calm && now - lastTouch > 6000 && !document.querySelector('.sheet.open')) {
          rot[0] += 0.03; // slow idle spin
          dirty = true;
        }
      }
      if (dirty && W) { draw(); dirty = false; }
      requestAnimationFrame(tick);
    }

    function flyTo(r1, z1, dur, done) {
      const dLon = ((r1[0] - rot[0]) % 360 + 540) % 360 - 180; // go the short way round
      fly = { r0: rot.slice(), r1: [rot[0] + dLon, r1[1]], z0: zoom, z1, t0: performance.now(), dur, done };
      vel = [0, 0];
    }

    function visit(c, then) {
      if (fly && fly.done) return; // already flying to a country (a plain zoom-out can be interrupted)
      lastTouch = performance.now();
      $('#hint').classList.add('gone');
      flyTo([-c.pin[0], clamp(-c.pin[1], -75, 75)], Math.max(zoom, 2.2), 850, () => (then || openStation)(c));
    }

    // glide the view a little closer to a spot each frame (used while the plane is flying)
    function follow(spot, z) {
      const dLon = ((-spot[0] - rot[0]) % 360 + 540) % 360 - 180;
      rot[0] += dLon * 0.1;
      rot[1] += (clamp(-spot[1], -75, 75) - rot[1]) * 0.1;
      zoom += (z - zoom) * 0.08;
      lastTouch = performance.now();
      dirty = true;
    }

    // ----- touch + mouse -----
    const ptrs = new Map();
    let moved = 0, downAt = 0, pinch0 = 0, zoom0 = 1;
    const pinchDist = () => {
      const [a, b] = [...ptrs.values()];
      return Math.hypot(a.x - b.x, a.y - b.y) || 1;
    };

    canvas.addEventListener('pointerdown', e => {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      lastTouch = performance.now();
      fly = null; vel = [0, 0];
      if (ptrs.size === 1) { moved = 0; downAt = lastTouch; }
      if (ptrs.size === 2) { pinch0 = pinchDist(); zoom0 = zoom; moved = 99; }
    });

    canvas.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      lastTouch = performance.now();
      if (ptrs.size === 1) {
        const k = 57.3 / (baseR * zoom);
        rot[0] += dx * k;
        rot[1] = clamp(rot[1] - dy * k, -75, 75);
        vel = [dx * k, -dy * k];
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 10) $('#hint').classList.add('gone');
      } else if (ptrs.size === 2) {
        zoom = clamp(zoom0 * pinchDist() / pinch0, 0.8, 4);
      }
      dirty = true;
    });

    const lift = e => {
      if (!ptrs.delete(e.pointerId) || ptrs.size) return;
      const now = performance.now();
      if (moved < 10) {
        vel = [0, 0];
        if (e.type === 'pointerup' && now - downAt < 600) tap(e);
      }
    };
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      zoom = clamp(zoom * Math.exp(-e.deltaY * 0.0015), 0.8, 4);
      lastTouch = performance.now();
      dirty = true;
    }, { passive: false });

    function tap(e) {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (Math.hypot(x - W / 2, y - H / 2) > baseR * zoom) return;
      const spot = projection.invert([x, y]);
      if (!spot) return;
      if (tapHook) { Sirens.unlock(); return tapHook(spot); }
      const c = COUNTRIES.find(c => c.feature && d3.geoContains(c.feature, spot));
      if (c) { Sirens.unlock(); chooseCountry(c); }
    }

    requestAnimationFrame(tick);

    return {
      visit,
      redraw: () => { dirty = true; },
      zoomBy: f => { zoom = clamp(zoom * f, 0.8, 4); lastTouch = performance.now(); dirty = true; },
      zoomOut: () => { lastTouch = performance.now(); flyTo([rot[0], rot[1]], 1, 600); },
      follow,
      goTo: (spot, z, dur, done) => { lastTouch = performance.now(); flyTo([-spot[0], clamp(-spot[1], -75, 75)], z, dur, done); },
      setOverlay: fn => { overlay = fn; dirty = true; },
      setTicker: fn => { ticker = fn; },
      hold: on => { hold = on; vel = [0, 0]; },
      overLand: spot => allLand.some(f => d3.geoContains(f, spot)),
      landAt: spot => allLand.find(f => d3.geoContains(f, spot)) || null,
      features: () => allLand,
      setTapHook: fn => { tapHook = fn; },
      setPlain: on => { plain = on; dirty = true; },
    };
  })();

  // ---------- Siren Maker ----------
  const MY = { id: 'my', flag: '🛠️', name: "Beckham's own" };
  const LIVE = 'my/x/live'; // the siren currently on the maker's sliders
  const MAX_CUSTOM = 12;

  // turns the maker's settings into a sound recipe the engine can play
  function makerRecipe(m) {
    const lo = m.lo, hi = Math.max(m.hi, m.lo + 30), k = m.speed / 100;
    const gain = { square: 0.3, sawtooth: 0.34, triangle: 0.4 }[m.wave] || 0.3;
    if (m.type === 'tones') {
      const len = 1.2 * Math.pow(0.1 / 1.2, k);
      return { layers: [{ type: 'tones', seq: [[lo, len], [hi, len]], wave: m.wave, gain }] };
    }
    if (m.type === 'horn') {
      const on = 1.6 * Math.pow(0.12 / 1.6, k);
      return { layers: [{ type: 'horn', freqs: [lo / 2, hi / 2], pattern: [[on, on * 0.4]], gain: 0.16 }] };
    }
    const period = 6 * Math.pow(0.06 / 6, k);
    return { layers: [{ type: 'sweep', lo, hi, up: period * 0.4, down: period * 0.6, wave: m.wave, gain }] };
  }

  function makerLivery(m) {
    const pale = ['#f6e500', '#f7f9fc'].includes(m.body);
    return {
      body: m.body, pattern: 'stripe',
      band: [m.body === '#f7f9fc' ? '#d9252a' : '#f7f9fc'],
      lights: m.kind === 'ems' ? ['#1f6fff', '#1f6fff'] : m.kind === 'police' ? ['#d9252a', '#1f6fff'] : ['#d9252a', '#f7f9fc'],
      text: 'BECKHAM', textColor: pale ? '#16181d' : '#f7f9fc',
      symbol: m.kind === 'ems' ? (pale ? '#1f6fff' : '#f7f9fc') : undefined,
    };
  }

  function findCustom(nid) {
    const live = nid === 'live';
    const m = live ? Maker.settings() : state.custom.find(x => String(x.id) === nid);
    if (!m) return null;
    return {
      c: MY, sid: m.kind,
      svc: { label: 'Siren Maker', livery: makerLivery(m) },
      sound: { id: nid, name: live ? 'My Siren' : `My Siren ${m.id}`, icon: '🎛️', says: 'Made by Beckham', ...makerRecipe(m) },
    };
  }

  const Maker = (() => {
    const TYPES = [['sweep', '🌊 Sweep'], ['tones', '🎶 Two-Tone'], ['horn', '📯 Horn']];
    const WAVES = [['square', 'Sharp'], ['sawtooth', 'Buzzy'], ['triangle', 'Soft']];
    const KINDS = [['fire', '🚒'], ['police', '🚓'], ['ems', '🚑']];
    const COLOURS = ['#d9252a', '#ff7a1a', '#f6e500', '#1f9d55', '#1f6fff', '#7a3cff', '#16181d', '#f7f9fc'];
    const m = Object.assign(
      { type: 'sweep', lo: 560, hi: 1400, speed: 20, wave: 'square', kind: 'fire', body: '#d9252a' },
      state.maker);
    let timer = 0;

    const seg = (id, list, key) => {
      $(id).innerHTML = list.map(([v, label]) =>
        `<button class="seg-btn ${m[key] === v ? 'on' : ''}" data-mk="${key}=${v}" aria-pressed="${m[key] === v}">${label}</button>`).join('');
    };

    function render() {
      seg('#maker-type', TYPES, 'type');
      seg('#maker-wave', WAVES, 'wave');
      seg('#maker-kind', KINDS, 'kind');
      $('#maker-colors').innerHTML = COLOURS.map(c =>
        `<button class="swatch ${m.body === c ? 'on' : ''}" data-mk="body=${c}" style="background:${c}" aria-label="Vehicle colour"></button>`).join('');
      for (const k of ['lo', 'hi', 'speed']) $('#mk-' + k).value = m[k];
      labels();
      $('#maker-vehicle').innerHTML = vehicleSVG(m.kind, makerLivery(m));
      paint();
    }

    function labels() {
      $('#mk-lo-val').textContent = m.lo + ' Hz';
      $('#mk-hi-val').textContent = Math.max(m.hi, m.lo + 30) + ' Hz';
      $('#mk-speed-val').textContent = 1 + Math.round(m.speed / 11.2);
    }

    // remember the settings, and replay so he hears the change straight away
    function changed(replay) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.maker = { ...m };
        save();
        if (replay && $('#maker').classList.contains('open')) playKey(LIVE, { restart: true });
      }, 90);
    }

    function set(k, v) {
      m[k] = v;
      render();
      changed(k === 'type' || k === 'wave');
    }

    function slide(el) {
      m[el.dataset.k] = +el.value;
      labels();
      changed(true);
    }

    function random() {
      const pick = list => list[Math.floor(Math.random() * list.length)];
      m.type = pick(TYPES)[0];
      m.wave = pick(WAVES)[0];
      m.kind = pick(KINDS)[0];
      m.body = pick(COLOURS);
      m.lo = 200 + Math.round(Math.random() * 60) * 10;
      m.hi = Math.min(2000, m.lo + 150 + Math.round(Math.random() * 90) * 10);
      m.speed = Math.round(Math.random() * 100);
      render();
      changed(true);
    }

    function keep() {
      if (state.custom.length >= MAX_CUSTOM) return toast('🅿️ Your garage has 12 of your sirens. Take one out first!');
      const id = ++state.customSeq;
      state.custom.push({ ...m, id });
      state.favs.push(`my/${m.kind}/${id}`);
      state.maker = { ...m };
      save();
      renderGarage();
      toast(`⭐ My Siren ${id} is parked in your garage!`);
    }

    function paint() {
      const on = playingKey === LIVE;
      $('#maker-stage').classList.toggle('playing', on);
      $('#maker-vehicle').classList.toggle('lights-on', on);
      $('#maker-play').textContent = on ? '⏹ Stop' : '▶ Play';
    }

    return {
      open: render, set, slide, random, keep, paint,
      toggle: () => playKey(LIVE),
      settings: () => m,
    };
  })();

  // ---------- Guess the Siren game ----------
  const Game = (() => {
    const ROUND = 5;
    const KINDS = {
      wail: ['🌊', 'Wail'], yelp: ['⚡', 'Yelp'], phaser: ['✨', 'Phaser'], rumble: ['💥', 'Rumble'],
      tones: ['🎶', 'Two-Tone'], horn: ['📯', 'Horn'], mech: ['🌀', 'Mechanical'], bell: ['🔔', 'Bell'],
    };
    // works out what kind of siren a recipe is, so the answers are never ambiguous
    function kindOf(sound) {
      if (!sound.layers || sound.layers.length !== 1) return null;
      const L = sound.layers[0];
      if (L.type === 'sweep') {
        const period = L.up + L.down;
        return L.hi < 500 ? 'rumble' : period < 0.1 ? 'phaser' : period < 1 ? 'yelp' : 'wail';
      }
      if (L.type === 'tones') return L.seq.length === 2 ? 'tones' : null;
      return KINDS[L.type] ? L.type : null;
    }

    const all = [], byKind = {};
    for (const c of COUNTRIES) {
      for (const s of SERVICES) {
        const svc = c.services[s.id];
        if (!svc) continue;
        for (const sound of svc.sounds) {
          const item = { key: keyOf(c, s.id, sound), c, sid: s.id, svc, sound, kind: kindOf(sound) };
          all.push(item);
          if (item.kind) (byKind[item.kind] = byKind[item.kind] || []).push(item);
        }
      }
    }
    const signatures = (window.SIGNATURE_SOUNDS || []).map(k => all.find(a => a.key === k)).filter(Boolean);

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const shuffle = arr => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    let q = null, results = [], answered = false, used = new Set();
    const body = $('#game-body');

    function makeQuestion() {
      let item, type;
      for (let tries = 0; tries < 30; tries++) {
        type = signatures.length && Math.random() < 0.5 ? 'country' : 'kind';
        item = type === 'country' ? pick(signatures) : pick(byKind[pick(Object.keys(byKind))]);
        if (!used.has(item.key)) break;
      }
      used.add(item.key);
      if (type === 'country') {
        const others = shuffle(COUNTRIES.filter(c => c !== item.c)).slice(0, 2);
        return {
          item, prompt: 'Which country is this siren from?',
          options: shuffle([item.c, ...others]).map(c => ({ icon: c.flag, label: c.name, right: c === item.c })),
        };
      }
      const others = shuffle(Object.keys(byKind).filter(k => k !== item.kind)).slice(0, 2);
      return {
        item, prompt: 'What kind of siren is this?',
        options: shuffle([item.kind, ...others]).map(k => ({ icon: KINDS[k][0], label: KINDS[k][1], right: k === item.kind })),
      };
    }

    function paintTrophies() {
      $('#trophies').innerHTML = `🏆 <span>${state.trophies}</span>`;
    }

    function renderQuestion() {
      const dots = Array.from({ length: ROUND }, (_, i) =>
        `<span class="dot ${i < results.length ? (results[i] ? 'right' : 'wrong') : i === results.length ? 'now' : ''}"></span>`).join('');
      body.innerHTML = `
        <div class="dots" aria-label="Question ${results.length + 1} of ${ROUND}">${dots}</div>
        <p class="prompt">${q.prompt}</p>
        <div class="mystery">
          <button class="speaker" id="replay" data-play="${q.item.key}"><span class="spk">🔊</span><small>Tap to hear it again</small></button>
          <div class="reveal" id="reveal"><span class="q">❓</span><small>Listen carefully...</small></div>
        </div>
        <div class="choices">${q.options.map((o, i) =>
          `<button class="choice" data-choice="${i}"><span class="ico">${o.icon}</span><b>${o.label}</b></button>`).join('')}</div>
        <div class="game-foot"><p class="verdict" id="verdict"></p></div>`;
    }

    function ask() {
      q = makeQuestion();
      answered = false;
      renderQuestion();
      playKey(q.item.key, { toggle: false });
      paint();
    }

    function start() {
      results = [];
      used = new Set();
      paintTrophies();
      ask();
    }

    function answer(i) {
      if (answered || !q) return;
      answered = true;
      const ok = !!q.options[i].right;
      results.push(ok);
      const { c, sid, svc, sound } = q.item;
      body.querySelectorAll('.choice').forEach((el, n) => {
        el.disabled = true;
        if (q.options[n].right) el.classList.add('right');
        else if (n === i) el.classList.add('wrong');
      });
      const dot = body.querySelectorAll('.dot')[results.length - 1];
      dot.className = 'dot ' + (ok ? 'right' : 'wrong');
      const right = q.options.find(o => o.right);
      $('#verdict').textContent = ok
        ? pick(['🎉 Yes! You got it!', '🎉 Brilliant ears!', '🎉 Correct!', '🎉 Nice one!'])
        : `Not quite. It was ${right.icon} ${right.label}`;
      const reveal = $('#reveal');
      reveal.classList.add('shown');
      reveal.innerHTML = `${vehicleSVG(sid, svc.livery)}<b>${c.flag} ${c.name} · ${svc.label}</b><small>${sound.icon} ${sound.name}: “${sound.says}”</small>`;
      const last = results.length === ROUND;
      body.querySelector('.game-foot').insertAdjacentHTML('beforeend',
        `<button class="big-btn next" id="next">${last ? 'See my score ▶' : 'Next ▶'}</button>`);
      paint();
    }

    function next() {
      if (!answered) return;
      if (results.length < ROUND) return ask();
      Sirens.stop();
      q = null;
      const score = results.filter(Boolean).length;
      if (score === ROUND) { state.trophies++; save(); paintTrophies(); }
      const stars = results.map(ok => `<span class="${ok ? '' : 'off'}">⭐</span>`).join('');
      const [face, line] = score === ROUND ? ['🏆', 'Perfect! You won a trophy!']
        : score >= 3 ? ['😃', 'Great listening!']
        : ['🚨', 'Keep practising. Visit the stations to learn the sounds!'];
      body.innerHTML = `<div class="result">
        <div class="big">${face}</div>
        <div class="stars">${stars}</div>
        <h3>You got ${score} out of ${ROUND}!</h3>
        <p>${line}</p>
        <button class="big-btn drive" id="play-again">🔁 Play again</button>
      </div>`;
    }

    // keeps the speaker button and the revealed vehicle in step with what is playing
    function paint() {
      if (!q) return;
      const on = playingKey === q.item.key;
      const spk = $('#replay'), reveal = $('#reveal');
      if (spk) spk.classList.toggle('on', on);
      if (reveal) reveal.classList.toggle('lights-on', on && answered);
    }

    return { start, answer, next, paint };
  })();

  // what explore.js (Missions, Fly There, Country Cards) is allowed to use
  window.App = {
    state, save, toast, byId, keyOf, playKey, driveBy, openSheet, closeSheet, hooks, Globe,
    setIntercept: fn => { intercept = fn; },
    stopDrive: endDrive,
  };

  paintVisited();
  renderGarage();

  // works offline once it has been opened one time
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
