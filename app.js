// SERVICE WORKER LÖSCHUNG FUER DEV-UPDATES
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

// GLOBALE AUDIO-KONTEXT VERWALTUNG
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

/* =========================================================
   GEO-LOCATIONAL MATH & GPS TRACKING
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

  return {
    lat: lat2 * 180 / Math.PI,
    lon: lon2 * 180 / Math.PI
  };
}

let currentPosition = null;
let targetPokemonCoords = null;
let watchPositionId = null;
let currentHeading = 0;

// LEAFLET MAP LOGIK
let homeMap = null;
let homeMarker = null;
let tempHomeCoords = null;

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
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(homeMap);

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

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
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
    })
    .catch(() => alert("Fehler bei der Adresssuche."));
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
   1. CINEMATIC INTRO ENGINE
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

    const triggerAudio = (e) => {
      unlockAudio();
      if (!this.canInteractiveFinish) {
        e.stopPropagation();
      }
    };

    container.addEventListener('touchstart', triggerAudio, { passive: true });
    container.addEventListener('pointerdown', triggerAudio, { passive: true });

    container.addEventListener('click', (e) => {
      if (!this.canInteractiveFinish) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      this.finishIntro();
    });

    this.startCardRush();
    setTimeout(() => this.playSlashSound(), 5300);

    setTimeout(() => {
      this.canInteractiveFinish = true;
      const promptEl = document.querySelector('.start-prompt');
      if (promptEl) {
        promptEl.innerText = "TIPPE AUF DEN BILDSCHIRM";
        promptEl.classList.add('show-prompt');
      }
    }, 7300);
  },

  playWhooshSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
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
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
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
        card.innerHTML = `<img src="${cardData.tcg}" onerror="this.onerror=null; this.src='${cardData.fallback}';" alt="Card">`;

        const startX = (Math.random() - 0.5) * 80;
        const startY = (Math.random() - 0.5) * 60;
        const endX = (Math.random() - 0.5) * 380;
        const endY = (Math.random() - 0.5) * 320;
        const rotZ = (Math.random() - 0.5) * 22;
        const rotY = (Math.random() - 0.5) * 18;

        cardStream.appendChild(card);

        const animation = card.animate([
          { transform: `translate3d(${startX}px, ${startY}px, -600px) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(0.3)`, opacity: 0 },
          { opacity: 1, offset: 0.15 },
          { opacity: 1, offset: 0.70 },
          { transform: `translate3d(${endX}px, ${endY}px, 400px) rotateY(${rotY * 1.5}deg) rotateZ(${rotZ * 1.5}deg) scale(1.6)`, opacity: 0 }
        ], {
          duration: 600,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards'
        });

        this.playWhooshSound();
        animation.onfinish = () => card.remove();
      }, i * (totalDuration / cardCount));
    }
  },

  finishIntro() {
    if (!this.active) return;
    this.active = false;

    unlockAudio();
    requestNotificationPermission();

    const introEl = document.getElementById('intro-screen');
    const gameScreen = document.getElementById('game-screen');

    if (introEl) {
      introEl.classList.add('fade-out');
      setTimeout(() => {
        introEl.style.display = 'none';
        if (gameScreen) gameScreen.classList.remove('hidden');
        initApp();
      }, 500);
    }
  }
};

/* =========================================================
   2. SPEICHER & DATENBANKEN
   ========================================================= */
