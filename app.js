/* =========================================================
   POKÉMON REAL-LIFE RPG - APP.JS
   Zentrale Logik-Datei (Strukturiert)
   ========================================================= */

/* =========================================================
   1. SETUP & SYSTEM
   ========================================================= */

// Service Worker Registrierung (PWA Caching aktivieren)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registriert', reg))
      .catch(err => console.log('Service Worker Fehler', err));
  });
}

// Globale Audio-Kontext Verwaltung
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioCtx = new AudioCtx();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx) {
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch(e){}
  }
}

// Zentrale Haptic Feedback (Vibration) Funktion
function triggerVibration(pattern = 50) {
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body: body, icon: 'https://upload.wikimedia.org/wikipedia/commons/9/98/International_Pok%C3%A9mon_logo.svg' });
  }
}


/* =========================================================
   2. DATENBANKEN & VARIABLEN
   ========================================================= */

const EVOLUTION_CHAINS = {
  "Glumanda": { next: "Glutexo", cardUrl: "https://images.pokemontcg.io/base1/24_hires.png", hpBonus: 20, requiredMaxHp: 80 },
  "Glutexo":  { next: "Glurak",  cardUrl: "https://images.pokemontcg.io/base1/4_hires.png",  hpBonus: 35, requiredMaxHp: 120 },
  "Bisasam":  { next: "Bisaknosp", cardUrl: "https://images.pokemontcg.io/base1/30_hires.png", hpBonus: 20, requiredMaxHp: 80 },
  "Bisaknosp":{ next: "Bisaflor",  cardUrl: "https://images.pokemontcg.io/base1/15_hires.png", hpBonus: 35, requiredMaxHp: 120 },
  "Schiggy":   { next: "Schillok", cardUrl: "https://images.pokemontcg.io/base1/42_hires.png", hpBonus: 20, requiredMaxHp: 80 },
  "Schillok":  { next: "Turtok",   cardUrl: "https://images.pokemontcg.io/base1/2_hires.png",  hpBonus: 35, requiredMaxHp: 120 }
};

const COMMON_POKEMON = [
  { name: "Taubsi", type: "normal", hp: 40, maxHp: 40, cardUrl: "https://images.pokemontcg.io/base1/57_hires.png", weakness: "elektro" },
  { name: "Rattfratz", type: "normal", hp: 30, maxHp: 30, cardUrl: "https://images.pokemontcg.io/base1/61_hires.png", weakness: "kampf" },
  { name: "Raupy", type: "käfer", hp: 35, maxHp: 35, cardUrl: "https://images.pokemontcg.io/base1/45_hires.png", weakness: "feuer" },
  { name: "Hornliu", type: "käfer", hp: 35, maxHp: 35, cardUrl: "https://images.pokemontcg.io/base1/69_hires.png", weakness: "feuer" }
];

const RARE_POKEMON = [
  { name: "Pikachu", type: "elektro", hp: 45, maxHp: 45, cardUrl: "https://images.pokemontcg.io/base1/58_hires.png", weakness: "boden" },
  { name: "Fukano", type: "feuer", hp: 55, maxHp: 55, cardUrl: "https://images.pokemontcg.io/base1/28_hires.png", weakness: "wasser" },
  { name: "Kleinstein", type: "gestein", hp: 60, maxHp: 60, cardUrl: "https://images.pokemontcg.io/base1/47_hires.png", weakness: "wasser" },
  { name: "Pinsir", type: "käfer", hp: 70, maxHp: 70, cardUrl: "https://images.pokemontcg.io/base1/9_hires.png", weakness: "feuer" }
];

// Menü & UI State
let selectedFlowMode = 'continue';
let activeSlot = null;
let selectedStarter = null;

// Radar State
let isScanning = false;
let scanTimer = null;
let currentScanType = 'quick';

// Training State
let isTrainingMode = false;
let trainingPartnerMon = null;

// Battle State
let currentEnemy = null;
let playerBattlePokemon = null;
let playerEnergy = 0;
let isEnemyAttacking = false;
let isPlayerTurn = true;
let pendingEvoPokemon = null;
let pendingLevelUpData = null;
let pendingKoInfo = null;
let dodgeTimer = null;
let isDodgeWindowActive = false;

// Spieler Daten
let currentSaveData = {
  level: 1,
  exp: 0,
  maxExp: 100,
  pokeballs: 10,
  pokemonTeam: [],
  pokemonBox: [],
  homePos: null
};

// Geo & Map State
let currentPosition = null;
let targetPokemonCoords = null;
let watchPositionId = null;
let currentHeading = 0;
let homeMap = null;
let homeMarker = null;
let tempHomeCoords = null;


/* =========================================================
   3. GEO-LOGIK & KARTE
   ========================================================= */

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

function calculateDestination(lat, lon, distanceMeters, bearingDegrees) {
  const R = 6371000;
  const d = distanceMeters / R;
  const brng = bearingDegrees * Math.PI / 180;
  const lat1 = lat * Math.PI / 180;
  const lon1 = lon * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: lat2 * 180 / Math.PI, lon: lon2 * 180 / Math.PI };
}

function initGPSLiveTracking() {
  if ("geolocation" in navigator) {
    watchPositionId = navigator.geolocation.watchPosition(
      (pos) => {
        currentPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
          currentHeading = pos.coords.heading;
        }
        onGPSPositionUpdated();
      },
      (err) => console.log("GPS Fehler:", err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  }
}

function requestCompassPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(response => {
      if (response === 'granted') {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }).catch(console.error);
  } else {
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    } else if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  }
}

function handleOrientation(event) {
  let heading = null;
  if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
    heading = event.webkitCompassHeading;
  } else if (event.alpha !== null) {
    heading = (360 - event.alpha) % 360;
  }
  if (heading !== null && !isNaN(heading)) {
    currentHeading = heading;
    const ringContainer = document.getElementById('radar-ring-container');
    if (ringContainer) {
      ringContainer.style.transform = `rotate(${-currentHeading}deg)`;
    }
  }
}

