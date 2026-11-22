// Exploring features: Fly There, Rescue Missions and Country Cards.
// They use the globe and sounds from app.js through window.App.
(() => {
  const { state, save, toast, byId, keyOf, Globe } = App;
  const $ = sel => document.querySelector(sel);
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const shuffle = list => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  // ---------- the bar that sits on top of the globe during a flight or a mission ----------
  const home = $('#home'), bar = $('#mode-bar');
  function showBar(text, action, finding) {
    $('#mode-text').innerHTML = text;
    const btn = $('#mode-action');
    btn.hidden = !action;
    btn.innerHTML = action || '';
    bar.hidden = false;
    home.classList.add('mode-on');
    home.classList.toggle('mode-find', !!finding);
    $('#hint').classList.add('gone');
  }
  function hideBar() {
    bar.hidden = true;
    home.classList.remove('mode-on', 'mode-find');
    App.setIntercept(null);
  }

  // ---------- stickers ----------
  const soundKeys = c => Object.entries(c.services).flatMap(([sid, svc]) => svc.sounds.map(s => keyOf(c, sid, s)));
  function stickers(c) {
    return [
      ['🛂', 'Visited', state.visited.includes(c.id)],
      ['🔊', 'Heard every sound', soundKeys(c).every(k => state.heard[k])],
      ['🚨', 'Finished a mission', !!state.missions[c.id]],
      ['✈️', 'Flew there', !!state.flown[c.id]],
    ];
  }
  const stickerTotal = () => COUNTRIES.reduce((n, c) => n + stickers(c).filter(s => s[2]).length, 0);

  // =====================================================================
  //  FLY THERE
  // =====================================================================
  const Trip = (() => {
    let mode = null; // 'to' | 'home' | 'flying' | 'landed'
    let from = null, to = null, route = null, t0 = 0, dur = 0, where = 0;
    const card = $('#trip-card');

    // where the sun is overhead right now, so the globe can show day and night
    function sunSpot(date) {
      const start = Date.UTC(date.getUTCFullYear(), 0, 0);
      const day = Math.floor((date - start) / 864e5);
      const hours = date.getUTCHours() + date.getUTCMinutes() / 60;
      return [(12 - hours) * 15, -23.44 * Math.cos((2 * Math.PI / 365) * (day + 10))];
    }

    function clock(c, date) {
      try {
        const parts = tz => Object.fromEntries(new Intl.DateTimeFormat('en-US', {
          timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
        }).formatToParts(date).map(p => [p.type, +p.value]));
        const asUTC = p => Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
        const there = parts(c.tz), here = parts(byId[state.home].tz);
        const time = new Intl.DateTimeFormat('en-US', { timeZone: c.tz, hour: 'numeric', minute: '2-digit' }).format(date);
        const h = there.hour;
        const part = h >= 5 && h < 12 ? 'morning ☀️' : h >= 12 && h < 17 ? 'afternoon ☀️' : h >= 17 && h < 21 ? 'evening 🌆' : 'night-time 🌙';
        const diff = Math.round((asUTC(there) - asUTC(here)) / 36e5 * 2) / 2;
        const gap = diff === 0 ? 'the same time as home' : `${Math.abs(diff)} hour${Math.abs(diff) === 1 ? '' : 's'} ${diff > 0 ? 'ahead of' : 'behind'} home`;
        return `🕒 In ${c.capital} it is <b>${time}</b>, ${part}. That is ${gap}.`;
      } catch (e) { return ''; }
    }

    // which big oceans the flight crosses (only the wide-open middle of each ocean counts)
    function oceans() {
      const boxes = [
        ['Atlantic Ocean', p => p[0] > -60 && p[0] < -10 && p[1] > -50 && p[1] < 65],
        ['Pacific Ocean', p => (p[0] > 150 || p[0] < -125) && p[1] > -50 && p[1] < 60],
        ['Indian Ocean', p => p[0] > 55 && p[0] < 95 && p[1] > -45 && p[1] < 15],
      ];
      const found = [];
      for (let i = 1; i < 60; i++) {
        const p = route(i / 60);
        const lon = ((p[0] + 540) % 360) - 180;
        for (const [name, inside] of boxes) {
          if (!found.includes(name) && inside([lon, p[1]]) && !Globe.overLand(p)) found.push(name);
        }
      }
      return found;
    }

    function drawPlane(g, x, y, angle) {
      g.save();
      g.translate(x, y); g.rotate(angle);
      g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
      g.fillStyle = '#fff'; g.strokeStyle = '#10203f'; g.lineWidth = 1.5; g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(20, 0); g.quadraticCurveTo(14, -5, 4, -5); g.lineTo(-6, -20); g.lineTo(-12, -20); g.lineTo(-6, -5);
      g.lineTo(-15, -4.5); g.lineTo(-20, -11); g.lineTo(-24, -11); g.lineTo(-21, 0);
      g.lineTo(-24, 11); g.lineTo(-20, 11); g.lineTo(-15, 4.5); g.lineTo(-6, 5); g.lineTo(-12, 20); g.lineTo(-6, 20);
      g.lineTo(4, 5); g.quadraticCurveTo(14, 5, 20, 0);
      g.closePath(); g.fill(); g.shadowColor = 'transparent'; g.stroke();
      g.restore();
    }

    function overlay({ g, projection, path, centre }) {
      // night side of the Earth
      const sun = sunSpot(new Date());
      g.beginPath(); path(d3.geoCircle().center([sun[0] + 180, -sun[1]]).radius(90)());
      g.fillStyle = 'rgba(4, 8, 40, 0.42)'; g.fill();
      if (!route) return;

      const a = from.city, b = to.city, here = route(where);
      g.lineCap = 'round';
      g.beginPath(); path({ type: 'LineString', coordinates: [a, b] });
      g.setLineDash([3, 9]); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2.5; g.stroke();
      g.setLineDash([]);
      if (where > 0.001) {
        g.beginPath(); path({ type: 'LineString', coordinates: [a, here] });
        g.strokeStyle = '#ff4d4d'; g.lineWidth = 4; g.stroke();
      }
      const visible = p => d3.geoDistance(p, centre) < 1.5;
      g.font = '800 15px ui-rounded, system-ui, sans-serif'; g.textAlign = 'center';
      for (const c of [from, to]) {
        if (!visible(c.city)) continue;
        const [x, y] = projection(c.city);
        g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2);
        g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#10203f'; g.lineWidth = 2.5; g.stroke();
        g.lineWidth = 4; g.strokeStyle = 'rgba(7,18,38,.85)'; g.strokeText(c.capital, x, y - 13);
        g.fillStyle = '#fff'; g.fillText(c.capital, x, y - 13);
      }
      if (visible(here)) {
        const p = projection(here), q = projection(route(Math.min(1, where + 0.01))), r = projection(route(Math.max(0, where - 0.01)));
        drawPlane(g, p[0], p[1], Math.atan2(q[1] - r[1], q[0] - r[0]));
      }
    }

    function ticker(now) {
      if (mode === 'flying') {
        const k = Math.max(0, Math.min(1, (now - t0) / dur));
        where = (1 - Math.cos(Math.PI * k)) / 2; // gentle take-off and landing
        Globe.follow(route(where), 1.55);
        if (k >= 1) land();
        return true;
      }
      if (mode === 'landed') { Globe.follow(to.city, 1.9); return true; }
      return false;
    }

    function start() {
      route = null; card.hidden = true;
      Globe.setTicker(null); Globe.hold(false);
      if (mode === 'landed') Globe.zoomOut();
      mode = 'to';
      const h = byId[state.home];
      showBar('✈️ Where shall we fly? <b>Tap a country!</b>', `🏠 From ${h.flag} ${h.name}`);
      Globe.setOverlay(overlay);
      App.setIntercept(c => { choose(c); return true; });
    }

    function choose(c) {
      if (mode === 'home') {
        state.home = c.id; save();
        toast(`🏠 Home is now ${c.flag} ${c.name}`);
        return start();
      }
      if (mode !== 'to') return;
      if (c.id === state.home) return toast('🏠 That is home! Pick a country to fly to.');
      from = byId[state.home]; to = c;
      route = d3.geoInterpolate(from.city, to.city);
      where = 0;
      dur = Math.max(3500, Math.min(9000, 2500 + d3.geoDistance(from.city, to.city) * 3000));
      t0 = performance.now() + 900; // a moment to turn the globe to the starting city
      mode = 'flying';
      Globe.hold(true);
      Globe.setTicker(ticker);
      App.setIntercept(() => true); // taps do nothing while the plane is in the air
      showBar(`✈️ Flying from <b>${from.capital}</b> to <b>${to.capital}</b>...`);
    }

    function land() {
      mode = 'landed';
      const first = !state.flown[to.id];
      state.flown[to.id] = 1; save();
      const km = d3.geoDistance(from.city, to.city) * 6371;
      const round = (n, step) => Math.round(n / step) * step;
      const miles = round(km * 0.621371, km > 2000 ? 50 : 10), kms = round(km, km > 2000 ? 50 : 10);
      const hours = km / 900;
      const long = hours < 1 ? 'less than 1 hour' : `about ${Math.round(hours * 2) / 2} hours`;
      const seas = oceans();
      showBar(`🛬 You landed in <b>${to.flag} ${to.name}</b>!`);
      card.innerHTML = `
        <p>📏 <b>${miles.toLocaleString('en-US')} miles</b> (${kms.toLocaleString('en-US')} km) from ${from.capital}</p>
        <p>⏱️ That is ${long} in a jet plane</p>
        ${seas.length ? `<p>🌊 You flew over the <b>${seas.join('</b> and the <b>')}</b></p>` : ''}
        <p>${clock(to, new Date())}</p>
        ${first ? `<p class="won">✈️ New sticker for ${to.name}!</p>` : ''}
        <div class="trip-buttons">
          <button class="big-btn drive" id="trip-visit">🚒 Visit ${to.name}</button>
          <button class="big-btn next" id="trip-again">✈️ Fly again</button>
        </div>`;
      card.hidden = false;
    }

    function stop() {
      mode = null; route = null;
      card.hidden = true;
      Globe.setOverlay(null); Globe.setTicker(null); Globe.hold(false);
      hideBar();
    }

    return {
      start, stop,
      active: () => mode !== null,
      action: () => { if (mode === 'to') { mode = 'home'; showBar('🏠 <b>Tap the country where you live</b>'); } },
      visit: () => { const c = to; stop(); Globe.visit(c); },
    };
  })();

  // =====================================================================
  //  RESCUE MISSIONS
  // =====================================================================
  const Mission = (() => {
    const STORIES = {
      fire: ['A kitten is stuck up a tall tree', 'Smoke is coming from a kitchen', 'A bin is on fire in the park', 'A kite is tangled on a high roof'],
      police: ['A little dog is lost in the city', 'The traffic lights are broken and the cars are stuck', 'Someone has lost their bag at the station', 'A big parade needs the road kept clear'],
      ems: ['Someone fell off their bike and hurt their arm', 'A runner feels dizzy at the big race', 'Grandpa slipped on the ice and hurt his leg', 'A footballer has twisted her ankle'],
    };
    const WHO = { fire: 'the fire brigade', police: 'the police', ems: 'an ambulance' };
    const HERO = { fire: 'The fire brigade', police: 'The police', ems: 'The ambulance crew' };
    const VEHICLES = [['fire', '🚒', 'Fire engine'], ['police', '🚓', 'Police car'], ['ems', '🚑', 'Ambulance']];
    const body = $('#mission-body');
    let m = null, timer = 0, lastId = null;

    const total = () => Object.values(state.missions).reduce((a, b) => a + b, 0);
    const paintCount = () => { $('#mission-count').innerHTML = `🚨 <span>${total()}</span>`; };

    function start() {
      clearTimeout(timer);
      const fresh = COUNTRIES.filter(c => !state.missions[c.id] && c.id !== lastId);
      const c = pick(fresh.length ? fresh : COUNTRIES.filter(c => c.id !== lastId));
      const sid = pick(Object.keys(c.services));
      lastId = c.id;
      m = { c, sid, svc: c.services[sid], story: pick(STORIES[sid]), mistakes: 0, step: 'find', hints: 0 };
      Globe.zoomOut();
      Globe.hold(true); // no slow spinning while he is searching
      showBar(`🚨 <b>${m.story} in ${c.capital}!</b> Find ${c.flag} ${c.name} on the globe.`, '💡 Hint', true);
      App.setIntercept(found => { tapped(found); return true; });
    }

    function hint() {
      if (!m || m.step !== 'find') return;
      m.hints++;
      toast(`💡 ${m.c.name} is in ${m.c.continent}`);
      Globe.goTo(m.c.pin, 2.2, 900);
      const pin = document.querySelector(`.pin[data-country="${m.c.id}"]`);
      if (pin && m.hints > 1) { pin.classList.add('nudge'); setTimeout(() => pin.classList.remove('nudge'), 3000); }
    }

    function tapped(c) {
      if (!m || m.step !== 'find') return;
      if (c !== m.c) { m.mistakes++; return toast(`That is ${c.flag} ${c.name}. Keep looking!`); }
      m.step = 'call';
      Globe.hold(false);
      hideBar();
      App.setIntercept(() => true); // ignore taps while the globe flies in
      toast(`✅ You found ${c.name}!`);
      const mine = m;
      const open = () => {
        if (m !== mine || mine.opened) return;
        mine.opened = true;
        App.setIntercept(null); paintCount(); render(); App.openSheet('#mission');
      };
      Globe.visit(c, open);
      setTimeout(open, 1700); // in case the fly-in was interrupted by a touch
    }

    const dots = () => ['find', 'call', 'send', 'go'].map(s => {
      const order = ['find', 'call', 'send', 'go', 'done'];
      const cls = order.indexOf(s) < order.indexOf(m.step) ? 'right' : s === m.step ? 'now' : '';
      return `<span class="dot ${cls}"></span>`;
    }).join('');

    const head = () => `<div class="dots">${dots()}</div>
      <p class="story">${m.c.flag} <b>${m.c.capital}, ${m.c.name}:</b> ${m.story}!</p>`;

    function render() {
      const { c, sid, svc } = m;
      if (m.step === 'call') {
        const own = new Set(Object.values(c.services).map(s => s.call));
        const pool = [...new Set(COUNTRIES.flatMap(x => Object.values(x.services).map(s => s.call)).concat(['911', '999', '112', '000', '119', '110']))]
          .filter(n => !own.has(n));
        m.options = shuffle([svc.call, ...shuffle(pool).slice(0, 2)]).map(n => ({ icon: '📞', label: n, right: n === svc.call }));
        body.innerHTML = `${head()}
          <p class="prompt">Which number do you call for ${WHO[sid]} in ${c.name}?</p>
          <div class="choices">${choices()}</div>
          <div class="game-foot"><p class="verdict" id="m-verdict"></p></div>`;
      } else if (m.step === 'send') {
        m.options = VEHICLES.map(([id, icon, label]) => ({ icon, label, right: id === sid }));
        body.innerHTML = `${head()}
          <p class="prompt">📞 ${svc.call} is ringing! Who should go?</p>
          <div class="choices">${choices()}</div>
          <div class="game-foot"><p class="verdict" id="m-verdict"></p></div>`;
      } else if (m.step === 'go') {
        body.innerHTML = `${head()}
          <div class="stage" id="mission-stage"><div class="vehicle" id="mission-vehicle">${vehicleSVG(sid, svc.livery)}</div><div class="road"></div></div>
          <div class="game-foot"><button class="big-btn stop" id="mission-go">🚨 Go, go, go!</button></div>`;
      } else if (m.step === 'done') {
        const stars = 3 - Math.min(2, m.mistakes);
        body.innerHTML = `<div class="result">
          <div class="big">🏅</div>
          <div class="stars">${[0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}">⭐</span>`).join('')}</div>
          <h3>Mission complete!</h3>
          <p>${c.flag} ${HERO[sid]} in ${c.capital} saved the day.${m.first ? `<br>🚨 New sticker for ${c.name}!` : ''}</p>
          <button class="big-btn drive" id="mission-next">🚨 Next mission</button>
        </div>`;
      }
    }

    const choices = () => m.options.map((o, i) =>
      `<button class="choice" data-mchoice="${i}"><span class="ico">${o.icon}</span><b>${o.label}</b></button>`).join('');

    function answer(i, el) {
      if (!m || !m.options || m.locked) return;
      if (!m.options[i].right) {
        m.mistakes++;
        el.classList.add('wrong'); el.disabled = true;
        $('#m-verdict').textContent = m.step === 'call' ? 'Not that number. Try again!' : 'Not quite. Who helps with this?';
        return;
      }
      el.classList.add('right');
      m.locked = true;
      $('#m-verdict').textContent = m.step === 'call' ? `🎉 Yes! In ${m.c.name} you call ${m.svc.call}.` : '🎉 That is the right team!';
      timer = setTimeout(() => { m.locked = false; m.options = null; m.step = m.step === 'call' ? 'send' : 'go'; render(); }, 1300);
    }

    function go() {
      if (!m || m.step !== 'go' || m.locked) return;
      m.locked = true;
      $('#mission-go').disabled = true;
      m.key = keyOf(m.c, m.sid, m.svc.sounds[0]);
      App.driveBy($('#mission-stage'), m.key);
      timer = setTimeout(() => {
        m.locked = false;
        m.first = !state.missions[m.c.id];
        state.missions[m.c.id] = (state.missions[m.c.id] || 0) + 1; save();
        m.step = 'done';
        paintCount(); render();
      }, 5400);
    }

    function quit() { clearTimeout(timer); m = null; Globe.hold(false); hideBar(); }

    // flash the lights while the mission vehicle's siren is playing
    App.hooks.paint.push(key => {
      const v = $('#mission-vehicle');
      if (v && m) v.classList.toggle('lights-on', key === m.key);
    });
    App.hooks.close.push(id => { if (id === 'mission') { clearTimeout(timer); m = null; Globe.zoomOut(); } });

    return { start, hint, answer, go, quit, finding: () => !!m && m.step === 'find' };
  })();

  // =====================================================================
  //  COUNTRY CARDS
  // =====================================================================
  function renderCards() {
    $('#sticker-count').innerHTML = `⭐ <span>${stickerTotal()} / ${COUNTRIES.length * 4}</span>`;
    $('#cards-grid').innerHTML = COUNTRIES.map(c => {
      const st = stickers(c);
      const numbers = SERVICES.filter(s => c.services[s.id]).map(s => [s.emoji, c.services[s.id].call]);
      const calls = new Set(numbers.map(n => n[1])).size === 1 ? `📞 Call <b>${numbers[0][1]}</b>` : numbers.map(([e, n]) => `${e} <b>${n}</b>`).join(' · ');
      return `<div class="ccard ${st.every(s => s[2]) ? 'full' : ''}">
        <div class="cc-top"><span class="cc-flag">${c.flag}</span><b>${c.name}</b></div>
        <ul>
          <li>🏛️ Capital: <b>${c.capital}</b></li>
          <li>🌍 ${c.continent}</li>
          <li>👋 "${c.hello}" <small>(${c.language})</small></li>
          <li>${calls}</li>
        </ul>
        <div class="stickers">${st.map(([icon, label, got]) => `<span class="${got ? 'got' : ''}" title="${label}" aria-label="${label}${got ? ' (collected)' : ''}">${icon}</span>`).join('')}</div>
        <button class="pill small" data-go="${c.id}">Visit ▶</button>
      </div>`;
    }).join('');
  }

  // ---------- buttons ----------
  document.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.id === 'open-fly') return Trip.start();
    if (t.id === 'open-mission') return Mission.start();
    if (t.id === 'open-cards') { renderCards(); return App.openSheet('#cards'); }
    if (t.id === 'mode-quit') { if (Trip.active()) Trip.stop(); else Mission.quit(); return; }
    if (t.id === 'mode-action') return Trip.active() ? Trip.action() : Mission.hint();
    if (t.id === 'trip-again') return Trip.start();
    if (t.id === 'trip-visit') return Trip.visit();
    if (t.dataset.mchoice) return Mission.answer(+t.dataset.mchoice, t);
    if (t.id === 'mission-go') return Mission.go();
    if (t.id === 'mission-next') { App.closeSheet($('#mission')); return Mission.start(); }
    if (t.dataset.go) { App.closeSheet($('#cards')); return Globe.visit(byId[t.dataset.go]); }
  });
})();
