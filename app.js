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