// Leaflet Home Map Logik
function openHomeMapModal() {
  document.getElementById('modal-home-map').classList.remove('hidden');
  const startLat = (currentSaveData && currentSaveData.homePos) ? currentSaveData.homePos.lat : (currentPosition ? currentPosition.lat : 51.1657);
  const startLon = (currentSaveData && currentSaveData.homePos) ? currentSaveData.homePos.lon : (currentPosition ? currentPosition.lon : 10.4515);
  tempHomeCoords = { lat: startLat, lon: startLon };

  setTimeout(() => {
    const container = document.getElementById('map-container');
    if (!container) return;
    if (!homeMap) {
      homeMap = L.map('map-container').setView([startLat, startLon], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(homeMap);
      homeMarker = L.marker([startLat, startLon], { draggable: true }).addTo(homeMap);
      homeMarker.on('dragend', function () {
        const position = homeMarker.getLatLng();
        tempHomeCoords = { lat: position.lat, lon: position.lng };
      });
      homeMap.on('click', function(e) {
        homeMarker.setLatLng(e.latlng);
        tempHomeCoords = { lat: e.latlng.lat, lon: e.latlng.lng };
      });
    } else {
      homeMap.setView([startLat, startLon], 16);
      homeMarker.setLatLng([startLat, startLon]);
    }
    homeMap.invalidateSize();
  }, 300);
}

function searchAddressOnMap() {
  const query = document.getElementById('map-search-input').value;
  if (!query) return;
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&contact=deine_app_email@example.com`) // Optional: Contact Header
    .then(res => res.json())
    .then(data => {
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        homeMap.setView([lat, lon], 17);
        homeMarker.setLatLng([lat, lon]);
        tempHomeCoords = { lat, lon };
      } else {
        alert("Adresse leider nicht gefunden!");
      }
    }).catch(() => alert("Fehler bei der Adresssuche."));
}

function saveHomeLocationFromMap() {
  if (tempHomeCoords) {
    currentSaveData.homePos = { ...tempHomeCoords };
    saveCurrentData();
    alert("🏠 Zuhause-Standort erfolgreich gespeichert!");
    closeHomeMapModal();
  }
}

function closeHomeMapModal() {
  document.getElementById('modal-home-map').classList.add('hidden');
}


/* =========================================================
   4. CINEMATIC INTRO
   ========================================================= */

const IntroManager = {
  active: true,
  canInteractiveFinish: false,

  init() {
    const introScreen = document.getElementById('intro-screen');
    const container = document.getElementById('introContainer') || document.querySelector('.intro-container');

    if (!introScreen || !container) {
      this.finishIntro();
      return;
    }

    const safeUnlock = () => {
      try { if (typeof unlockAudio === 'function') unlockAudio(); } catch(e){}
      try { if (typeof requestCompassPermission === 'function') requestCompassPermission(); } catch(e){}
    };

    const triggerAudio = (e) => {
      safeUnlock();
      if (this.canInteractiveFinish) {
        this.finishIntro();
      }
    };

    container.addEventListener('touchstart', triggerAudio, { passive: true });
    container.addEventListener('pointerdown', triggerAudio, { passive: true });
    container.addEventListener('click', triggerAudio, { passive: true });

    this.startCardRush();
    setTimeout(() => this.playSlashSound(), 5300);

    setTimeout(() => {
      if (!this.active) return;
      this.canInteractiveFinish = true;
      const promptEl = document.querySelector('.start-prompt');
      if (promptEl) {
        promptEl.innerText = "TIPPE AUF DEN BILDSCHIRM";
        promptEl.classList.add('show-prompt');
      }
    }, 7300);
  },

  playWhooshSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.10;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500 + Math.random() * 350, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.10);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.10);

      noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      noise.start(now);
    } catch(e){}
  },

  playSlashSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.28;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(4500, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 0.25);
      filter.Q.value = 4;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.95, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.26);

      noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      noise.start(now);
    } catch(e){}
  },

  startCardRush() {
    const cardStream = document.getElementById('cardStream') || document.querySelector('.card-stream');
    if (!cardStream) return;
    const tcgCards = [
      { tcg: 'https://images.pokemontcg.io/base1/4_hires.png', fallback: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png' },
      { tcg: 'https://images.pokemontcg.io/base1/58_hires.png', fallback: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png' },
      { tcg: 'https://images.pokemontcg.io/base1/10_hires.png', fallback: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png' },
      { tcg: 'https://images.pokemontcg.io/base1/2_hires.png', fallback: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png' },
      { tcg: 'https://images.pokemontcg.io/base1/15_hires.png', fallback: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/3.png' },
      { tcg: 'https://images.pokemontcg.io/fossil/5_hires.png', fallback: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png' }
    ];

    const cardCount = 14;
    const totalDuration = 5000;

    for (let i = 0; i < cardCount; i++) {
      setTimeout(() => {
        if (!this.active) return;
        const cardData = tcgCards[i % tcgCards.length];
        const card = document.createElement('div');
        card.className = 'tcg-card';
        card.innerHTML = `<img src="${cardData.tcg}" onerror="this.src='${cardData.fallback}';" alt="Card">`;

        const startX = (Math.random() - 0.5) * 80;
        const startY = (Math.random() - 0.5) * 60;
        const endX = (Math.random() - 0.5) * 380;
        const endY = (Math.random() - 0.5) * 320;
        const rotZ = (Math.random() - 0.5) * 22;
        const rotY = (Math.random() - 0.5) * 18;
        cardStream.appendChild(card);

        if (typeof card.animate === 'function') {
          const animation = card.animate([
            { transform: `translate3d(${startX}px, ${startY}px, -600px) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(0.3)`, opacity: 0 },
            { opacity: 1, offset: 0.15 },
            { opacity: 1, offset: 0.70 },
            { transform: `translate3d(${endX}px, ${endY}px, 400px) rotateY(${rotY * 1.5}deg) rotateZ(${rotZ * 1.5}deg) scale(1.6)`, opacity: 0 }
          ], { duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' });

          this.playWhooshSound();
          animation.onfinish = () => card.remove();
        } else {
          setTimeout(() => card.remove(), 600);
        }
      }, i * (totalDuration / cardCount));
    }
  },

  finishIntro() {
    if (!this.active) return;
    this.active = false;
    const introEl = document.getElementById('intro-screen');
    const gameScreen = document.getElementById('game-screen');
    if (introEl) {
      introEl.classList.add('fade-out');
      setTimeout(() => {
        introEl.style.display = 'none';
        if (gameScreen) gameScreen.classList.remove('hidden');
        if (typeof initApp === 'function') initApp();
      }, 500);
    }
  }
};

/* =========================================================
   5. MENÜS & SPIELSTART
   ========================================================= */

function initApp() {
  updateSlotUI();
  initGPSLiveTracking();
  requestCompassPermission();
  showScreen('screen-main-menu');
}

function updateSlotUI() {
  for (let i = 1; i <= 3; i++) {
    const data = localStorage.getItem('pokemon_rl_slot_' + i);
    const infoDiv = document.getElementById(`slot-${i}-info`);
    if (infoDiv) {
      if (data) {
        const parsed = JSON.parse(data);
        infoDiv.innerText = `Trainer Lv. ${parsed.level} | ${parsed.pokemonTeam[0]?.name || 'Kein Pokémon'}`;
      } else {
        infoDiv.innerText = "Leer";
      }
    }
  }
}

function selectFlow(mode) {
  requestCompassPermission();
  selectedFlowMode = mode;
  document.getElementById('slot-screen-title').innerText = 
    (mode === 'new') ? "Neues Spiel: Wähle Slot" : "Spiel Laden: Wähle Slot";
  showScreen('screen-slots');
}

function onSlotSelected(slotNum) {
  activeSlot = slotNum;
  const saved = localStorage.getItem('pokemon_rl_slot_' + activeSlot);

  if (selectedFlowMode === 'continue') {
    if (saved) {
      currentSaveData = JSON.parse(saved);
      if (!currentSaveData.pokemonBox) currentSaveData.pokemonBox = [];
      loadDashboard();
      showScreen('screen-radar-hud');
    } else {
      alert("Dieser Speicherplatz ist leer! Bitte starte ein Neues Spiel.");
    }
  } else {
    currentSaveData = { level: 1, exp: 0, maxExp: 100, pokeballs: 10, pokemonTeam: [], pokemonBox: [], homePos: null };
    showScreen('screen-starter');
  }
}

function showScreen(screenId) {
  const allScreens = [
    'screen-main-menu',
    'screen-slots',
    'screen-starter',
    'screen-radar-hud',
    'screen-battle'
  ];

  allScreens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  const target = document.getElementById(screenId);
  if (target) target.classList.remove('hidden');
}

function chooseStarter(type, element) {
  document.querySelectorAll('.starter-card').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
  selectedStarter = type;
  document.getElementById('confirm-starter-btn').disabled = false;
}

function confirmStarter() {
  const starters = {
    bisasam: { name: "Bisasam", type: "pflanze", level: 1, hp: 44, maxHp: 44, cardUrl: "https://images.pokemontcg.io/base1/44_hires.png", weakness: "feuer", exp: 0, maxExp: 75, attack: 9, specialAttack: 14 },
    glumanda: { name: "Glumanda", type: "feuer", level: 1, hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/base1/46_hires.png", weakness: "wasser", exp: 0, maxExp: 75, attack: 10, specialAttack: 16 },
    schiggy: { name: "Schiggy", type: "wasser", level: 1, hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/base1/63_hires.png", weakness: "pflanze", exp: 0, maxExp: 75, attack: 10, specialAttack: 16 }
  };

  currentSaveData.pokemonTeam = [starters[selectedStarter]];
  currentSaveData.pokemonBox = [];
  currentSaveData.pokeballs = 10;

  if (currentPosition) {
    currentSaveData.homePos = { ...currentPosition };
  }

  saveCurrentData();
  loadDashboard();
  showScreen('screen-radar-hud');
}

function saveCurrentData() {
  if (activeSlot) {
    localStorage.setItem('pokemon_rl_slot_' + activeSlot, JSON.stringify(currentSaveData));
  }
}

function loadDashboard() {
  document.getElementById('scan-active-mon').innerText = currentSaveData.pokemonTeam[0]?.name || '--';
  document.getElementById('menu-item-pokeballs').innerText = currentSaveData.pokeballs;
  document.getElementById('menu-trainer-level').innerText = "Level " + currentSaveData.level;

  const expPct = Math.min(100, (currentSaveData.exp / currentSaveData.maxExp) * 100);
  document.getElementById('menu-trainer-exp-bar').style.width = expPct + "%";
  document.getElementById('menu-trainer-exp-text').innerText = `${currentSaveData.exp} / ${currentSaveData.maxExp} EXP`;
  document.getElementById('menu-caught-count').innerText = currentSaveData.pokemonTeam.length + currentSaveData.pokemonBox.length;

  renderPokemonTeam();
}

function renderPokemonTeam() {
  const container = document.getElementById('pokemon-team-list');
  if (!container) return;
  container.innerHTML = `
    <h3 style="color:#ffcb05; margin-bottom:10px; font-size:16px;">Dein Team (Max. 6)</h3>
    <div id="team-cards-container" style="display:flex; flex-direction:column; gap:8px;"></div>
    <h3 style="color:#ffcb05; margin:20px 0 10px 0; font-size:16px;">Lagerbox (${currentSaveData.pokemonBox.length})</h3>
    <div id="box-cards-container" style="display:flex; flex-direction:column; gap:8px;"></div>
  `;

  const teamContainer = document.getElementById('team-cards-container');
  currentSaveData.pokemonTeam.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = "pokemon-row";
    row.style.cssText = "display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.08); padding:8px 12px; border-radius:8px;";
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${p.cardUrl}" alt="${p.name}" style="width:40px;">
        <div style="text-align:left;">
          <strong>${p.name}</strong> <span style="font-size:11px; color:#aaa;">Lv. ${p.level}</span>
          <div style="font-size:11px; color:#4cd137;">KP: ${p.hp}/${p.maxHp}</div>
        </div>
      </div>
      <div style="display:flex; gap:6px; align-items:center;">
        ${idx === 0 ? '<span class="tag-active" style="background:#ffcb05; color:#000; padding:4px 8px; border-radius:4px; font-size:10px; font-weight:bold;">Aktiv</span>' : `<button class="btn-primary" style="font-size:10px; padding:4px 8px;" onclick="setActivePokemon(${idx})">Aktiv setzen</button>`}
        ${currentSaveData.pokemonTeam.length > 1 && idx !== 0 ? `<button class="btn-primary" style="font-size:10px; padding:4px 8px; background:#e74c3c;" onclick="moveToBox(${idx})">In Box</button>` : ''}
      </div>
    `;
    teamContainer.appendChild(row);
  });

  const boxContainer = document.getElementById('box-cards-container');
  if (currentSaveData.pokemonBox.length === 0) {
    boxContainer.innerHTML = `<p style="font-size:12px; color:#888; font-style:italic;">Box ist leer.</p>`;
  } else {
    currentSaveData.pokemonBox.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = "pokemon-row";
      row.style.cssText = "display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px;";
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${p.cardUrl}" alt="${p.name}" style="width:40px;">
          <div style="text-align:left;">
            <strong>${p.name}</strong> <span style="font-size:11px; color:#aaa;">Lv. ${p.level}</span>
            <div style="font-size:11px; color:#4cd137;">KP: ${p.hp}/${p.maxHp}</div>
          </div>
        </div>
        <button class="btn-primary" style="font-size:10px; padding:4px 8px;" onclick="moveToTeam(${idx})">Ins Team</button>
      `;
      boxContainer.appendChild(row);
    });
  }
}

function setActivePokemon(index) {
  const chosen = currentSaveData.pokemonTeam.splice(index, 1)[0];
  currentSaveData.pokemonTeam.unshift(chosen);
  saveCurrentData();
  loadDashboard();
}

function moveToBox(index) {
  const mon = currentSaveData.pokemonTeam.splice(index, 1)[0];
  currentSaveData.pokemonBox.push(mon);
  saveCurrentData();
  loadDashboard();
}

function moveToTeam(index) {
  if (currentSaveData.pokemonTeam.length >= 6) {
    alert("Dein Team ist voll! (Maximal 6 Pokémon im Team).");
    return;
  }
  const mon = currentSaveData.pokemonBox.splice(index, 1)[0];
  currentSaveData.pokemonTeam.push(mon);
  saveCurrentData();
  loadDashboard();
}

function openMenuModal() {
  loadDashboard();
  document.getElementById('modal-menu').classList.remove('hidden');
}

function closeMenuModal() {
  document.getElementById('modal-menu').classList.add('hidden');
}

function switchMenuTab(tabName) {
  ['pokemon', 'items', 'exp'].forEach(t => {
    document.getElementById(`mtab-content-${t}`).classList.add('hidden');
    document.getElementById(`mtab-btn-${t}`).classList.remove('active');
  });
  document.getElementById(`mtab-content-${tabName}`).classList.remove('hidden');
  document.getElementById(`mtab-btn-${tabName}`).classList.add('active');
}

function exitToMainMenu() {
  clearTimeout(dodgeTimer);
  isDodgeWindowActive = false;
  if(typeof CatchEngine !== 'undefined') CatchEngine.stopCatchSession();
  closeMenuModal();
  cancelScan();
  saveCurrentData();
  updateSlotUI();
  showScreen('screen-main-menu');
}


/* =========================================================
   6. RADAR & SCAN
   ========================================================= */

function openScanModal() {
  requestCompassPermission();
  if (isScanning || targetPokemonCoords) {
    cancelScan();
    return;
  }
  document.getElementById('modal-scan').classList.remove('hidden');
}

function closeScanModal() {
  document.getElementById('modal-scan').classList.add('hidden');
}

function startScanProcess(type) {
  closeScanModal();
  currentScanType = type;
  isScanning = true;

  const triggerBtn = document.getElementById('btn-scan-trigger');
  const ringContainer = document.getElementById('radar-ring-container');
  const statusText = document.getElementById('radar-status-text');

  triggerBtn.innerHTML = `<span aria-hidden="true">🛑</span><span>SCAN ABBRECHEN</span>`;
  ringContainer.className = "radar-rings state-scanning";
  statusText.innerText = "Scanne Umgebung...";

  let durationMs = (type === 'quick') ? (Math.random() * 3 + 3) * 60 * 1000 : (Math.random() * 15 + 15) * 60 * 1000;

  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    triggerSignalDetected();
  }, durationMs);
}

function forceDevSpawn() {
  isScanning = false;
  currentScanType = 'quick';

  if (!currentPosition) {
    currentPosition = { lat: 51.1657, lon: 10.4515 };
  }

  const randomDistance = Math.random() * 6 + 2; 
  const randomBearing = Math.random() * 360;
  targetPokemonCoords = calculateDestination(currentPosition.lat, currentPosition.lon, randomDistance, randomBearing);

  triggerSignalDetected();
}

function triggerSignalDetected() {
  isScanning = false;
  triggerVibration([300, 100, 300]); 

  if (!targetPokemonCoords) {
    if (currentPosition) {
      const randomDistance = Math.random() * 6 + 2; 
      const randomBearing = Math.random() * 360;
      targetPokemonCoords = calculateDestination(currentPosition.lat, currentPosition.lon, randomDistance, randomBearing);
    } else {
      targetPokemonCoords = { lat: 51.1657, lon: 10.4515 };
      currentPosition = { lat: 51.1657, lon: 10.4515 };
    }
  }

  const ringContainer = document.getElementById('radar-ring-container');
  const statusText = document.getElementById('radar-status-text');
  const triggerBtn = document.getElementById('btn-scan-trigger');
  const scareBtn = document.getElementById('btn-scare-overlay');

  ringContainer.className = "radar-rings state-detected";
  statusText.innerText = "⚠️ POKÉMON IN DER NÄHE!";
  triggerBtn.innerHTML = `<span aria-hidden="true">🛑</span><span>ENTFERNEN</span>`;
  
  if (scareBtn) scareBtn.classList.remove('hidden');

  triggerVibration([800, 200, 800, 200, 800]);

  try { playBeep(880, 0.4); } catch(e){}
  sendNotification("Pokémon MOVE", "⚠️ Ein wildes Pokémon ist in deiner Nähe aufgetaucht!");

  updateBlipPosition();
}

function scarePokemon() {
  if (!currentPosition) return;
  const randomDistance = Math.random() * 6 + 2; 
  const randomBearing = Math.random() * 360;
  targetPokemonCoords = calculateDestination(currentPosition.lat, currentPosition.lon, randomDistance, randomBearing);
  try { playBeep(1000, 0.15); } catch(e){}
  updateBlipPosition();
}

function onGPSPositionUpdated() {
  if (targetPokemonCoords && currentPosition) {
    updateBlipPosition();
  }
}

function updateBlipPosition() {
  const blip = document.getElementById('pokemon-radar-blip');
  if (!targetPokemonCoords || !currentPosition || !blip) return;

  blip.classList.remove('hidden');

  const distMeters = calculateDistance(
    currentPosition.lat, currentPosition.lon,
    targetPokemonCoords.lat, targetPokemonCoords.lon
  );

  const absoluteBearing = calculateBearing(
    currentPosition.lat, currentPosition.lon,
    targetPokemonCoords.lat, targetPokemonCoords.lon
  );

  document.getElementById('radar-status-text').innerText = `Entfernung: ~${Math.round(distMeters)}m`;

  if (distMeters > 0 && distMeters <= 3) {
    blip.classList.add('hidden');
    const scareBtn = document.getElementById('btn-scare-overlay');
    if (scareBtn) scareBtn.classList.add('hidden');
    targetPokemonCoords = null;
    startBattleFromScan();
    return;
  }

  const radarRadius = 140; 
  const maxSearchRange = 50; 
  const pixelDist = Math.min(radarRadius, (distMeters / maxSearchRange) * radarRadius);

  const rad = absoluteBearing * Math.PI / 180;
  const x = 165 + pixelDist * Math.sin(rad);
  const y = 165 - pixelDist * Math.cos(rad);

  blip.style.left = x + "px";
  blip.style.top = y + "px";

  blip.onclick = () => {
    triggerVibration([200, 100, 200]);
    blip.classList.add('hidden');
    targetPokemonCoords = null;
    startBattleFromScan();
  };
}

function cancelScan() {
  clearTimeout(scanTimer);
  targetPokemonCoords = null;
  resetRadarUI();
}

function resetRadarUI() {
  isScanning = false;
  document.getElementById('btn-scan-trigger').innerHTML = `<span aria-hidden="true">📡</span><span>SCAN STARTEN</span>`;
  document.getElementById('radar-ring-container').className = "radar-rings";
  document.getElementById('radar-status-text').innerText = "Bereit für Scan...";
  document.getElementById('pokemon-radar-blip').classList.add('hidden');
  const scareBtn = document.getElementById('btn-scare-overlay');
  if (scareBtn) scareBtn.classList.add('hidden');
}

function openTrainingSelection() {
  closeScanModal();

  if (currentSaveData.pokemonTeam.length < 2) {
    alert("Du benötigst mindestens 2 Pokémon in deinem Team für ein Training!");
    return;
  }

  const container = document.getElementById('training-partner-list');
  container.innerHTML = "";

  currentSaveData.pokemonTeam.forEach((p, idx) => {
    if (idx === 0) return;

    const div = document.createElement('div');
    div.className = "pokemon-row";
    div.style.cursor = "pointer";
    div.onclick = () => startTrainingMatch(p);
    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${p.cardUrl}" alt="${p.name}" style="width:40px;">
        <div style="text-align:left;">
          <strong>${p.name}</strong> <span style="font-size:11px; color:#aaa;">Lv. ${p.level}</span>
        </div>
      </div>
      <button type="button" class="btn-primary" style="font-size:10px; width:auto; padding:6px 12px;">Wählen</button>
    `;
    container.appendChild(div);
  });

  document.getElementById('modal-training-select').classList.remove('hidden');
}

