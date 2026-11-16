// Draws a fire engine, police car or ambulance as an SVG, painted in a country's colours.
// livery: { body, top?, band:[colour, colour?], pattern:'stripe'|'checks'|'doors'|'split',
//           lights:[left, right], text, textColor, symbol? }
window.vehicleSVG = (() => {
  let count = 0;
  const OUT = 'stroke="#0b1220" stroke-opacity=".55" stroke-width="2.5" stroke-linejoin="round"';

  const SHAPES = {
    police: {
      body: '<path d="M30,140 Q30,112 60,108 L110,104 L150,70 Q156,64 168,64 L250,64 Q262,64 270,70 L312,104 L350,110 Q374,114 374,138 L374,150 Q374,156 368,156 L36,156 Q30,156 30,150 Z"/>',
      windows: ['M160,73 L206,73 L206,102 L124,102 Z', 'M214,73 L254,73 L293,102 L214,102 Z'],
      wheels: [105, 300],
      stripes: [[107, 8], [117, 4]],
      checks: [106, 12],
      text: [212, 142, 16, 74],
      bar: [186, 52, 58, 12],
    },
    ems: {
      body: '<rect x="30" y="50" width="242" height="106" rx="10"/><path d="M266,82 L318,82 Q330,82 338,94 L358,120 Q374,124 374,140 L374,150 Q374,156 368,156 L266,156 Z"/>',
      windows: ['M282,90 L316,90 Q324,90 329,98 L343,119 L282,119 Z'],
      wheels: [95, 312],
      stripes: [[124, 10], [136, 5]],
      checks: [122, 13],
      text: [168, 98, 21, 150],
      bar: [222, 38, 42, 12],
    },
    fire: {
      body: '<rect x="30" y="76" width="244" height="80" rx="6"/><path d="M268,66 L338,66 Q350,66 355,78 L371,118 Q374,124 374,136 L374,150 Q374,156 368,156 L268,156 Z"/>',
      windows: ['M284,76 L336,76 Q342,76 345,83 L357,112 L284,112 Z'],
      wheels: [92, 312],
      stripes: [[136, 8], [146, 4]],
      checks: [134, 11],
      text: [150, 94, 15, 200],
      bar: [290, 54, 50, 12],
    },
  };

  function paint(kind, lv, clip) {
    const S = SHAPES[kind], band = lv.band || [];
    let s = '';
    if (lv.pattern === 'doors') {
      s += `<rect x="128" y="50" width="172" height="120" fill="${band[0]}"/>`;
    } else if (lv.pattern === 'split') {
      s += `<rect x="20" y="40" width="370" height="80" fill="${band[0]}"/>`;
    } else if (lv.pattern === 'checks') {
      const [y, size] = S.checks;
      for (let row = 0; row < 2; row++) {
        for (let i = 0, x = 24; x < 380; x += size * 1.6, i++) {
          s += `<rect x="${x}" y="${y + row * size}" width="${size * 1.6}" height="${size}" fill="${band[(i + row) % 2]}"/>`;
        }
      }
    } else {
      band.forEach((colour, i) => {
        const [y, h] = S.stripes[i] || [];
        if (y) s += `<rect x="20" y="${y}" width="370" height="${h}" fill="${colour}"/>`;
      });
    }
    if (kind === 'fire' && lv.top) s += `<rect x="262" y="60" width="120" height="13" fill="${lv.top}"/>`;
    return `<g clip-path="url(#${clip})">${s}</g>`;
  }

  function extras(kind, lv) {
    if (kind === 'fire') {
      let s = `<rect x="34" y="58" width="218" height="12" rx="3" fill="#dfe4ea" ${OUT}/>`;
      for (let x = 50; x < 250; x += 18) s += `<line x1="${x}" y1="58" x2="${x}" y2="70" stroke="#7b8696" stroke-width="2.5"/>`;
      s += '<rect x="60" y="70" width="8" height="6" fill="#7b8696"/><rect x="220" y="70" width="8" height="6" fill="#7b8696"/>';
      for (const x of [44, 118, 192]) {
        s += `<rect x="${x}" y="100" width="66" height="30" rx="3" fill="#cfd6de" ${OUT}/>`;
        for (let y = 108; y < 130; y += 7) s += `<line x1="${x + 3}" y1="${y}" x2="${x + 63}" y2="${y}" stroke="#97a1af" stroke-width="1.5"/>`;
      }
      return s;
    }
    if (kind === 'ems' && lv.symbol) {
      let s = '';
      for (const a of [0, 60, 120]) s += `<rect x="71" y="72" width="10" height="36" rx="2" fill="${lv.symbol}" transform="rotate(${a} 76 90)"/>`;
      return s + `<rect x="40" y="42" width="22" height="9" rx="4" fill="${lv.lights[0]}" class="lamp lamp-a" ${OUT}/>`;
    }
    return '';
  }

  return (kind, lv) => {
    const S = SHAPES[kind], id = 'veh' + (++count);
    const [tx, ty, tsize, twidth] = S.text;
    const len = [...lv.text].length;
    const size = Math.min(tsize, twidth / (len * 0.66));
    const [bx, by, bw, bh] = S.bar;
    const wheels = S.wheels.map(x =>
      `<circle cx="${x}" cy="156" r="24" fill="#16181d"/><circle cx="${x}" cy="156" r="12" fill="#c9d1da"/><circle cx="${x}" cy="156" r="4" fill="#5d6673"/>`).join('');
    const windows = S.windows.map(d => `<path d="${d}" fill="#9fd8ff" ${OUT}/><path d="${d}" fill="url(#${id}g)"/>`).join('');
    return `
<svg viewBox="0 0 404 196" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${kind} vehicle">
  <defs>
    <clipPath id="${id}">${S.body}</clipPath>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <ellipse cx="202" cy="182" rx="178" ry="9" fill="#000" opacity=".28"/>
  <ellipse class="glow glow-a" cx="${bx + bw * 0.25}" cy="${by + 2}" rx="46" ry="34" fill="${lv.lights[0]}"/>
  <ellipse class="glow glow-b" cx="${bx + bw * 0.75}" cy="${by + 2}" rx="46" ry="34" fill="${lv.lights[1]}"/>
  <g fill="${lv.body}" ${OUT}>${S.body}</g>
  ${paint(kind, lv, id)}
  <g fill="none" ${OUT}>${S.body}</g>
  ${extras(kind, lv)}
  ${windows}
  <rect x="${bx}" y="${by}" width="${bw / 2}" height="${bh}" rx="5" fill="${lv.lights[0]}" class="lamp lamp-a" ${OUT}/>
  <rect x="${bx + bw / 2}" y="${by}" width="${bw / 2}" height="${bh}" rx="5" fill="${lv.lights[1]}" class="lamp lamp-b" ${OUT}/>
  <rect x="364" y="122" width="10" height="12" rx="3" fill="#fff3b0"/>
  <rect x="30" y="122" width="7" height="12" rx="3" fill="#ff3b3b"/>
  <text x="${tx}" y="${ty}" text-anchor="middle" font-size="${size.toFixed(1)}" font-weight="900" fill="${lv.textColor}" font-family="ui-rounded, 'Arial Rounded MT Bold', 'Helvetica Neue', Arial, sans-serif" letter-spacing=".5">${lv.text}</text>
  ${wheels}
</svg>`;
  };
})();
