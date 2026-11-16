(() => {
  const $ = sel => document.querySelector(sel);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ---------- saved progress (stays on this device) ----------
  const STORE = 'beckhams-sounds-v1';
  const state = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORE)) || {};
      return { visited: s.visited || [], favs: s.favs || [] };
    } catch (e) { return { visited: [], favs: [] }; }
  })();
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} };

  const byId = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));
  const keyOf = (c, serviceId, sound) => `${c.id}/${serviceId}/${sound.id}`;
  function findSound(key) {
    const [cid, sid, nid] = key.split('/');
    const c = byId[cid], svc = c && c.services[sid];
    const sound = svc && svc.sounds.find(s => s.id === nid);
    return sound ? { c, sid, svc, sound } : null;
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

  function playKey(key, { toggle = true } = {}) {
    const hit = findSound(key);
    if (!hit) return;
    if (playingKey === key) {
      if (toggle) Sirens.stop();
      return;
    }
    Sirens.play(hit.sound, () => {
      if (playingKey === key) { playingKey = null; endDrive(); paintPlaying(); }
    });
    playingKey = key;
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
  }

  function driveBy() {
    const svc = cur.services[serviceId];
    const mine = playingKey && playingKey.startsWith(`${cur.id}/${serviceId}/`);
    const key = mine ? playingKey : (lastKey || keyOf(cur, serviceId, svc.sounds[0]));
    endDrive();
    playKey(key, { toggle: false });
    Sirens.driveBy(DRIVE_SECONDS);
    stage.style.setProperty('--drive-time', DRIVE_SECONDS + 's');
    void stage.offsetWidth; // restart the animation
    stage.classList.add('driving');
    driveTimer = setTimeout(() => Sirens.stop(), DRIVE_SECONDS * 1000);
  }
  function endDrive() {
    clearTimeout(driveTimer);
    stage.classList.remove('driving');
  }

  // ---------- favourites ----------
  function toggleFav(key) {
    const i = state.favs.indexOf(key);
    if (i >= 0) state.favs.splice(i, 1);
    else { state.favs.push(key); toast('⭐ Parked in your garage!'); }
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
    $('#tabs').innerHTML = SERVICES.map(s => {
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
    serviceId = 'fire';
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
    if (t.dataset.country) return Globe.visit(byId[t.dataset.country]);
    if ('close' in t.dataset) return closeSheet(t.closest('.sheet'));
    if ('garage' in t.dataset || t.id === 'open-garage') { Sirens.stop(); renderGarage(); return openSheet('#garage'); }
    if (t.id === 'drive-by') return driveBy();
    if (t.id === 'stop' || t.id === 'garage-stop') return Sirens.stop();
    if (t.id === 'zoom-in') return Globe.zoomBy(1.35);
    if (t.id === 'zoom-out') return Globe.zoomBy(1 / 1.35);
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
          g.fillStyle = state.visited.includes(c.id) ? '#ff9f43' : '#ffd23f';
          g.fill();
          g.strokeStyle = '#8a5a00'; g.lineWidth = 1.5; g.stroke();
        }
      }

      // round shading so it looks like a ball
      grad = g.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.1, cx, cy, R);
      grad.addColorStop(0, 'rgba(255,255,255,.22)');
      grad.addColorStop(0.55, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(3,10,40,.45)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();

      // flag pins
      const centre = [-rot[0], -rot[1]];
      const size = clamp(0.8 + 0.2 * zoom, 0.9, 1.3);
      for (const { c, el } of pins) {
        const d = d3.geoDistance(c.pin, centre);
        if (d > 1.32) { el.style.display = 'none'; continue; }
        const [x, y] = projection(c.pin);
        el.style.display = '';
        el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(size * (1 - 0.3 * (d / 1.32) ** 2)).toFixed(3)})`;
      }
    }

    function tick(now) {
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
        } else if (!calm && now - lastTouch > 6000 && !document.querySelector('.sheet.open')) {
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

    function visit(c) {
      if (fly) return;
      lastTouch = performance.now();
      $('#hint').classList.add('gone');
      flyTo([-c.pin[0], clamp(-c.pin[1], -75, 75)], Math.max(zoom, 2.2), 850, () => openStation(c));
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
      const c = COUNTRIES.find(c => c.feature && d3.geoContains(c.feature, spot));
      if (c) { Sirens.unlock(); visit(c); }
    }

    requestAnimationFrame(tick);

    return {
      visit,
      redraw: () => { dirty = true; },
      zoomBy: f => { zoom = clamp(zoom * f, 0.8, 4); lastTouch = performance.now(); dirty = true; },
      zoomOut: () => { lastTouch = performance.now(); flyTo([rot[0], rot[1]], 1, 600); },
    };
  })();

  paintVisited();
  renderGarage();

  // works offline once it has been opened one time
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