function closeTrainingSelection() {
  document.getElementById('modal-training-select').classList.add('hidden');
}

function startTrainingMatch(partnerMon) {
  closeTrainingSelection();
  isTrainingMode = true;
  trainingPartnerMon = partnerMon;

  clearTimeout(dodgeTimer);
  isDodgeWindowActive = false;
  const dodgeBtn = document.getElementById('btn-dodge-action');
  if (dodgeBtn) dodgeBtn.classList.add('hidden');

  currentEnemy = { ...partnerMon, hp: partnerMon.maxHp };
  playerBattlePokemon = currentSaveData.pokemonTeam[0];
  playerEnergy = 0;
  isPlayerTurn = true;
  isEnemyAttacking = false;

  showScreen('screen-battle');
  updateBattleUI();

  const catchBtn = document.getElementById('btn-catch-pokemon');
  if (catchBtn) catchBtn.style.display = 'none';
  document.getElementById('battle-warning-box').innerText = `🏋️ Trainingskampf: ${playerBattlePokemon.name} vs ${currentEnemy.name}!`;
}


/* =========================================================
   7. KAMPFSYSTEM (BATTLE)
   ========================================================= */

/* 7.1 Kampf-Setup & UI-Updates */
function startBattleFromScan() {
  isTrainingMode = false;
  clearTimeout(dodgeTimer);
  isDodgeWindowActive = false;
  const dodgeBtn = document.getElementById('btn-dodge-action');
  if (dodgeBtn) dodgeBtn.classList.add('hidden');

  const catchBtn = document.getElementById('btn-catch-pokemon');
  if (catchBtn) catchBtn.style.display = 'block';

  const bottomHud = document.querySelector('.arena-bottom-hud');
  if (bottomHud) {
    bottomHud.classList.remove('hidden');
    bottomHud.style.display = 'block';
  }

  resetRadarUI();
  showScreen('screen-battle');

  const pool = (currentScanType === 'power') ? RARE_POKEMON : COMMON_POKEMON;
  const template = pool[Math.floor(Math.random() * pool.length)];

  const minHp = template.maxHp;
  let calculatedHp = minHp;
  if (playerBattlePokemon && playerBattlePokemon.maxHp) {
    const playerHp = playerBattlePokemon.maxHp;
    const variation = (Math.random() * 0.3) - 0.15; 
    calculatedHp = Math.round(playerHp * (1 + variation));
    calculatedHp = Math.max(minHp, calculatedHp);
  }

  currentEnemy = { ...template, maxHp: calculatedHp, hp: calculatedHp };
  playerBattlePokemon = currentSaveData.pokemonTeam[0];
  playerEnergy = 0;
  isPlayerTurn = true;
  isEnemyAttacking = false;

  updateBattleUI();
  const warnBox = document.getElementById('battle-warning-box');
  if (warnBox) warnBox.innerText = `Ein wildes ${currentEnemy.name} (KP: ${calculatedHp}) greift an!`;
}