const EVOLUTION_CHAINS = {
  "Glumanda": { next: "Glutexo", cardUrl: "https://images.pokemontcg.io/base1/24_hires.png", hpBonus: 20 },
  "Glutexo":  { next: "Glurak",  cardUrl: "https://images.pokemontcg.io/base1/4_hires.png",  hpBonus: 35 },
  "Bisasam":  { next: "Bisaknosp", cardUrl: "https://images.pokemontcg.io/base1/30_hires.png", hpBonus: 20 },
  "Bisaknosp":{ next: "Bisaflor",  cardUrl: "https://images.pokemontcg.io/base1/15_hires.png", hpBonus: 35 },
  "Schiggy":   { next: "Schillok", cardUrl: "https://images.pokemontcg.io/base1/42_hires.png", hpBonus: 20 },
  "Schillok":  { next: "Turtok",   cardUrl: "https://images.pokemontcg.io/base1/2_hires.png",  hpBonus: 35 }
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

let selectedFlowMode = 'continue';
let activeSlot = null;
let selectedStarter = null;

let isScanning = false;
let scanTimer = null;
let currentScanType = 'quick';

let isTrainingMode = false;
let trainingPartnerMon = null;

let currentEnemy = null;
let playerBattlePokemon = null;
let playerEnergy = 0;
let isEnemyAttacking = false;
let isPlayerTurn = true;
let pendingEvoPokemon = null;

let currentSaveData = {
  level: 1,
  exp: 0,
  maxExp: 100,
  pokeballs: 10,
  pokemonTeam: [],
  homePos: null
};

/* =========================================================
   3. NAVIGATION, GPS & KOMPASS INITIALISIERUNG
   ========================================================= */
function initApp() {
  updateSlotUI();
  initGPSLiveTracking();
  initCompassTracking();
  showScreen('screen-main-menu');
}

function initGPSLiveTracking() {
  if ("geolocation" in navigator) {
    watchPositionId = navigator.geolocation.watchPosition(
      (pos) => {
        currentPosition = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        };
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

function initCompassTracking() {
  const handleOrientation = (event) => {
    let heading = null;

    if (event.webkitCompassHeading) {
      heading = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
      heading = (360 - event.alpha) % 360;
    }

    if (heading !== null && !isNaN(heading)) {
      currentHeading = heading;
      if (targetPokemonCoords) {
        updateBlipPosition();
      }
    }
  };

  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    window.addEventListener('deviceorientation', handleOrientation, true);
  } else if ('ondeviceorientationabsolute' in window) {
    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
  } else if ('ondeviceorientation' in window) {
    window.addEventListener('deviceorientation', handleOrientation, true);
  }
}

function requestCompassPermissionIOS() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          initCompassTracking();
        }
      })
      .catch(console.error);
  }
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
      loadDashboard();
      showScreen('screen-radar-hud');
    } else {
      alert("Dieser Speicherplatz ist leer! Bitte starte ein Neues Spiel.");
    }
  } else {
    currentSaveData = { level: 1, exp: 0, maxExp: 100, pokeballs: 10, pokemonTeam: [], homePos: null };
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
    bisasam: { name: "Bisasam", type: "pflanze", level: 1, hp: 44, maxHp: 44, cardUrl: "https://images.pokemontcg.io/base1/44_hires.png", weakness: "feuer", evoChance: 0 },
    glumanda: { name: "Glumanda", type: "feuer", level: 1, hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/base1/46_hires.png", weakness: "wasser", evoChance: 0 },
    schiggy: { name: "Schiggy", type: "wasser", level: 1, hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/base1/63_hires.png", weakness: "pflanze", evoChance: 0 }
  };

  currentSaveData.pokemonTeam = [starters[selectedStarter]];
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
  document.getElementById('menu-caught-count').innerText = currentSaveData.pokemonTeam.length;

  renderPokemonTeam();
}

function renderPokemonTeam() {
  const container = document.getElementById('pokemon-team-list');
  if (!container) return;
  container.innerHTML = "";

  currentSaveData.pokemonTeam.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = "pokemon-row";
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${p.cardUrl}" alt="${p.name}" style="width:40px;">
        <div style="text-align:left;">
          <strong>${p.name}</strong> <span style="font-size:11px; color:#aaa;">Lv. ${p.level}</span>
          <div style="font-size:11px; color:#4cd137;">KP: ${p.hp}/${p.maxHp} | Evo: ${p.evoChance || 0}%</div>
        </div>
      </div>
      ${idx === 0 ? '<span class="tag-active">Aktiv</span>' : ''}
    `;
    container.appendChild(row);
  });
}

/* =========================================================
   4. RADAR, SCAN & EXAKTE ROTIERENDE BLIP-POSITIONSBERECHNUNG
   ========================================================= */
function openScanModal() {
  requestCompassPermissionIOS();
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
  /* TEMPORÄR FÜR ENTWICKLUNG DEAKTIVIERT (Zuhause-Sperre)
  if (currentSaveData.homePos && currentPosition) {
    const distToHome = calculateDistance(
      currentPosition.lat, currentPosition.lon,
      currentSaveData.homePos.lat, currentSaveData.homePos.lon
    );
    if (distToHome < 30) {
      alert("Scannen hier nicht möglich.\n\nTipp: Entferne dich von deinem Zuhause damit der Scanner funktioniert!");
      return;
    }
  }
  */

  closeScanModal();
  currentScanType = type;
  isScanning = true;

  const triggerBtn = document.getElementById('btn-scan-trigger');
  const ringContainer = document.getElementById('radar-ring-container');
  const statusText = document.getElementById('radar-status-text');

  triggerBtn.innerHTML = `<span aria-hidden="true">🛑</span><span>SCAN ABBRECHEN</span>`;
  ringContainer.className = "radar-rings state-scanning";
  statusText.innerText = "Scanne Umgebung...";

  let durationMs = 0;
  if (type === 'quick') {
    durationMs = (Math.random() * (6 - 3) + 3) * 60 * 1000;
  } else {
    durationMs = (Math.random() * (30 - 15) + 15) * 60 * 1000;
  }

  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    triggerSignalDetected();
  }, durationMs);
}

// REPARIERTER TEST-BUTTON: SPAWNT EIN POKÉMON DIREKT AUF DEM RADAR
function forceDevSpawn() {
  // Falls noch kein Scan aktiv ist, Scan-Status erzwingen
  isScanning = false;
  currentScanType = 'quick';

  // Falls GPS/Position noch nicht bereit ist, Fallback-Koordinaten setzen
  if (!currentPosition) {
    currentPosition = { lat: 51.1657, lon: 10.4515 };
  }

  // Signal sofort auslösen
  triggerSignalDetected();
}


function triggerSignalDetected() {
  isScanning = false;

  if (currentPosition) {
    const randomDistance = Math.random() * (20 - 10) + 10;
    const randomBearing = Math.random() * 360;
    targetPokemonCoords = calculateDestination(currentPosition.lat, currentPosition.lon, randomDistance, randomBearing);
  } else {
    // Fallback falls GPS in der Testumgebung aus ist
    targetPokemonCoords = { lat: 51.1657, lon: 10.4515 };
    currentPosition = { lat: 51.1657, lon: 10.4515 };
  }

  const ringContainer = document.getElementById('radar-ring-container');
  const statusText = document.getElementById('radar-status-text');
  const triggerBtn = document.getElementById('btn-scan-trigger');
  const scareBtn = document.getElementById('btn-scare-overlay');

  ringContainer.className = "radar-rings state-detected";
  statusText.innerText = "⚠️ POKÉMON IN DER NÄHE!";
  triggerBtn.innerHTML = `<span aria-hidden="true">🛑</span><span>ENTFERNEN</span>`;
  
  scareBtn.classList.remove('hidden');

  if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 800]);
  playBeep(880, 0.4);
  sendNotification("Pokémon MOVE", "⚠️ Ein wildes Pokémon ist in deiner Nähe aufgetaucht!");

  updateBlipPosition();
}

function scarePokemon() {
  if (!currentPosition) return;
  const randomDistance = Math.random() * (20 - 10) + 10;
  const randomBearing = Math.random() * 360;
  targetPokemonCoords = calculateDestination(currentPosition.lat, currentPosition.lon, randomDistance, randomBearing);
  playBeep(1000, 0.15);
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

  const relativeAngle = (absoluteBearing - currentHeading + 360) % 360;

  document.getElementById('radar-status-text').innerText = `Entfernung: ~${Math.round(distMeters)}m`;

  if (distMeters <= 4) {
    blip.classList.add('hidden');
    document.getElementById('btn-scare-overlay').classList.add('hidden');
    targetPokemonCoords = null;
    startBattleFromScan();
    return;
  }

  const maxRadarRadius = 140;
  const maxMeterVisual = 20;
  const pixelDist = Math.min(maxRadarRadius, (distMeters / maxMeterVisual) * maxRadarRadius);

  const rad = relativeAngle * Math.PI / 180;
  const x = 165 + pixelDist * Math.sin(rad);
  const y = 165 - pixelDist * Math.cos(rad);

  blip.style.left = x + "px";
  blip.style.top = y + "px";
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
  document.getElementById('btn-scare-overlay').classList.add('hidden');
}

/* =========================================================
   4b. ZUHAUSE TRAININGS-MODUS
   ========================================================= */
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

  currentEnemy = { ...partnerMon, hp: partnerMon.maxHp };
  playerBattlePokemon = currentSaveData.pokemonTeam[0];
  playerEnergy = 0;
  isPlayerTurn = true;
  isEnemyAttacking = false;

  showScreen('screen-battle');
  updateBattleUI();

  document.getElementById('btn-catch-pokemon').style.display = 'none';
  document.getElementById('battle-warning-box').innerText = `🏋️ Trainingskampf: ${playerBattlePokemon.name} vs ${currentEnemy.name}!`;
}

/* =========================================================
   5. KAMPFSYSTEM & FANGSYSTEM
   ========================================================= */
function startBattleFromScan() {
  isTrainingMode = false;
  document.getElementById('btn-catch-pokemon').style.display = 'block';

  resetRadarUI();
  showScreen('screen-battle');

  const pool = (currentScanType === 'power') ? RARE_POKEMON : COMMON_POKEMON;
  const template = pool[Math.floor(Math.random() * pool.length)];
  currentEnemy = { ...template, hp: template.maxHp };

  playerBattlePokemon = currentSaveData.pokemonTeam[0];
  playerEnergy = 0;
  isPlayerTurn = true;
  isEnemyAttacking = false;

  updateBattleUI();
  document.getElementById('battle-warning-box').innerText = `Ein wildes ${currentEnemy.name} greift an!`;
}

function updateBattleUI() {
  if (!currentEnemy || !playerBattlePokemon) return;

  const prefix = isTrainingMode ? "PARTNER " : "WILDES ";
  document.getElementById('enemy-title').innerText = prefix + currentEnemy.name.toUpperCase();
  document.getElementById('enemy-card-img').src = currentEnemy.cardUrl;
  document.getElementById('enemy-hp-text').innerText = `${currentEnemy.hp} / ${currentEnemy.maxHp} KP`;
  document.getElementById('enemy-hp-bar').style.width = Math.max(0, (currentEnemy.hp / currentEnemy.maxHp) * 100) + "%";

  document.getElementById('player-title').innerText = playerBattlePokemon.name.toUpperCase();
  document.getElementById('player-card-img').src = playerBattlePokemon.cardUrl;
  document.getElementById('player-hp-text').innerText = `${playerBattlePokemon.hp} / ${playerBattlePokemon.maxHp} KP`;
  document.getElementById('player-hp-bar').style.width = Math.max(0, (playerBattlePokemon.hp / playerBattlePokemon.maxHp) * 100) + "%";

  document.getElementById('battle-balls-count').innerText = currentSaveData.pokeballs;

  let dots = "";
  for (let i = 0; i < 3; i++) dots += (i < playerEnergy) ? "🟡 " : "⚪ ";
  document.getElementById('player-energy-dots').innerText = dots;

  const specBtn = document.getElementById('btn-special-attack');
  specBtn.disabled = !(playerEnergy >= 3 && isPlayerTurn && !isEnemyAttacking);
  specBtn.style.opacity = specBtn.disabled ? "0.4" : "1";
}

function executePlayerAttack() {
  if (!isPlayerTurn || isEnemyAttacking || currentEnemy.hp <= 0) return;

  isPlayerTurn = false;
  isEnemyAttacking = true;

  let dmg = Math.round(playerBattlePokemon.maxHp * 0.25);
  if (currentEnemy.weakness === playerBattlePokemon.type) dmg = Math.round(dmg * 1.5);

  currentEnemy.hp = Math.max(0, currentEnemy.hp - dmg);
  playerEnergy = Math.min(3, playerEnergy + 1);
  updateBattleUI();

  document.getElementById('battle-warning-box').innerText = `Du greifst an! (-${dmg} KP)`;
  playBeep(600, 0.1);

  if (currentEnemy.hp <= 0) return winBattle();
  setTimeout(scheduleEnemyAttack, 1000);
}

function executePlayerSpecial() {
  if (!isPlayerTurn || playerEnergy < 3 || isEnemyAttacking || currentEnemy.hp <= 0) return;

  isPlayerTurn = false;
  isEnemyAttacking = true;
  playerEnergy = 0;

  let dmg = Math.round(playerBattlePokemon.maxHp * 0.70);
  if (currentEnemy.weakness === playerBattlePokemon.type) dmg = Math.round(dmg * 1.5);

  currentEnemy.hp = Math.max(0, currentEnemy.hp - dmg);
  updateBattleUI();

  document.getElementById('battle-warning-box').innerText = `SPEZIALANGRIFF! (-${dmg} KP)`;
  playBeep(900, 0.35);

  if (currentEnemy.hp <= 0) return winBattle();
  setTimeout(scheduleEnemyAttack, 1000);
}

function scheduleEnemyAttack() {
  if (currentEnemy.hp <= 0 || playerBattlePokemon.hp <= 0) return;

  isEnemyAttacking = true;
  isPlayerTurn = false;

  const dmg = Math.round(currentEnemy.maxHp * 0.20);
  playerBattlePokemon.hp = Math.max(0, playerBattlePokemon.hp - dmg);

  document.getElementById('battle-warning-box').innerText = `${currentEnemy.name} greift an! (-${dmg} KP)`;
  playBeep(300, 0.25);

  isEnemyAttacking = false;

  if (playerBattlePokemon.hp <= 0) {
    setTimeout(() => {
      playerBattlePokemon.hp = playerBattlePokemon.maxHp;
      saveCurrentData();
      alert(`${playerBattlePokemon.name} wurde K.O. geschlagen! Es erholt sich wieder.`);
      showScreen('screen-radar-hud');
    }, 500);
  } else {
    isPlayerTurn = true;
    updateBattleUI();
  }
}

function attemptCatch() {
  if (isTrainingMode) return;
  if (currentSaveData.pokeballs <= 0) return alert("Keine Pokébälle mehr im Beutel!");

  currentSaveData.pokeballs--;
  updateBattleUI();

  const catchChance = 1.0 - ((currentEnemy.hp / currentEnemy.maxHp) * 0.7);

  if (Math.random() <= catchChance) {
    playBeep(1200, 0.4);
    alert(`Du hast ${currentEnemy.name} gefangen!`);

    currentSaveData.pokemonTeam.push({
      name: currentEnemy.name,
      type: currentEnemy.type,
      level: 1,
      hp: currentEnemy.maxHp,
      maxHp: currentEnemy.maxHp,
      cardUrl: currentEnemy.cardUrl,
      evoChance: 0
    });

    addTrainerExp(30);
    saveCurrentData();
    showScreen('screen-radar-hud');
  } else {
    playBeep(400, 0.2);
    document.getElementById('battle-warning-box').innerText = "Schade! Das Pokémon ist entkommen!";
    setTimeout(scheduleEnemyAttack, 1000);
  }
}

function winBattle() {
  document.getElementById('battle-warning-box').innerText = `💥 ${currentEnemy.name} besiegt!`;
  try {
    playBeep(523.25, 0.15);
    setTimeout(() => playBeep(659.25, 0.15), 150);
    setTimeout(() => playBeep(783.99, 0.4), 300);
  } catch(e){}

  setTimeout(() => {
    if (isTrainingMode) {
      const earnedExp = 10;
      addPokemonExp(playerBattlePokemon, earnedExp);
      if (trainingPartnerMon) addPokemonExp(trainingPartnerMon, earnedExp);
      playerBattlePokemon.hp = playerBattlePokemon.maxHp;
      saveCurrentData();

      document.getElementById('victory-exp-text').innerText = `+${earnedExp} EXP (Training)`;
      document.getElementById('victory-item-text').innerText = `Beide Pokémon haben gelernt!`;
      document.getElementById('victory-screen').classList.remove('hidden');
    } else {
      const earnedExp = 20;
      addTrainerExp(earnedExp);
      currentSaveData.pokeballs += 2;

      const activeMon = playerBattlePokemon;
      const leveledUp = addPokemonExp(activeMon, earnedExp);
      activeMon.hp = activeMon.maxHp;
      saveCurrentData();

      if (leveledUp && EVOLUTION_CHAINS[activeMon.name]) {
        pendingEvoPokemon = activeMon;
        showEvolutionScreen(activeMon);
      } else {
        document.getElementById('victory-exp-text').innerText = `+${earnedExp} EXP`;
        document.getElementById('victory-item-text').innerText = `+2 Pokébälle`;
        document.getElementById('victory-screen').classList.remove('hidden');
      }
    }
  }, 1000);
}

function addPokemonExp(pokemon, amount) {
  if (!pokemon.exp) pokemon.exp = 0;
  if (!pokemon.maxExp) pokemon.maxExp = pokemon.level * 15;

  pokemon.exp += amount;
  let didLevelUp = false;

  while (pokemon.exp >= pokemon.maxExp) {
    pokemon.level++;
    pokemon.exp -= pokemon.maxExp;
    pokemon.maxExp = pokemon.level * 15;
    pokemon.maxHp += 5;
    pokemon.hp = pokemon.maxHp;
    
    if (pokemon.evoChance === undefined) pokemon.evoChance = 0;
    pokemon.evoChance = Math.min(100, pokemon.evoChance + 5);
    didLevelUp = true;
  }
  return didLevelUp;
}

function showEvolutionScreen(pokemon) {
  const evoData = EVOLUTION_CHAINS[pokemon.name];
  document.getElementById('evo-title').innerText = `Was? ${pokemon.name} ist bereit!`;
  document.getElementById('evo-subtitle').innerText = `${pokemon.name} (Lv. ${pokemon.level})`;
  document.getElementById('evo-card-img').src = pokemon.cardUrl;
  document.getElementById('evo-chance-info').innerText = `Entwicklungschance: ${pokemon.evoChance || 0}%`;
  document.getElementById('evo-screen').classList.remove('hidden');
}

function rollEvolution() {
  if (!pendingEvoPokemon) return;
  const roll = Math.floor(Math.random() * 100) + 1;
  const evoData = EVOLUTION_CHAINS[pendingEvoPokemon.name];
  const currentChance = pendingEvoPokemon.evoChance || 0;

  if (roll <= currentChance && evoData) {
    pendingEvoPokemon.name = evoData.next;
    pendingEvoPokemon.cardUrl = evoData.cardUrl;
    pendingEvoPokemon.maxHp += evoData.hpBonus;
    pendingEvoPokemon.hp = pendingEvoPokemon.maxHp;
    pendingEvoPokemon.evoChance = 0;
    saveCurrentData();
    alert(`🎉 Glückwunsch! Dein Pokémon hat sich zu ${pendingEvoPokemon.name} entwickelt!`);
  } else {
    playBeep(300, 0.3);
    alert(`Fast geschafft! Die Entwicklung hat noch nicht geklappt.`);
  }

  document.getElementById('evo-screen').classList.add('hidden');
  showScreen('screen-radar-hud');
}

function closeVictoryOverlay() {
  document.getElementById('victory-screen').classList.add('hidden');
  showScreen('screen-radar-hud');
}

function addTrainerExp(amount) {
  currentSaveData.exp += amount;
  if (currentSaveData.exp >= currentSaveData.maxExp) {
    currentSaveData.level++;
    currentSaveData.exp -= currentSaveData.maxExp;
    currentSaveData.maxExp = Math.round(currentSaveData.maxExp * 1.5);
    alert(`🎉 LEVEL UP! Du bist jetzt Trainer Level ${currentSaveData.level}!`);
  }
}

function playBeep(pitch = 440, duration = 0.1) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = pitch;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

/* =========================================================
   6. MENÜ OVERLAY LOGIK
   ========================================================= */
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
  closeMenuModal();
  cancelScan();
  saveCurrentData();
  updateSlotUI();
  showScreen('screen-main-menu');
}

/* BACKUP SYSTEM */
function exportSaveGame() {
  const backup = {
    slot1: localStorage.getItem('pokemon_rl_slot_1'),
    slot2: localStorage.getItem('pokemon_rl_slot_2'),
    slot3: localStorage.getItem('pokemon_rl_slot_3')
  };
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pokemon_rpg_backup.json';
  a.click();
}

function triggerImport() {
  document.getElementById('import-file-input').click();
}

function importSaveGame(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.slot1) localStorage.setItem('pokemon_rl_slot_1', data.slot1);
      if (data.slot2) localStorage.setItem('pokemon_rl_slot_2', data.slot2);
      if (data.slot3) localStorage.setItem('pokemon_rl_slot_3', data.slot3);
      alert("Spielstand erfolgreich wiederhergestellt!");
      location.reload();
    } catch (err) { alert("Fehlerhafte Datei."); }
  };
  reader.readAsText(file);
}

// 7. INTRO ENGINE STARTEN
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => IntroManager.init());
} else {
  IntroManager.init();
}
