// All the countries, vehicles and sounds in the app.
//
// REAL RECORDINGS: a sound with  file: 'audio/name.m4a'  plays that recording instead of the
// synthesized recipe (the recipe stays as the backup if the file cannot load).
//   loop: [start, end]  are the times in seconds the recording repeats between.
//   once: true          plays the recording through one time instead (for drive-past clips).
// Use .m4a or .mp3 so it plays on an iPad, and add the source to CREDITS at the bottom.
//
// TO ADD A COUNTRY: copy one of the blocks below. "iso" is the country's ISO 3166
// numeric code (it lights the country up on the globe) and "pin" is [longitude, latitude].

(() => {
  // ---- sound recipes -------------------------------------------------------
  const sweep = (lo, hi, up, down, extra) => ({ layers: [{ type: 'sweep', lo, hi, up, down, ...extra }] });
  const tones = (seq, extra) => ({ layers: [{ type: 'tones', seq, ...extra }] });
  const horn = (freqs, pattern, extra) => ({ layers: [{ type: 'horn', freqs, pattern, ...extra }] });

  const R = {
    wail:      sweep(560, 1400, 1.9, 2.9),
    wailSlow:  sweep(520, 1320, 2.4, 3.4),
    yelp:      sweep(600, 1400, 0.13, 0.2),
    yelpFast:  sweep(650, 1500, 0.1, 0.16),
    phaser:    sweep(750, 1550, 0.03, 0.045),
    rumble:    sweep(170, 400, 0.13, 0.2, { lp: 900, peak: 300, gain: 0.22 }),
    hiLo:      tones([[540, 0.55], [720, 0.55]]),
    airHorn:   horn([220, 277], [[1.3, 0.3], [0.45, 0.25], [1.9, 0.9]], { gain: 0.16 }),
    bullHorn:  horn([330, 415], [[0.35, 0.2], [0.35, 0.9]], { lp: 3000, peak: 1100, gain: 0.16 }),
    mech:      { layers: [{ type: 'mech', hi: 1050, mid: 380, up: 2.8, hold: 1.4, down: 4.2, gain: 0.34 }] },
    ukTwoTone: tones([[700, 0.5], [560, 0.5]]),
  };

  // ---- shared looks ---------------------------------------------------------
  const RED = '#d9252a', WHITE = '#f7f9fc', BLUE = '#1f6fff', AMBER = '#ffb300';
  const snd = (id, name, icon, says, recipe) => ({ id, name, icon, says, ...recipe });
  const real = (recipe, file, loop) => ({ ...recipe, file: 'audio/' + file, loop });
  const once = (recipe, file) => ({ ...recipe, file: 'audio/' + file, once: true });
  const dutchThree = tones([[689, 0.7], [588, 0.7], [689, 0.7], [408, 0.7]], { wave: 'sawtooth', lp: 2600 });
  const dutchTwo = tones([[377, 0.75], [505, 0.75]], { wave: 'sawtooth', lp: 2600 });

  window.COUNTRIES = [
    {
      id: 'us', iso: '840', name: 'USA', flag: '🇺🇸', pin: [-98, 39],
      fact: 'Big American fire trucks have a loud air horn AND a spinning mechanical siren.',
      services: {
        fire: {
          label: 'Fire Department', call: '911',
          livery: { body: RED, top: WHITE, band: ['#ffd23f'], pattern: 'stripe', lights: [RED, WHITE], text: 'FIRE', textColor: '#ffd23f' },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', real(R.wail, 'usa-fire-wail.m4a', [0.09, 4.96])),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', real(R.yelp, 'usa-fire-yelp.m4a', [0.1, 2.746])),
            snd('mech', 'Mechanical Siren', '🌀', 'Rrrrr-EEEEE', R.mech),
            snd('horn', 'Air Horn', '📯', 'HOOONK!', R.airHorn),
          ],
        },
        police: {
          label: 'Police', call: '911',
          livery: { body: '#16181d', band: [WHITE], pattern: 'doors', lights: [RED, BLUE], text: 'POLICE', textColor: '#16181d' },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wail),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelp),
            snd('phaser', 'Phaser', '✨', 'Pew-pew-pew', R.phaser),
            snd('rumble', 'Rumble', '💥', 'Brrr-brrr', R.rumble),
            snd('horn', 'Bull Horn', '📯', 'Bap! Bap!', R.bullHorn),
          ],
        },
        ems: {
          label: 'Ambulance (EMS)', call: '911',
          livery: { body: WHITE, band: ['#ff7a1a'], pattern: 'stripe', lights: [RED, WHITE], text: 'AMBULANCE', textColor: '#1f4fd8', symbol: '#1f4fd8' },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wail),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelp),
            snd('hilo', 'Hi-Lo', '🎵', 'Dee-doo', R.hiLo),
            snd('horn', 'Air Horn', '📯', 'HOOONK!', R.airHorn),
          ],
        },
      },
    },
    {
      id: 'ca', iso: '124', name: 'Canada', flag: '🇨🇦', pin: [-106, 57],
      fact: 'Canada\'s most famous police are the Mounties. They sometimes ride horses!',
      services: {
        fire: {
          label: 'Fire Rescue', call: '911',
          livery: { body: RED, band: [WHITE, '#ffd23f'], pattern: 'stripe', lights: [RED, WHITE], text: 'FIRE', textColor: WHITE },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wailSlow),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelp),
            snd('horn', 'Air Horn', '📯', 'HOOONK!', R.airHorn),
          ],
        },
        police: {
          label: 'Police', call: '911',
          livery: { body: WHITE, band: ['#1f4fd8', RED], pattern: 'stripe', lights: [RED, BLUE], text: 'POLICE', textColor: '#1f4fd8' },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wailSlow),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelp),
            snd('phaser', 'Phaser', '✨', 'Pew-pew-pew', R.phaser),
          ],
        },
        ems: {
          label: 'Paramedics', call: '911',
          livery: { body: WHITE, band: ['#ff7a1a', '#1f4fd8'], pattern: 'stripe', lights: [RED, WHITE], text: 'PARAMEDIC', textColor: '#1f4fd8', symbol: '#1f4fd8' },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wailSlow),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelp),
            snd('hilo', 'Hi-Lo', '🎵', 'Dee-doo', R.hiLo),
          ],
        },
      },
    },
    {
      id: 'mx', iso: '484', name: 'Mexico', flag: '🇲🇽', pin: [-102, 23],
      fact: 'In Mexico, firefighters are called "Bomberos".',
      services: {
        fire: {
          label: 'Bomberos', call: '911',
          livery: { body: RED, band: ['#ffd23f'], pattern: 'stripe', lights: [RED, RED], text: 'BOMBEROS', textColor: WHITE },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wail),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelpFast),
            snd('horn', 'Air Horn', '📯', 'HOOONK!', R.airHorn),
          ],
        },
        police: {
          label: 'Policía', call: '911',
          livery: { body: '#15306b', band: [WHITE], pattern: 'stripe', lights: [RED, BLUE], text: 'POLICÍA', textColor: WHITE },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wail),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelpFast),
            snd('hilo', 'Hi-Lo', '🎵', 'Dee-doo', R.hiLo),
          ],
        },
        ems: {
          label: 'Ambulancia', call: '911',
          livery: { body: WHITE, band: [RED], pattern: 'stripe', lights: [RED, WHITE], text: 'AMBULANCIA', textColor: RED, symbol: RED },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wail),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelpFast),
            snd('hilo', 'Hi-Lo', '🎵', 'Dee-doo', R.hiLo),
          ],
        },
      },
    },
    {
      id: 'br', iso: '076', name: 'Brazil', flag: '🇧🇷', pin: [-52, -10],
      fact: 'Brazil has three numbers: 190 for police, 192 for ambulance and 193 for fire.',
      services: {
        fire: {
          label: 'Bombeiros', call: '193',
          livery: { body: RED, band: [WHITE], pattern: 'stripe', lights: [RED, RED], text: 'BOMBEIROS', textColor: WHITE },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wailSlow),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelp),
            snd('horn', 'Air Horn', '📯', 'HOOONK!', R.airHorn),
          ],
        },
        police: {
          label: 'Polícia', call: '190',
          livery: { body: WHITE, band: ['#1c3f94', '#ffd23f'], pattern: 'stripe', lights: [RED, RED], text: 'POLÍCIA', textColor: '#1c3f94' },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wailSlow),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelp),
            snd('hilo', 'Hi-Lo', '🎵', 'Dee-doo', R.hiLo),
          ],
        },
        ems: {
          label: 'SAMU', call: '192',
          livery: { body: WHITE, band: ['#ff7a1a', RED], pattern: 'stripe', lights: [RED, RED], text: 'SAMU 192', textColor: RED, symbol: RED },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wailSlow),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelp),
            snd('hilo', 'Hi-Lo', '🎵', 'Dee-doo', R.hiLo),
          ],
        },
      },
    },
    {
      id: 'gb', iso: '826', name: 'United Kingdom', flag: '🇬🇧', pin: [-2, 54],
      fact: 'British emergency vehicles wear bright checks and flash blue lights. People say sirens go "Nee-Naw!"',
      services: {
        fire: {
          label: 'Fire & Rescue', call: '999',
          livery: { body: RED, band: ['#f6e500', RED], pattern: 'checks', lights: [BLUE, BLUE], text: 'FIRE', textColor: WHITE },
          sounds: [
            snd('twotone', 'Two-Tone', '🎶', 'Nee-naw', R.ukTwoTone),
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', sweep(600, 1500, 1.6, 2.4)),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelpFast),
            snd('horn', 'Bull Horn', '📯', 'Bap! Bap!', R.bullHorn),
          ],
        },
        police: {
          label: 'Police', call: '999',
          livery: { body: WHITE, band: ['#f6e500', '#1f5fd0'], pattern: 'checks', lights: [BLUE, BLUE], text: 'POLICE', textColor: '#16181d' },
          sounds: [
            snd('twotone', 'Two-Tone', '🎶', 'Nee-naw', R.ukTwoTone),
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', sweep(600, 1500, 1.6, 2.4)),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelpFast),
            snd('phaser', 'Phaser', '✨', 'Pew-pew-pew', R.phaser),
          ],
        },
        ems: {
          label: 'Ambulance', call: '999',
          livery: { body: '#f6e500', band: ['#f6e500', '#1f9d55'], pattern: 'checks', lights: [BLUE, BLUE], text: 'AMBULANCE', textColor: '#14532d', symbol: '#1f9d55' },
          sounds: [
            snd('twotone', 'Two-Tone', '🎶', 'Nee-naw', R.ukTwoTone),
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', sweep(600, 1500, 1.6, 2.4)),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelpFast),
          ],
        },
      },
    },
    {
      id: 'fr', iso: '250', name: 'France', flag: '🇫🇷', pin: [2.5, 46.5],
      fact: 'In France each service has its own two notes. Firefighters go a slow "Pin... Pon..."',
      services: {
        fire: {
          label: 'Pompiers', call: '18',
          livery: { body: RED, band: ['#f6e500'], pattern: 'stripe', lights: [BLUE, BLUE], text: 'POMPIERS', textColor: WHITE },
          sounds: [
            snd('pinpon', 'Pin-Pon', '🎶', 'Pin... Pon...', tones([[435, 1.0], [488, 1.0]], { wave: 'sawtooth', lp: 2600 })),
            snd('horn', 'Air Horn', '📯', 'HOOONK!', R.airHorn),
          ],
        },
        police: {
          label: 'Police', call: '17',
          livery: { body: WHITE, band: ['#1c3f94', RED], pattern: 'stripe', lights: [BLUE, BLUE], text: 'POLICE', textColor: '#1c3f94' },
          sounds: [
            snd('police', 'Police Two-Tone', '🎶', 'Pin-pon-pin-pon', tones([[435, 0.5], [580, 0.5]])),
            snd('gendarme', 'Gendarmerie', '🎵', 'Dee-DAH-dee-DAH', real(tones([[437, 0.55], [734, 0.55]]), 'france-gendarmerie.m4a', [0.1, 11.02])),
          ],
        },
        ems: {
          label: 'SAMU', call: '15',
          livery: { body: WHITE, band: ['#1c3f94'], pattern: 'stripe', lights: [BLUE, BLUE], text: 'SAMU', textColor: '#1c3f94', symbol: '#1c3f94' },
          sounds: [
            snd('samu', 'SAMU Two-Tone', '🎶', 'Dee-daa-dee-daa', real(tones([[435, 0.5], [651, 0.5]]), 'france-ambulance-two-tone.m4a', [0.05, 7.05])),
            snd('three', 'Three-Tone', '🎵', 'La-lee-la ... (rest)', real(tones([[420, 0.19], [516, 0.19], [420, 0.19], [0, 1.43]]), 'france-ambulance-three-tone.m4a', [0.05, 8.05])),
          ],
        },
      },
    },
    {
      id: 'de', iso: '276', name: 'Germany', flag: '🇩🇪', pin: [10.5, 51],
      fact: 'The German two-tone horn is called the "Martinshorn". Germans say it goes "Tatü-Tata!"',
      services: {
        fire: {
          label: 'Feuerwehr', call: '112',
          livery: { body: RED, band: ['#f6e500', WHITE], pattern: 'stripe', lights: [BLUE, BLUE], text: 'FEUERWEHR', textColor: WHITE },
          sounds: [
            snd('air', 'Martinshorn (air)', '📯', 'Taa-TÜÜ-taa-TAA', real(
              tones([[513, 1.9], [384, 1.65], [513, 1.8], [384, 1.65], [0, 1.7]], { wave: 'sawtooth', lp: 2400, peak: 800, gain: 0.34 }),
              'germany-fire-martinshorn.m4a', [0.1, 8.84])),
            snd('city', 'City Horn', '🎶', 'Tatü-tata', tones([[410, 0.75], [547, 0.75]])),
          ],
        },
        police: {
          label: 'Polizei', call: '110',
          livery: { body: '#c9d1da', band: ['#1f5fd0'], pattern: 'stripe', lights: [BLUE, BLUE], text: 'POLIZEI', textColor: '#1f5fd0' },
          sounds: [
            snd('city', 'City Horn', '🎶', 'Tatü-tata', real(tones([[458, 0.73], [611, 0.73]]), 'germany-police-martinshorn.m4a', [0.1, 11.8])),
            snd('country', 'Country Horn', '🎵', 'Taa-tüü (deeper)', tones([[362, 0.75], [483, 0.75]], { wave: 'sawtooth', lp: 2400, gain: 0.34 })),
          ],
        },
        ems: {
          label: 'Rettungsdienst', call: '112',
          livery: { body: WHITE, band: ['#ff5a1f', '#f6e500'], pattern: 'stripe', lights: [BLUE, BLUE], text: 'RETTUNG', textColor: '#ff5a1f', symbol: '#1f5fd0' },
          sounds: [
            snd('city', 'City Horn', '🎶', 'Tatü-tata', tones([[410, 0.75], [547, 0.75]])),
            snd('country', 'Country Horn', '🎵', 'Taa-tüü (deeper)', tones([[362, 0.75], [483, 0.75]], { wave: 'sawtooth', lp: 2400, gain: 0.34 })),
          ],
        },
      },
    },
    {
      id: 'it', iso: '380', name: 'Italy', flag: '🇮🇹', pin: [12.5, 42.5],
      fact: 'Italian firefighters are called "Vigili del Fuoco", the watchers of the fire.',
      services: {
        fire: {
          label: 'Vigili del Fuoco', call: '115',
          livery: { body: RED, band: [WHITE], pattern: 'stripe', lights: [BLUE, BLUE], text: '115', textColor: WHITE },
          sounds: [
            snd('bitonale', 'Two-Tone', '🎶', 'Nii-noo-nii-noo', tones([[392, 0.6], [660, 0.6]], { wave: 'sawtooth', lp: 2600 })),
            snd('horn', 'Air Horn', '📯', 'HOOONK!', R.airHorn),
          ],
        },
        police: {
          label: 'Polizia', call: '113',
          livery: { body: '#3f8fe0', band: [WHITE], pattern: 'stripe', lights: [BLUE, BLUE], text: 'POLIZIA', textColor: '#0b2a6b' },
          sounds: [
            snd('bitonale', 'Police Two-Tone', '🎶', 'Dee-doo-dee-doo', tones([[466, 0.38], [622, 0.38]])),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelp),
          ],
        },
        ems: {
          label: 'Ambulanza', call: '118',
          livery: { body: WHITE, band: ['#ff7a1a'], pattern: 'stripe', lights: [BLUE, BLUE], text: 'AMBULANZA', textColor: '#ff5a1f', symbol: '#1f5fd0' },
          sounds: [
            snd('bitonale', 'Two-Tone', '🎶', 'Nii-noo-nii-noo', tones([[392, 0.45], [660, 0.45]])),
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wailSlow),
          ],
        },
      },
    },
    {
      id: 'jp', iso: '392', name: 'Japan', flag: '🇯🇵', pin: [138.5, 36.5],
      fact: 'Japanese ambulances sing "Pii-Poo, Pii-Poo" and fire engines ring a bell: "Kan! Kan!"',
      services: {
        fire: {
          label: '消防 · Fire', call: '119',
          livery: { body: RED, band: [WHITE], pattern: 'stripe', lights: [RED, RED], text: '消防', textColor: WHITE },
          sounds: [
            snd('bell', 'Siren + Bell', '🔔', 'Uuuuu... Kan! Kan!', { layers: [
              { type: 'sweep', lo: 420, hi: 850, up: 2.2, down: 3.2, gain: 0.24 },
              { type: 'bell', freq: 1250, pattern: [0.55, 0.55, 1.1], delay: 0.6 },
            ] }),
            snd('siren', 'Siren', '🌊', 'Uuuuu-uuuu', sweep(420, 850, 2.2, 3.2)),
            snd('kan', 'Bell', '🛎️', 'Kan! Kan! Kan!', { layers: [{ type: 'bell', freq: 1250, pattern: [0.55, 0.55, 1.1], gain: 0.5 }] }),
          ],
        },
        police: {
          label: '警察 · Police', call: '110',
          livery: { body: '#16181d', band: [WHITE], pattern: 'split', lights: [RED, RED], text: '警察', textColor: WHITE },
          sounds: [
            snd('siren', 'Patrol Siren', '🌊', 'Uuuuu-uuuu', sweep(430, 870, 1.5, 2.5)),
            snd('fast', 'Fast Siren', '⚡', 'Uu-uu-uu', sweep(500, 870, 0.25, 0.35)),
          ],
        },
        ems: {
          label: '救急 · Ambulance', call: '119',
          livery: { body: WHITE, band: [RED], pattern: 'stripe', lights: [RED, RED], text: '救急', textColor: RED, symbol: '#1f5fd0' },
          sounds: [
            snd('piipoo', 'Pii-Poo', '🎶', 'Pii-poo, pii-poo', tones([[960, 0.65], [770, 0.65]], { wave: 'triangle', lp: 4200, peak: 900, gain: 0.28 })),
          ],
        },
      },
    },
    {
      id: 'au', iso: '036', name: 'Australia', flag: '🇦🇺', pin: [134, -25],
      fact: 'In Australia you call "Triple Zero" (000) for help.',
      services: {
        fire: {
          label: 'Fire & Rescue', call: '000',
          livery: { body: RED, band: ['#f6e500', RED], pattern: 'checks', lights: [RED, BLUE], text: 'FIRE', textColor: WHITE },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wail),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelp),
            snd('horn', 'Air Horn', '📯', 'HOOONK!', R.airHorn),
          ],
        },
        police: {
          label: 'Police', call: '000',
          livery: { body: WHITE, band: [WHITE, '#1f5fd0'], pattern: 'checks', lights: [RED, BLUE], text: 'POLICE', textColor: '#1c3f94' },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wail),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelp),
            snd('hilo', 'Hi-Lo', '🎵', 'Dee-doo', R.hiLo),
          ],
        },
        ems: {
          label: 'Ambulance', call: '000',
          livery: { body: WHITE, band: [WHITE, RED], pattern: 'checks', lights: [RED, WHITE], text: 'AMBULANCE', textColor: RED, symbol: RED },
          sounds: [
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', R.wail),
            snd('yelp', 'Yelp', '⚡', 'Wup-wup-wup', R.yelp),
            snd('hilo', 'Hi-Lo', '🎵', 'Dee-doo', R.hiLo),
          ],
        },
      },
    },
    // ---- countries below have real recordings only, so they show just the services that were recorded ----
    {
      id: 'si', iso: '705', name: 'Slovenia', flag: '🇸🇮', pin: [14.8, 46.1],
      fact: 'Slovenian police cars say "POLICIJA". These sirens were recorded at the traffic police station in Ljubljana.',
      services: {
        police: {
          label: 'Policija', call: '113',
          livery: { body: WHITE, band: ['#1c3f94'], pattern: 'stripe', lights: [BLUE, BLUE], text: 'POLICIJA', textColor: '#1c3f94' },
          sounds: [
            snd('main', 'Main Siren', '⚡', 'Wee-oo-wee-oo', real(sweep(551, 959, 0.2, 0.17), 'slovenia-police-siren-1.m4a', [0.1, 3.075])),
            snd('hilo', 'Hi-Lo', '🎶', 'Dee-doo', real(tones([[538, 0.76], [747, 0.76]]), 'slovenia-police-siren-2.m4a', [0.1, 12.24])),
            snd('wail', 'Wail', '🌊', 'Weeee-ooooo', real(sweep(544, 1040, 1.9, 4.1), 'slovenia-police-siren-3.m4a', [0.1, 6.09])),
            snd('bike', 'Police Motorbike', '🏍️', 'Dee-doo (on two wheels)', real(tones([[485, 0.75], [621, 0.75]]), 'slovenia-police-motorbike.m4a', [0.1, 9.1])),
          ],
        },
      },
    },
    {
      id: 'fi', iso: '246', name: 'Finland', flag: '🇫🇮', pin: [26, 64],
      fact: 'Finnish fire engines say "Pelastuslaitos", which means rescue department.',
      services: {
        fire: {
          label: 'Pelastuslaitos · Fire', call: '112',
          livery: { body: RED, band: ['#f6e500'], pattern: 'stripe', lights: [BLUE, BLUE], text: 'PELASTUSLAITOS', textColor: WHITE },
          sounds: [
            snd('engine', 'Fire Engine', '🎶', 'Daa-dee-daa-dee', real(tones([[374, 0.93], [501, 0.93]], { wave: 'sawtooth', lp: 2600 }), 'finland-fire-engine.m4a', [0.1, 11.27])),
            snd('chief', "Fire Chief's Van", '🎵', 'Daa-dee (a bit higher)', real(tones([[394, 0.96], [525, 0.96]]), 'finland-fire-chief-van.m4a', [0.1, 11.61])),
          ],
        },
      },
    },
    {
      id: 'se', iso: '752', name: 'Sweden', flag: '🇸🇪', pin: [15.5, 61],
      fact: 'This siren comes from a fire truck built in 1958. It now lives in a fire brigade museum in Sweden.',
      services: {
        fire: {
          label: 'Brandkår · Fire', call: '112',
          livery: { body: RED, band: [WHITE], pattern: 'stripe', lights: [BLUE, BLUE], text: 'BRANDKÅR', textColor: WHITE },
          sounds: [
            snd('old', '1958 Fire Truck', '🎶', 'Dee-daa-dee-daa', real(tones([[424, 0.9], [580, 0.9]], { wave: 'sawtooth', lp: 2600 }), 'sweden-fire-1958.m4a', [0.1, 11.01])),
          ],
        },
      },
    },
    {
      id: 'nl', iso: '528', name: 'Netherlands', flag: '🇳🇱', pin: [5.3, 52.2],
      fact: 'Dutch firefighters are called "Brandweer". The ambulance sounds here were recorded back in 1981!',
      services: {
        fire: {
          label: 'Brandweer', call: '112',
          livery: { body: RED, band: [WHITE, '#1f5fd0'], pattern: 'stripe', lights: [BLUE, BLUE], text: 'BRANDWEER', textColor: WHITE },
          sounds: [
            snd('pass', 'Fire Trucks Driving Past', '💨', 'Taa-tuu-taa-tuu... whoosh!', once(dutchTwo, 'netherlands-fire-passing.m4a')),
            snd('twotone', 'Two-Tone Horn', '🎶', 'Taa-tuu', dutchTwo),
          ],
        },
        ems: {
          label: 'Ambulance', call: '112',
          livery: { body: '#f6e500', band: [RED, '#1f5fd0'], pattern: 'stripe', lights: [BLUE, BLUE], text: 'AMBULANCE', textColor: '#16181d', symbol: '#1f5fd0' },
          sounds: [
            snd('pass', 'Driving Past', '💨', 'Tee-taa-tee-too... whoosh!', once(dutchThree, 'netherlands-ambulance-passing.m4a')),
            snd('arrive', 'Arriving', '🛑', 'Tee-taa-tee-too... stop!', once(dutchThree, 'netherlands-ambulance-arriving.m4a')),
            snd('inside', 'Horn From Inside', '📯', "Heard from the driver's seat", once(dutchThree, 'netherlands-ambulance-horn.m4a')),
            snd('three', 'Three-Tone Horn', '🎶', 'Tee-taa-tee-too', dutchThree),
          ],
        },
      },
    },
  ];

  // Sounds that belong to one country only. The game uses these for "Which country?" questions.
  window.SIGNATURE_SOUNDS = [
    'us/fire/mech', 'us/police/rumble',
    'gb/police/twotone', 'gb/ems/twotone',
    'fr/fire/pinpon', 'fr/police/gendarme', 'fr/ems/three',
    'de/fire/air', 'de/police/city',
    'it/ems/bitonale',
    'jp/ems/piipoo', 'jp/fire/bell', 'jp/fire/kan',
    'si/police/main', 'nl/ems/three',
  ];

  // Where the real recordings came from. Shown on the Credits screen.
  window.CREDITS = [
    { what: 'USA fire engine: Wail and Yelp', title: 'Whelen.ogg', by: 'Heggyhomolit', licence: 'CC0 1.0',
      url: 'commons.wikimedia.org/wiki/File:Whelen.ogg' },
    { what: 'Germany fire engine: Martinshorn (air)', title: 'WWS Fireenginesiren.ogg', by: 'Work With Sounds / Konrad Gutkowski',
      licence: 'CC BY 4.0 (creativecommons.org/licenses/by/4.0)', url: 'commons.wikimedia.org/wiki/File:WWS_Fireenginesiren.ogg' },
    { what: 'Germany police: City Horn', title: 'WWS Policecarsiren.ogg', by: 'Work With Sounds / Konrad Gutkowski',
      licence: 'CC BY 4.0 (creativecommons.org/licenses/by/4.0)', url: 'commons.wikimedia.org/wiki/File:WWS_Policecarsiren.ogg' },
    { what: 'France police: Gendarmerie', title: 'Gendarmerie, Outdoor Siren', by: 'BigSoundBank', licence: 'Royalty free (CC0-like)',
      url: 'bigsoundbank.com/siren-french-gendarmerie-s0886.html' },
    { what: 'France SAMU: Two-Tone', title: '2 Ton Siren', by: 'BigSoundBank', licence: 'Royalty free (CC0-like)',
      url: 'bigsoundbank.com/ambulance-siren-2-s1464.html' },
    { what: 'France SAMU: Three-Tone', title: 'Ambulance, 3 Ton Siren', by: 'BigSoundBank', licence: 'Royalty free (CC0-like)',
      url: 'bigsoundbank.com/ambulance-siren-1-s1463.html' },
    { what: 'Slovenia police: Main Siren, Wail and Police Motorbike', title: 'WWS Policevan-sirenone, WWS Policevan–sirenthree, WWS Policemotorbike–siren',
      by: 'Work With Sounds / Technical Museum of Slovenia (recordist Boštjan Troha)',
      licence: 'CC BY 4.0 (creativecommons.org/licenses/by/4.0)', url: 'commons.wikimedia.org/wiki/Category:Audio_files_from_Work_With_Sounds' },
    { what: 'Slovenia police: Hi-Lo', title: 'WWS Policevan–sirentwo', by: 'Work With Sounds / Technical Museum of Slovenia (recordist Dušan Oblak)',
      licence: 'CC BY 4.0 (creativecommons.org/licenses/by/4.0)', url: 'commons.wikimedia.org/wiki/File:WWS_Policevan8211sirentwo.ogg' },
    { what: "Finland fire: Fire Engine and Fire Chief's Van", title: "WWS Firetruck, WWS Sirenofthefirechief's van", by: 'Work With Sounds / Werstas (recordist Teemu Ahola)',
      licence: 'CC BY 4.0 (creativecommons.org/licenses/by/4.0)', url: 'commons.wikimedia.org/wiki/File:WWS_Firetruck.ogg' },
    { what: 'Sweden fire: 1958 Fire Truck', title: 'WWS FiretruckFordF600-1958–sirens', by: 'Work With Sounds / Torsten Nilsson',
      licence: 'CC BY 4.0 (creativecommons.org/licenses/by/4.0)', url: 'commons.wikimedia.org/wiki/File:WWS_FiretruckFordF600-19588211sirens.ogg' },
    { what: 'Netherlands ambulance: Driving Past, Arriving and Horn From Inside',
      title: 'Het voorbijrijden van een ambulance met sirene, Het aankomen en stoppen van een ambulance met sirene, Hoorn van een ambulance',
      by: 'Beeld en Geluid (Netherlands Institute for Sound and Vision), 1981',
      licence: 'CC BY-SA 3.0 (creativecommons.org/licenses/by-sa/3.0). These three trimmed clips are shared under the same licence.',
      url: 'commons.wikimedia.org/wiki/Category:Sounds_from_Geluid_van_Nederland_to_be_checked' },
    { what: 'Netherlands fire: Fire Trucks Driving Past', title: 'Brandweerwagens passeren met sirene', by: 'GvNL-Steim Workshop (recorded by Robin Koek)',
      licence: 'CC BY 3.0 (creativecommons.org/licenses/by/3.0)',
      url: 'commons.wikimedia.org/wiki/File:Brandweerwagens_passeren_met_sirene_-_SoundCloud_-_GvNL-Steim_Workshop.ogg' },
  ];

  // Facts for the Country Cards, Fly There and Rescue Missions.
  // city = [longitude, latitude] of the capital; tz = its time zone.
  const FACTS = {
    us: { capital: 'Washington, D.C.', city: [-77.04, 38.9], continent: 'North America', language: 'English', hello: 'Hello', tz: 'America/New_York' },
    ca: { capital: 'Ottawa', city: [-75.7, 45.42], continent: 'North America', language: 'English and French', hello: 'Hello / Bonjour', tz: 'America/Toronto' },
    mx: { capital: 'Mexico City', city: [-99.13, 19.43], continent: 'North America', language: 'Spanish', hello: 'Hola', tz: 'America/Mexico_City' },
    br: { capital: 'Brasília', city: [-47.93, -15.78], continent: 'South America', language: 'Portuguese', hello: 'Olá', tz: 'America/Sao_Paulo' },
    gb: { capital: 'London', city: [-0.13, 51.5], continent: 'Europe', language: 'English', hello: 'Hello', tz: 'Europe/London' },
    fr: { capital: 'Paris', city: [2.35, 48.86], continent: 'Europe', language: 'French', hello: 'Bonjour', tz: 'Europe/Paris' },
    de: { capital: 'Berlin', city: [13.4, 52.52], continent: 'Europe', language: 'German', hello: 'Hallo', tz: 'Europe/Berlin' },
    it: { capital: 'Rome', city: [12.5, 41.9], continent: 'Europe', language: 'Italian', hello: 'Ciao', tz: 'Europe/Rome' },
    jp: { capital: 'Tokyo', city: [139.69, 35.68], continent: 'Asia', language: 'Japanese', hello: 'Konnichiwa', tz: 'Asia/Tokyo' },
    au: { capital: 'Canberra', city: [149.13, -35.28], continent: 'Oceania', language: 'English', hello: "G'day", tz: 'Australia/Sydney' },
    si: { capital: 'Ljubljana', city: [14.51, 46.05], continent: 'Europe', language: 'Slovenian', hello: 'Živjo', tz: 'Europe/Ljubljana' },
    fi: { capital: 'Helsinki', city: [24.94, 60.17], continent: 'Europe', language: 'Finnish', hello: 'Hei', tz: 'Europe/Helsinki' },
    se: { capital: 'Stockholm', city: [18.07, 59.33], continent: 'Europe', language: 'Swedish', hello: 'Hej', tz: 'Europe/Stockholm' },
    nl: { capital: 'Amsterdam', city: [4.9, 52.37], continent: 'Europe', language: 'Dutch', hello: 'Hallo', tz: 'Europe/Amsterdam' },
  };
  for (const c of window.COUNTRIES) Object.assign(c, FACTS[c.id]);

  window.SERVICES = [
    { id: 'fire', emoji: '🚒', word: 'Fire' },
    { id: 'police', emoji: '🚓', word: 'Police' },
    { id: 'ems', emoji: '🚑', word: 'Ambulance' },
  ];
})();