function updateBattleUI() {
  if (!currentEnemy || !playerBattlePokemon) return;

  const prefix = isTrainingMode ? "PARTNER " : "WILDES ";
  document.getElementById('enemy-title').innerText = prefix + currentEnemy.name.toUpperCase();
  document.getElementById('enemy-card-img').src = currentEnemy.cardUrl;
  document.getElementById('enemy-hp-text').innerText = `${currentEnemy.hp} / ${currentEnemy.maxHp} KP`;
  document.getElementById('enemy-hp-bar').style.width = Math.max(0, (currentEnemy.hp / currentEnemy.maxHp) * 100) + "%";

  document.getElementById('player-title').innerText = playerBattlePokemon.name.toUpperCase();
  document.getElementById('player-hp-text').innerText = `${playerBattlePokemon.hp}/${playerBattlePokemon.maxHp}`;
  document.getElementById('player-hp-bar').style.width = Math.max(0, (playerBattlePokemon.hp / playerBattlePokemon.maxHp) * 100) + "%";

  const ballsBadge = document.getElementById('battle-balls-badge') || document.getElementById('battle-balls-count');
  if (ballsBadge) ballsBadge.innerText = currentSaveData.pokeballs;

  const playerCardImg = document.getElementById('player-card-img');
  if (playerCardImg) {
    playerCardImg.src = playerBattlePokemon.cardUrl;
  }

  let dots = "";
  for (let i = 0; i < 3; i++) dots += (i < playerEnergy) ? "🟡 " : "⚪ ";
  document.getElementById('player-energy-dots').innerText = dots;

  const specBtn = document.getElementById('btn-special-attack');
  if (specBtn) {
    specBtn.disabled = !(playerEnergy >= 3 && isPlayerTurn && !isEnemyAttacking);
    specBtn.style.opacity = specBtn.disabled ? "0.4" : "1";
  }

  if (!isDodgeWindowActive) {
    const dodgeBtn = document.getElementById('btn-dodge-action');
    if (dodgeBtn) dodgeBtn.classList.add('hidden');
  }
}

