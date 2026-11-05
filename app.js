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
      requestCompassPermission();
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
    requestCompassPermission();
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
  { name: "Taubsi", type: "normal", hp: 40, maxHp: 40, cardUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/16.png", weakness: "elektro" },
  { name: "Rattfratz", type: "normal", hp: 30, maxHp: 30, cardUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/19.png", weakness: "kampf" },
  { name: "Raupy", type: "käfer", hp: 35, maxHp: 35, cardUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10.png", weakness: "feuer" },
  { name: "Enton", type: "wasser", hp: 50, maxHp: 50, cardUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/54.png", weakness: "elektro" }
];

const RARE_POKEMON = [
  { name: "Pikachu", type: "elektro", hp: 45, maxHp: 45, cardUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png", weakness: "boden" },
  { name: "Fukano", type: "feuer", hp: 55, maxHp: 55, cardUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/58.png", weakness: "wasser" },
  { name: "Kleinstein", type: "gestein", hp: 60, maxHp: 60, cardUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/74.png", weakness: "wasser" }
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
  requestCompassPermission();
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

function requestCompassPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
        }
      })
      .catch(console.error);
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

function openScanModal() {
  requestCompassPermission();
  if (isScanning || targetPokemonCoords) {
    cancelScan();
    return;
  }
  document.getElementById('modal-scan').classList.remove('hidden');
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
    bisasam: { name: "Bisasam", type: "pflanze", level: 1, hp: 44, maxHp: 44, cardUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png", weakness: "feuer", evoChance: 0 },
    glumanda: { name: "Glumanda", type: "feuer", level: 1, hp: 50, maxHp: 50, cardUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png", weakness: "wasser", evoChance: 0 },
    schiggy: { name: "Schiggy", type: "wasser", level: 1, hp: 50, maxHp: 50, cardUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png", weakness: "pflanze", evoChance: 0 }
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
          <div style="font-size:11px; color:#4cd137;">KP: ${p.hp}/${p.maxHp}</div>
        </div>
      </div>
      ${idx === 0 ? '<span class="tag-active">Aktiv</span>' : ''}
    `;
    container.appendChild(row);
  });
}

/* =========================================================
   4. RADAR & SCAN LOGIK
   ========================================================= */
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

  let durationMs = (type === 'quick') ? 4000 : 8000;

  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    triggerSignalDetected();
  }, durationMs);
}

function forceDevSpawn() {
  isScanning = false;
  currentScanType = 'quick';
  triggerSignalDetected();
}

function triggerSignalDetected() {
  isScanning = false;

  if (currentPosition) {
    const randomDistance = Math.random() * (3 - 0.5) + 0.5;
    const randomBearing = Math.random() * 360;
    targetPokemonCoords = calculateDestination(currentPosition.lat, currentPosition.lon, randomDistance, randomBearing);
  } else {
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
  
  if (scareBtn) scareBtn.classList.remove('hidden');

  if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 800]);
  playBeep(880, 0.4);
  sendNotification("Pokémon MOVE", "⚠️ Ein wildes Pokémon ist in deiner Nähe aufgetaucht!");

  updateBlipPosition();
}

function scarePokemon() {
  if (!currentPosition) return;
  const randomDistance = Math.random() * (3 - 0.5) + 0.5;
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

  document.getElementById('radar-status-text').innerText = `Entfernung: ~${Math.round(distMeters)}m`;

  if (distMeters <= 4) {
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

/* =========================================================
   5. KAMPF- & FANGSYSTEM
   ========================================================= */
function startBattleFromScan() {
  isTrainingMode = false;
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
  document.getElementById('battle-warning-box').innerText = `Ein wildes ${currentEnemy.name} ist aufgetaucht!`;
  
  // Fangen sofort starten
  CatchEngine.startCatchSession();
}

function updateBattleUI() {
  if (!currentEnemy || !playerBattlePokemon) return;

  document.getElementById('enemy-title').innerText = "WILDES " + currentEnemy.name.toUpperCase();
  document.getElementById('enemy-card-img').src = currentEnemy.cardUrl;
  document.getElementById('enemy-hp-text').innerText = `${currentEnemy.hp} / ${currentEnemy.maxHp} KP`;
  document.getElementById('enemy-hp-bar').style.width = Math.max(0, (currentEnemy.hp / currentEnemy.maxHp) * 100) + "%";

  document.getElementById('player-title').innerText = playerBattlePokemon.name.toUpperCase();
  document.getElementById('player-hp-text').innerText = `${playerBattlePokemon.hp} / ${playerBattlePokemon.maxHp} KP`;
}

function toggleCatchMode() {
  if (CatchEngine.active) {
    CatchEngine.stopCatchSession();
  } else {
    CatchEngine.startCatchSession();
  }
}

/* =========================================================
   POKÉMON GO FULLSCREEN CATCH ENGINE
   ========================================================= */
const CatchEngine = {
  active: false,
  isDragging: false,
  isSpinning: false,
  ringScale: 1.0,
  ringTimer: null,
  eventsBound: false,
  
  startX: 0, startY: 0, startTime: 0,
  lastX: 0, lastY: 0,
  spinHistory: [],

  initEvents() {
    if (this.eventsBound) return;
    const ball = document.getElementById('catch-throw-ball');
    if (!ball) return;

    const startDrag = (e) => {
      if (!this.active) return;
      const pt = e.touches ? e.touches[0] : e;
      this.isDragging = true;
      
      this.startX = pt.clientX;
      this.startY = pt.clientY;
      this.lastX = pt.clientX;
      this.lastY = pt.clientY;
      this.startTime = performance.now();
      this.spinHistory = [];

      ball.classList.add('dragging');
      ball.style.left = pt.clientX + 'px';
      ball.style.top = pt.clientY + 'px';
    };

    const moveDrag = (e) => {
      if (!this.active || !this.isDragging) return;
      const pt = e.touches ? e.touches[0] : e;
      
      const dx = pt.clientX - this.lastX;
      const dy = pt.clientY - this.lastY;
      this.spinHistory.push({ dx, dy, time: performance.now() });
      if (this.spinHistory.length > 8) this.spinHistory.shift();

      this.detectCurveSpin();

      ball.style.left = pt.clientX + 'px';
      ball.style.top = pt.clientY + 'px';

      this.lastX = pt.clientX;
      this.lastY = pt.clientY;
    };

    const endDrag = (e) => {
      if (!this.active || !this.isDragging) return;
      this.isDragging = false;
      ball.classList.remove('dragging');

      const pt = e.changedTouches ? e.changedTouches[0] : e;
      const duration = (performance.now() - this.startTime) / 1000;
      
      const deltaX = pt.clientX - this.startX;
      const deltaY = pt.clientY - this.startY;

      if (deltaY < -40 && duration < 0.9) {
        this.performThrow(deltaX, deltaY, duration, pt.clientX, pt.clientY);
      } else {
        this.resetBallPosition();
      }
    };

    ball.addEventListener('touchstart', startDrag, { passive: true });
    window.addEventListener('touchmove', moveDrag, { passive: true });
    window.addEventListener('touchend', endDrag);

    ball.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', endDrag);

    this.eventsBound = true;
  },

  startCatchSession() {
    this.active = true;
    this.isDragging = false;
    this.isSpinning = false;
    this.ringScale = 1.0;

    const ball = document.getElementById('catch-throw-ball');
    const ring = document.getElementById('target-ring-outer');

    if (ball) ball.classList.remove('hidden');
    if (ring) ring.classList.remove('hidden');

    this.resetBallPosition();
    this.startRingShrink();
    this.initEvents();
  },

  stopCatchSession() {
    this.active = false;
    clearInterval(this.ringTimer);
    const ball = document.getElementById('catch-throw-ball');
    const ring = document.getElementById('target-ring-outer');
    if (ball) ball.classList.add('hidden');
    if (ring) ring.classList.add('hidden');
  },

  startRingShrink() {
    clearInterval(this.ringTimer);
    const innerRing = document.getElementById('target-ring-inner');
    
    this.ringTimer = setInterval(() => {
      this.ringScale -= 0.03;
      if (this.ringScale <= 0.2) this.ringScale = 1.0;
      
      if (innerRing) {
        innerRing.style.transform = `scale(${this.ringScale})`;
        innerRing.style.borderColor = this.ringScale < 0.4 ? '#ff2e55' : (this.ringScale < 0.7 ? '#ffcb05' : '#10b981');
      }
    }, 30);
  },

  detectCurveSpin() {
    if (this.spinHistory.length < 4) return;
    let angleChange = 0;
    for (let i = 1; i < this.spinHistory.length; i++) {
      const a1 = Math.atan2(this.spinHistory[i-1].dy, this.spinHistory[i-1].dx);
      const a2 = Math.atan2(this.spinHistory[i].dy, this.spinHistory[i].dx);
      angleChange += (a2 - a1);
    }
    
    if (Math.abs(angleChange) > 1.8 && !this.isSpinning) {
      this.isSpinning = true;
      const ball = document.getElementById('catch-throw-ball');
      if (ball) ball.classList.add('spinning');
    }
  },

  resetBallPosition() {
    const ball = document.getElementById('catch-throw-ball');
    if (!ball) return;
    
    ball.className = 'catch-throw-ball';
    ball.style.left = (window.innerWidth / 2) + 'px';
    ball.style.top = (window.innerHeight - 80) + 'px';
    ball.style.transform = 'translate(-50%, -50%) scale(1.2)';
    this.isSpinning = false;
  },

  performThrow(deltaX, deltaY, duration, releaseX, releaseY) {
    clearInterval(this.ringTimer);
    const ball = document.getElementById('catch-throw-ball');
    if (!ball) return;
    
    const enemyImg = document.getElementById('enemy-card-img');
    const enemyRect = enemyImg ? enemyImg.getBoundingClientRect() : { left: window.innerWidth / 2 - 60, top: 200, width: 120, height: 120 };
    
    const targetCenterX = enemyRect.left + enemyRect.width / 2;
    const targetCenterY = enemyRect.top + enemyRect.height / 2;

    const velocityScale = Math.min(1.6, 350 / (duration * 1000));
    const targetX = releaseX + (deltaX * 0.85 * velocityScale);
    const targetY = releaseY + (deltaY * 1.2 * velocityScale);

    const isCurve = this.isSpinning;
    const curveOffset = isCurve ? (deltaX >= 0 ? 120 : -120) : 0;

    const startLeft = releaseX;
    const startTop = releaseY;

    const startTime = performance.now();
    const throwDuration = 450;

    const animateThrow = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / throwDuration);

      const currentX = startLeft + (targetX - startLeft) * progress + (Math.sin(progress * Math.PI) * curveOffset);
      const currentTop = startTop + (targetY - startTop) * progress;
      
      // PERSPEKTIVISCHER SCALE: Ball wird kleiner, je weiter er nach hinten fliegt!
      const currentScale = 1.2 - (progress * 0.7);

      ball.style.left = currentX + 'px';
      ball.style.top = currentTop + 'px';
      ball.style.transform = `translate(-50%, -50%) scale(${currentScale})`;

      if (progress < 1) {
        requestAnimationFrame(animateThrow);
      } else {
        this.evaluateHit(currentX, currentTop, targetCenterX, targetCenterY, enemyRect, isCurve);
      }
    };

    requestAnimationFrame(animateThrow);
  },

  evaluateHit(ballX, ballY, targetX, targetY, enemyRect, isCurve) {
    const hitRadius = (enemyRect.width / 2) + 35; 
    const dist = Math.hypot(ballX - targetX, ballY - targetY);

    if (dist <= hitRadius) {
      let throwBonus = 1.0;
      let feedbackText = "TREFFER!";

      const ratio = dist / hitRadius;
      if (ratio < 0.35) {
        throwBonus = 1.8;
        feedbackText = "FABELHAFT!";
      } else if (ratio < 0.65) {
        throwBonus = 1.4;
        feedbackText = "GROSSARTIG!";
      }

      if (isCurve) {
        throwBonus *= 1.5;
        feedbackText += " (CURVE)";
      }

      this.showFeedback(feedbackText);
      this.triggerCatchSequence(throwBonus);
    } else {
      this.showFeedback("DANEBEN!");
      setTimeout(() => {
        this.resetBallPosition();
        this.startRingShrink();
      }, 800);
    }
  },

  showFeedback(text) {
    const fb = document.getElementById('throw-feedback');
    if (!fb) return;
    fb.innerText = text;
    fb.classList.remove('hidden');
    setTimeout(() => fb.classList.add('hidden'), 1200);
  },

  triggerCatchSequence(throwBonus) {
    const ball = document.getElementById('catch-throw-ball');
    const enemyImg = document.getElementById('enemy-card-img');
    const ring = document.getElementById('target-ring-outer');
    
    if (ring) ring.classList.add('hidden');

    if (enemyImg) {
      enemyImg.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
      enemyImg.style.transform = 'scale(0.05) rotate(360deg)';
      enemyImg.style.opacity = '0';
    }

    setTimeout(() => {
      if (ball) ball.classList.add('wobble');
      playBeep(600, 0.15);

      const baseChance = 0.85;
      const finalChance = Math.min(0.98, baseChance * throwBonus);

      let wobbles = 0;
      const wobbleInterval = setInterval(() => {
        wobbles++;
        playBeep(500 + (wobbles * 120), 0.12);

        if (wobbles >= 3) {
          clearInterval(wobbleInterval);
          if (ball) ball.classList.remove('wobble');

          if (Math.random() <= finalChance) {
            playBeep(1200, 0.4);
            this.stopCatchSession();
            if (enemyImg) {
              enemyImg.style.transform = 'scale(1)';
              enemyImg.style.opacity = '1';
            }

            currentSaveData.pokemonTeam.push({
              name: currentEnemy.name,
              type: currentEnemy.type,
              level: 1,
              hp: currentEnemy.maxHp,
              maxHp: currentEnemy.maxHp,
              cardUrl: currentEnemy.cardUrl
            });

            addTrainerExp(35);
            saveCurrentData();
            alert(`🎉 Super! Du hast ${currentEnemy.name} gefangen!`);
            showScreen('screen-radar-hud');
          } else {
            playBeep(300, 0.3);
            this.stopCatchSession();
            if (enemyImg) {
              enemyImg.style.transform = 'scale(1)';
              enemyImg.style.opacity = '1';
            }
            alert(`${currentEnemy.name} ist ausgebrochen!`);
          }
        }
      }, 650);
    }, 400);
  }
};

function executePlayerAttack() {
  alert("Du greifst an!");
}

function executePlayerSpecial() {
  alert("Spezialangriff!");
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
   6. MENÜ OVERLAY LOGIK & EXPORT
   ========================================================= */
function openMenuModal() {
  loadDashboard();
  document.getElementById('modal-menu').classList.remove('hidden');
}

function closeMenuModal() {
  document.getElementById('modal-menu').classList.add('hidden');
}

function exitToMainMenu() {
  closeMenuModal();
  cancelScan();
  saveCurrentData();
  updateSlotUI();
  showScreen('screen-main-menu');
}

// INTRO ENGINE STARTEN
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => IntroManager.init());
} else {
  IntroManager.init();
}