/* 7.2 Angriffe, Spezial & Ausweichen */
function playPunchSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.15);
  } catch(e){}
}

function playElementalSound(type) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const t = type.toLowerCase();
    if (t === 'feuer') {
      playPunchSound();
      playBeep(220, 0.3); setTimeout(() => playBeep(110, 0.4), 100);
    } else if (t === 'wasser') {
      playBeep(600, 0.1); setTimeout(() => playBeep(800, 0.1), 80); setTimeout(() => playBeep(500, 0.2), 160);
    } else if (t === 'elektro') {
      playBeep(1200, 0.05); setTimeout(() => playBeep(400, 0.05), 50); setTimeout(() => playBeep(1500, 0.1), 100);
    } else {
      playPunchSound(); playBeep(440, 0.2);
    }
  } catch(e){}
}

function triggerElementalFX(elementType, direction = 'up') {
  const battleScreen = document.getElementById('screen-battle') || document.body;
  const rawType = elementType ? elementType.toLowerCase() : 'feuer';
  
  let symbol = '🔥';
  let animName = (direction === 'down') ? 'flyToPlayerFeuer' : 'flyToEnemyFeuer';
  
  if (rawType === 'wasser' || rawType === 'schiggy') {
    symbol = '💧🫧'; animName = (direction === 'down') ? 'flyToPlayerWasser' : 'flyToEnemyWasser';
  } else if (rawType === 'pflanze' || rawType === 'bisasam') {
    symbol = '🍃🌿'; animName = (direction === 'down') ? 'flyToPlayerPflanze' : 'flyToEnemyPflanze';
  } else if (rawType === 'elektro') {
    symbol = '⚡💥'; animName = (direction === 'down') ? 'flyToPlayerElektro' : 'flyToEnemyElektro';
  } else if (rawType === 'feuer' || rawType === 'glumanda') {
    symbol = '🔥☄️'; animName = (direction === 'down') ? 'flyToPlayerFeuer' : 'flyToEnemyFeuer';
  }

  playElementalSound(rawType);

  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      const proj = document.createElement('div');
      proj.className = 'elemental-projectile';
      proj.innerText = symbol;
      proj.style.marginLeft = (Math.random() * 80 - 40) + 'px';
      battleScreen.appendChild(proj);
      proj.style.animation = `${animName} 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards`;
      setTimeout(() => { proj.remove(); }, 1200);
    }, i * 250);
  }
}

function executePlayerAttack() {
  if (!isPlayerTurn || isEnemyAttacking || currentEnemy.hp <= 0) return;

  isPlayerTurn = false;
  isEnemyAttacking = true;

  const playerImg = document.getElementById('player-card-img');
  const enemyImg = document.getElementById('enemy-card-img');
  const enemyDodges = Math.random() <= 0.15;

  if (playerImg) playerImg.classList.add('anim-player-tackle');
  playPunchSound();

  if (enemyDodges) {
    setTimeout(() => {
      if (enemyImg) enemyImg.classList.add('anim-dodge-right');
      if(typeof CatchEngine !== 'undefined') CatchEngine.showFeedback("DANEBEN!");
      try { playBeep(900, 0.15); } catch(e){}
    }, 150);

    setTimeout(() => {
      if (playerImg) playerImg.classList.remove('anim-player-tackle');
      if (enemyImg) enemyImg.classList.remove('anim-dodge-right');

      triggerElementalFX(currentEnemy.type, 'down');
      const specDmg = Math.round(currentEnemy.maxHp * 0.40);
      playerBattlePokemon.hp = Math.max(0, playerBattlePokemon.hp - specDmg);

      document.getElementById('battle-warning-box').innerText = `🔥 GEGNER WEICHT AUS & KONTERT! (-${specDmg} KP)`;

      setTimeout(() => {
        isEnemyAttacking = false;
        if (playerBattlePokemon.hp <= 0) {
          handlePokemonKnockout();
        } else {
          isPlayerTurn = true;
          updateBattleUI();
        }
      }, 700);
    }, 550);

  } else {
    let dmg = Math.round(playerBattlePokemon.maxHp * 0.30);
    if (currentEnemy.weakness === playerBattlePokemon.type) dmg = Math.round(dmg * 1.5);

    setTimeout(() => {
      currentEnemy.hp = Math.max(0, currentEnemy.hp - dmg);
      playerEnergy = Math.min(3, playerEnergy + 1);
      updateBattleUI();

      document.getElementById('battle-warning-box').innerText = `Du greifst an! (-${dmg} KP)`;
      if (enemyImg) enemyImg.classList.add('anim-hit-shake');
    }, 150);

    setTimeout(() => {
      if (playerImg) playerImg.classList.remove('anim-player-tackle');
      if (enemyImg) enemyImg.classList.remove('anim-hit-shake');

      if (currentEnemy.hp <= 0) {
        if(typeof winBattle === 'function') return winBattle();
      }
      setTimeout(scheduleEnemyAttack, 600);
    }, 500);
  }
}

function executePlayerSpecial() {
  if (!isPlayerTurn || playerEnergy < 3 || isEnemyAttacking || currentEnemy.hp <= 0) return;

  isPlayerTurn = false;
  isEnemyAttacking = true;
  playerEnergy = 0;

  const enemyImg = document.getElementById('enemy-card-img');
  const type = playerBattlePokemon.type.toUpperCase();

  document.getElementById('battle-warning-box').innerText = `🔥 SPEZIALANGRIFF (${type}) WIRD AUFGELADEN!`;
  triggerElementalFX(playerBattlePokemon.type, 'up');

  setTimeout(() => {
    let dmg = Math.round(playerBattlePokemon.maxHp * 0.50);
    if (currentEnemy.weakness === playerBattlePokemon.type) dmg = Math.round(dmg * 1.5);

    currentEnemy.hp = Math.max(0, currentEnemy.hp - dmg);
    updateBattleUI();

    document.getElementById('battle-warning-box').innerText = `🔥 SPEZIALANGRIFF HIT! (-${dmg} KP)`;
    if (enemyImg) enemyImg.classList.add('anim-hit-shake');

    setTimeout(() => {
      if (enemyImg) enemyImg.classList.remove('anim-hit-shake');
      if (currentEnemy.hp <= 0) {
         if(typeof winBattle === 'function') return winBattle();
      }
      setTimeout(scheduleEnemyAttack, 800);
    }, 600);

  }, 2500);
}

function scheduleEnemyAttack() {
  if (currentEnemy.hp <= 0 || playerBattlePokemon.hp <= 0) return;

  isEnemyAttacking = true;
  isPlayerTurn = false;

  const dodgeBtn = document.getElementById('btn-dodge-action');
  const shouldOfferDodge = Math.random() <= 0.25;

  if (shouldOfferDodge && dodgeBtn) {
    isDodgeWindowActive = true;
    dodgeBtn.classList.remove('hidden');

    dodgeTimer = setTimeout(() => {
      if (isDodgeWindowActive) {
        isDodgeWindowActive = false;
        dodgeBtn.classList.add('hidden');
        executeEnemyDamage();
      }
    }, 1000);

  } else {
    executeEnemyDamage();
  }
}

function onPlayerDodgeClick() {
  if (!isDodgeWindowActive) return;
  clearTimeout(dodgeTimer);
  isDodgeWindowActive = false;

  const dodgeBtn = document.getElementById('btn-dodge-action');
  if (dodgeBtn) dodgeBtn.classList.add('hidden');

  const playerImg = document.getElementById('player-card-img');
  if (playerImg) playerImg.classList.add('anim-dodge-left');

  try { playBeep(1200, 0.2); } catch(e){}
  if(typeof CatchEngine !== 'undefined') CatchEngine.showFeedback("DANEBEN!");

  playerEnergy = 3;
  updateBattleUI();

  document.getElementById('battle-warning-box').innerText = `⚡ PERFEKT AUSGEWICHEN! Spezial bereit!`;

  setTimeout(() => {
    if (playerImg) playerImg.classList.remove('anim-dodge-left');
    isEnemyAttacking = false;
    isPlayerTurn = true;
    updateBattleUI();
  }, 600);
}

function executeEnemyDamage() {
  const enemyImg = document.getElementById('enemy-card-img');
  const playerImg = document.getElementById('player-card-img');
  
  if (enemyImg) enemyImg.classList.add('anim-enemy-tackle');
  playPunchSound();

  document.getElementById('battle-warning-box').innerText = `⚠️ ${currentEnemy.name} greift an!`;

  setTimeout(() => {
    let dmg = Math.round(currentEnemy.maxHp * 0.20);
    playerBattlePokemon.hp = Math.max(0, playerBattlePokemon.hp - dmg);
    updateBattleUI();

    if (playerImg) {
      playerImg.classList.add('direct-hit-flash');
      try { playBeep(200, 0.2); } catch(e){}
    }

    document.getElementById('battle-warning-box').innerText = `${currentEnemy.name} trifft voll! (-${dmg} KP)`;

    if (enemyImg) enemyImg.classList.remove('anim-enemy-tackle');

    setTimeout(() => {
      if (playerImg) playerImg.classList.remove('direct-hit-flash');
    }, 400);

    isEnemyAttacking = false;

    setTimeout(() => {
      if (playerBattlePokemon.hp <= 0) {
        handlePokemonKnockout();
      } else {
        isPlayerTurn = true;
        updateBattleUI();
      }
    }, 800);

  }, 400);
}

/* 7.3 Teamwechsel im Kampf */
function openBattleTeamModal() {
  if (isEnemyAttacking || !isPlayerTurn) {
    alert("Du kannst jetzt nicht mitten im Zug wechseln!");
    return;
  }

  const container = document.getElementById('battle-team-list');
  if (!container) return;
  container.innerHTML = "";

  currentSaveData.pokemonTeam.forEach((p, idx) => {
    const isCurrent = (idx === 0);
    const div = document.createElement('div');
    div.className = "pokemon-row";
    div.style.cssText = `display:flex; align-items:center; justify-content:space-between; background:${isCurrent ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)'}; padding:8px 12px; border-radius:10px; margin-bottom:6px; border: ${isCurrent ? '1px solid #38bdf8' : 'none'};`;
    
    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${p.cardUrl}" alt="${p.name}" style="width:38px; height:38px; object-fit:contain;">
        <div style="text-align:left;">
          <strong>${p.name}</strong> <span style="font-size:11px; color:#aaa;">Lv. ${p.level}</span>
          <div style="font-size:11px; color:${p.hp > 0 ? '#4cd137' : '#e74c3c'};">KP: ${p.hp}/${p.maxHp} ${isCurrent ? '(Aktiv)' : ''}</div>
        </div>
      </div>
      ${!isCurrent && p.hp > 0 ? `<button type="button" class="btn-primary" style="font-size:10px; width:auto; padding:6px 10px;" onclick="switchBattlePokemon(${idx})">Einsetzen</button>` : ''}
    `;
    container.appendChild(div);
  });

  const modal = document.getElementById('modal-battle-team');
  if (modal) modal.classList.remove('hidden');
}

function closeBattleTeamModal() {
  const modal = document.getElementById('modal-battle-team');
  if (modal) modal.classList.add('hidden');
}

function switchBattlePokemon(newTeamIndex) {
  closeBattleTeamModal();
  const newActive = currentSaveData.pokemonTeam.splice(newTeamIndex, 1)[0];
  currentSaveData.pokemonTeam.unshift(newActive);
  saveCurrentData();

  isPlayerTurn = false;
  isEnemyAttacking = true;

  const playerImg = document.getElementById('player-card-img');
  const warnBox = document.getElementById('battle-warning-box');

  if (warnBox) warnBox.innerText = `🔄 ${playerBattlePokemon.name}, komm zurück!`;
  try { playBeep(400, 0.15); } catch(e){}

  if (playerImg) {
    playerImg.classList.add('anim-pokemon-retreat');
  }

  setTimeout(() => {
    playerBattlePokemon = currentSaveData.pokemonTeam[0];
    updateBattleUI();

    if (warnBox) warnBox.innerText = `✨ Los, ${playerBattlePokemon.name}!`;
    try { playBeep(650, 0.2); } catch(e){}

    if (playerImg) {
      playerImg.classList.remove('anim-pokemon-retreat');
      playerImg.classList.add('anim-pokemon-enter');
    }

    setTimeout(() => {
      if (playerImg) playerImg.classList.remove('anim-pokemon-enter');
      
      setTimeout(() => {
        isEnemyAttacking = false;
        scheduleEnemyAttack();
      }, 400);

    }, 500);
  }, 450);
}

/* 7.4 K.O. & EXP-Verlust */
function handlePokemonKnockout() {
  if(typeof CatchEngine !== 'undefined') CatchEngine.stopCatchSession();
  const mon = playerBattlePokemon;
  const oldExp = mon.exp || 0;
  
  const lostExp = Math.floor(oldExp / 2);
  mon.exp = oldExp - lostExp;
  mon.hp = mon.maxHp;
  saveCurrentData();

  pendingKoInfo = {
    name: mon.name,
    lostExp: lostExp,
    currentExp: mon.exp,
    maxExp: mon.maxExp
  };

  document.getElementById('ko-loss-text').innerText = `-${lostExp} EXP verloren!`;
  document.getElementById('ko-remaining-text').innerText = `Verbleibende EXP: ${mon.exp} / ${mon.maxExp}`;
  document.getElementById('ko-screen').classList.remove('hidden');
  try { playBeep(150, 0.4); } catch(e){}
}

function closeKoOverlay() {
  document.getElementById('ko-screen').classList.add('hidden');
  pendingKoInfo = null;
  showScreen('screen-radar-hud');
}

function attemptEscape() {
  runFromBattle();
}

function runFromBattle() {
  clearTimeout(dodgeTimer);
  isDodgeWindowActive = false;
  if(typeof CatchEngine !== 'undefined') CatchEngine.stopCatchSession();
  try { playBeep(300, 0.2); } catch(e){}
  showScreen('screen-radar-hud');
}

