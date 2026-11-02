// SERVICE WORKER REGISTRIERUNG FÜR OFFLINE-PWA-BETRIEB
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[PWA] Service Worker registriert:', reg.scope))
      .catch(err => console.log('[PWA] Service Worker Fehler:', err));
  });
}

// Globales Audio-Unlocking für Koder / iOS WebViews
function unlockAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  window.removeEventListener('click', unlockAudio);
  window.removeEventListener('touchstart', unlockAudio);
}
window.addEventListener('click', unlockAudio);
window.addEventListener('touchstart', unlockAudio);

// EVOLUTIONS-PFADE & DATENBANK
const EVOLUTION_CHAINS = {
  "Glumanda": { next: "Glutexo", cardUrl: "https://images.pokemontcg.io/base1/24_hires.png", hpBonus: 20 },
  "Glutexo":  { next: "Glurak",  cardUrl: "https://images.pokemontcg.io/base1/4_hires.png",  hpBonus: 35 },
  "Bisasam":  { next: "Bisaknosp", cardUrl: "https://images.pokemontcg.io/base1/30_hires.png", hpBonus: 20 },
  "Bisaknosp":{ next: "Bisaflor",  cardUrl: "https://images.pokemontcg.io/base1/15_hires.png", hpBonus: 35 },
  "Schiggy":   { next: "Schillok", cardUrl: "https://images.pokemontcg.io/base1/42_hires.png", hpBonus: 20 },
  "Schillok":  { next: "Turtok",   cardUrl: "https://images.pokemontcg.io/base1/2_hires.png",  hpBonus: 35 }
};

// FULL KATALOG GENERATION 1 (Home Area)
const FULL_GEN1_CATALOG = [
  { name: "Taubsi", type: "normal", hp: 40, maxHp: 40, cardUrl: "https://images.pokemontcg.io/base1/57_hires.png", weakness: "elektro" },
  { name: "Rattfratz", type: "normal", hp: 30, maxHp: 30, cardUrl: "https://images.pokemontcg.io/base1/61_hires.png", weakness: "kampf" },
  { name: "Pikachu", type: "elektro", hp: 40, maxHp: 40, cardUrl: "https://images.pokemontcg.io/base1/58_hires.png", weakness: "boden" },
  { name: "Myrapla", type: "pflanze", hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/base1/58_hires.png", weakness: "feuer" },
  { name: "Raupy", type: "käfer", hp: 35, maxHp: 35, cardUrl: "https://images.pokemontcg.io/base1/45_hires.png", weakness: "feuer" },
  { name: "Hornliu", type: "käfer", hp: 35, maxHp: 35, cardUrl: "https://images.pokemontcg.io/base1/69_hires.png", weakness: "feuer" },
  { name: "Kleinstein", type: "gestein", hp: 55, maxHp: 55, cardUrl: "https://images.pokemontcg.io/base1/47_hires.png", weakness: "wasser" },
  { name: "Zubat", type: "gift", hp: 40, maxHp: 40, cardUrl: "https://images.pokemontcg.io/base1/70_hires.png", weakness: "elektro" },
  { name: "Psyduck", type: "wasser", hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/base1/53_hires.png", weakness: "elektro" },
  { name: "Fukano", type: "feuer", hp: 55, maxHp: 55, cardUrl: "https://images.pokemontcg.io/base1/28_hires.png", weakness: "wasser" },
  { name: "Quapsel", type: "wasser", hp: 45, maxHp: 45, cardUrl: "https://images.pokemontcg.io/base1/59_hires.png", weakness: "elektro" },
  { name: "Machollo", type: "kampf", hp: 60, maxHp: 60, cardUrl: "https://images.pokemontcg.io/base1/52_hires.png", weakness: "psycho" },
  { name: "Knofensa", type: "pflanze", hp: 45, maxHp: 45, cardUrl: "https://images.pokemontcg.io/base1/49_hires.png", weakness: "feuer" },
  { name: "Tentacha", type: "wasser", hp: 40, maxHp: 40, cardUrl: "https://images.pokemontcg.io/base1/66_hires.png", weakness: "elektro" },
  { name: "Ponyta", type: "feuer", hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/base1/60_hires.png", weakness: "wasser" },
  { name: "Flegmon", type: "wasser", hp: 60, maxHp: 60, cardUrl: "https://images.pokemontcg.io/base1/55_hires.png", weakness: "elektro" },
  { name: "Magnetilo", type: "elektro", hp: 40, maxHp: 40, cardUrl: "https://images.pokemontcg.io/base1/53_hires.png", weakness: "feuer" },
  { name: "Drowzee", type: "psycho", hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/base1/49_hires.png", weakness: "käfer" },
  { name: "Krabby", type: "wasser", hp: 45, maxHp: 45, cardUrl: "https://images.pokemontcg.io/base1/51_hires.png", weakness: "elektro" },
  { name: "Voltobal", type: "elektro", hp: 40, maxHp: 40, cardUrl: "https://images.pokemontcg.io/base1/67_hires.png", weakness: "boden" },
  { name: "Tragosso", type: "boden", hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/base1/50_hires.png", weakness: "wasser" },
  { name: "Smogon", type: "gift", hp: 45, maxHp: 45, cardUrl: "https://images.pokemontcg.io/base1/51_hires.png", weakness: "psycho" },
  { name: "Seeper", type: "wasser", hp: 40, maxHp: 40, cardUrl: "https://images.pokemontcg.io/base1/48_hires.png", weakness: "elektro" },
  { name: "Sterndu", type: "wasser", hp: 40, maxHp: 40, cardUrl: "https://images.pokemontcg.io/base1/65_hires.png", weakness: "elektro" },
  { name: "Pinsir", type: "käfer", hp: 65, maxHp: 65, cardUrl: "https://images.pokemontcg.io/base1/9_hires.png", weakness: "feuer" }
];

// FULL KATALOG GENERATION 2 (Out of Home Area)
const FULL_GEN2_CATALOG = [
  { name: "Feurigel", type: "feuer", hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/neo1/57_hires.png", weakness: "wasser" },
  { name: "Karnimani", type: "wasser", hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/neo1/81_hires.png", weakness: "pflanze" },
  { name: "Endivie", type: "pflanze", hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/neo1/54_hires.png", weakness: "feuer" },
  { name: "Wiesor", type: "normal", hp: 35, maxHp: 35, cardUrl: "https://images.pokemontcg.io/neo1/68_hires.png", weakness: "kampf" },
  { name: "Hoothoot", type: "normal", hp: 45, maxHp: 45, cardUrl: "https://images.pokemontcg.io/neo1/60_hires.png", weakness: "elektro" },
  { name: "Ledyba", type: "käfer", hp: 40, maxHp: 40, cardUrl: "https://images.pokemontcg.io/neo1/63_hires.png", weakness: "feuer" },
  { name: "Weeber", type: "käfer", hp: 40, maxHp: 40, cardUrl: "https://images.pokemontcg.io/neo1/73_hires.png", weakness: "feuer" },
  { name: "Lanturn", type: "elektro", hp: 65, maxHp: 65, cardUrl: "https://images.pokemontcg.io/neo1/38_hires.png", weakness: "boden" },
  { name: "Togepi", type: "normal", hp: 35, maxHp: 35, cardUrl: "https://images.pokemontcg.io/neo1/51_hires.png", weakness: "kampf" },
  { name: "Natu", type: "psycho", hp: 40, maxHp: 40, cardUrl: "https://images.pokemontcg.io/neo1/67_hires.png", weakness: "unlicht" },
  { name: "Voltilamm", type: "elektro", hp: 45, maxHp: 45, cardUrl: "https://images.pokemontcg.io/neo1/64_hires.png", weakness: "boden" },
  { name: "Marill", type: "wasser", hp: 55, maxHp: 55, cardUrl: "https://images.pokemontcg.io/neo1/66_hires.png", weakness: "elektro" },
  { name: "Mogelbaum", type: "gestein", hp: 70, maxHp: 70, cardUrl: "https://images.pokemontcg.io/neo1/27_hires.png", weakness: "wasser" },
  { name: "Hoppspross", type: "pflanze", hp: 35, maxHp: 35, cardUrl: "https://images.pokemontcg.io/neo1/61_hires.png", weakness: "feuer" },
  { name: "Griffel", type: "normal", hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/neo1/53_hires.png", weakness: "kampf" },
  { name: "Sonnefel", type: "pflanze", hp: 40, maxHp: 40, cardUrl: "https://images.pokemontcg.io/neo1/78_hires.png", weakness: "feuer" },
  { name: "Felino", type: "wasser", hp: 45, maxHp: 45, cardUrl: "https://images.pokemontcg.io/neo1/80_hires.png", weakness: "pflanze" },
  { name: "Kramurx", type: "unlicht", hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/neo1/44_hires.png", weakness: "elektro" },
  { name: "Traunfugil", type: "geist", hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/neo1/45_hires.png", weakness: "unlicht" },
  { name: "Icognito", type: "psycho", hp: 40, maxHp: 40, cardUrl: "https://images.pokemontcg.io/neo1/50_hires.png", weakness: "unlicht" },
  { name: "Tannza", type: "käfer", hp: 45, maxHp: 45, cardUrl: "https://images.pokemontcg.io/neo1/70_hires.png", weakness: "feuer" },
  { name: "Dummisel", type: "normal", hp: 60, maxHp: 60, cardUrl: "https://images.pokemontcg.io/neo1/56_hires.png", weakness: "kampf" },
  { name: "Skorgla", type: "boden", hp: 60, maxHp: 60, cardUrl: "https://images.pokemontcg.io/neo1/59_hires.png", weakness: "wasser" },
  { name: "Snubbull", type: "fee", hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/neo1/76_hires.png", weakness: "gift" },
  { name: "Pottrott", type: "käfer", hp: 80, maxHp: 80, cardUrl: "https://images.pokemontcg.io/neo1/49_hires.png", weakness: "feuer" }
];

let activeDailyGen1Pool = [];
let activeDailyGen2Pool = [];

// DAILY ROTATION ENGINE
function refreshDailyPoolsIfNeeded() {
  let today = new Date().toISOString().split('T')[0];
  let savedDate = localStorage.getItem('pokemon_rl_last_pool_date');
  let savedGen1 = localStorage.getItem('pokemon_rl_daily_gen1');
  let savedGen2 = localStorage.getItem('pokemon_rl_daily_gen2');

  if (savedDate !== today || !savedGen1 || !savedGen2) {
    let getRandomSubset = (arr, count) => {
      let shuffled = [...arr].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, Math.min(count, arr.length));
    };

    activeDailyGen1Pool = getRandomSubset(FULL_GEN1_CATALOG, 20);
    activeDailyGen2Pool = getRandomSubset(FULL_GEN2_CATALOG, 20);

    localStorage.setItem('pokemon_rl_last_pool_date', today);
    localStorage.setItem('pokemon_rl_daily_gen1', JSON.stringify(activeDailyGen1Pool));
    localStorage.setItem('pokemon_rl_daily_gen2', JSON.stringify(activeDailyGen2Pool));
  } else {
    activeDailyGen1Pool = JSON.parse(savedGen1);
    activeDailyGen2Pool = JSON.parse(savedGen2);
  }

  preloadDailyImages();
}

function preloadDailyImages() {
  let allDailyPokemon = [...activeDailyGen1Pool, ...activeDailyGen2Pool];
  allDailyPokemon.forEach(mon => {
    if (mon.cardUrl) {
      let img = new Image();
      img.src = mon.cardUrl;
    }
  });
}

async function getOrFetchEvolutionData(pokemon) {
  if (EVOLUTION_CHAINS[pokemon.name]) return EVOLUTION_CHAINS[pokemon.name];

  let cachedDb = JSON.parse(localStorage.getItem('customEvoDb') || '{}');
  if (cachedDb[pokemon.name]) return cachedDb[pokemon.name];

  try {
    let speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.name.toLowerCase()}`);
    let speciesData = await speciesRes.json();
    
    let evoChainRes = await fetch(speciesData.evolution_chain.url);
    let evoData = await evoChainRes.json();

    let nextMonName = getNextEvoInChain(evoData.chain, pokemon.name.toLowerCase());
    if (!nextMonName) return null;

    let tcgRes = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${nextMonName}"`);
    let tcgData = await tcgRes.json();
    let cardUrl = tcgData.data[0]?.images?.large || tcgData.data[0]?.images?.small;

    let newEvoEntry = {
      next: nextMonName.charAt(0).toUpperCase() + nextMonName.slice(1),
      cardUrl: cardUrl || "https://images.pokemontcg.io/base1/61_hires.png",
      hpBonus: 25
    };

    cachedDb[pokemon.name] = newEvoEntry;
    localStorage.setItem('customEvoDb', JSON.stringify(cachedDb));
    return newEvoEntry;
  } catch (e) {
    return null;
  }
}

function getNextEvoInChain(chainNode, currentName) {
  if (chainNode.species.name === currentName) {
    return chainNode.evolves_to[0]?.species?.name || null;
  }
  for (let child of chainNode.evolves_to) {
    let result = getNextEvoInChain(child, currentName);
    if (result) return result;
  }
  return null;
}

let pendingEvoPokemon = null;
let activeSlot = null;
let map = null;
let selectedMarker = null;
let tempHomeCoords = null;
let selectedStarter = null;

let isWalking = false;
let userLat = 0, userLon = 0;
let lastLat = 0, lastLon = 0;
let targetLat = null, targetLon = null;
let timerMinutes = 0;
let audioCtx = null;
let beepInterval = null;
let encounterActive = false;
let checkInterval = null;
let watchId = null;

let currentEnemy = null;
let playerBattlePokemon = null;
let playerEnergy = 0;
let canDodge = false;
let dodgeSuccess = false;
let isEnemyAttacking = false;
let isPerfectTiming = false;
let isTrainingBattle = false;
let selectedTrainingPokemon = null;
let isPlayerTurn = true;

let currentSaveData = {
  homeLat: null,
  homeLon: null,
  level: 1,
  exp: 0,
  maxExp: 100,
  pokeballs: 10,
  pokemonTeam: []
};

function initApp() {
  refreshDailyPoolsIfNeeded();
  updateSlotUI();
}

function updateSlotUI() {
  for (let i = 1; i <= 3; i++) {
    let data = localStorage.getItem('pokemon_rl_slot_' + i);
    let infoDiv = document.getElementById(`slot-${i}-info`);
    if (infoDiv) {
      if (data) {
        let parsed = JSON.parse(data);
        infoDiv.innerHTML = `Trainer Lv. ${parsed.level} | ${parsed.pokemonTeam[0]?.name || 'Kein Pokémon'}`;
      } else {
        infoDiv.innerText = "Leer";
      }
    }
  }
}

function selectSlot(slotNum) {
  activeSlot = slotNum;
  let saved = localStorage.getItem('pokemon_rl_slot_' + activeSlot);

  if (saved) {
    currentSaveData = JSON.parse(saved);
    showScreen('screen-dashboard');
    loadDashboard();
  } else {
    currentSaveData = { homeLat: null, homeLon: null, level: 1, exp: 0, maxExp: 100, pokeballs: 10, pokemonTeam: [] };
    showScreen('screen-home');
    initMap();
  }
}

function showScreen(screenId) {
  ['screen-slots', 'screen-home', 'screen-starter', 'screen-dashboard', 'screen-battle'].forEach(id => {
    let elem = document.getElementById(id);
    if (elem) elem.classList.add('hidden');
  });
  let activeElem = document.getElementById(screenId);
  if (activeElem) activeElem.classList.remove('hidden');

  if (screenId === 'screen-home' && map) {
    setTimeout(() => { map.invalidateSize(); }, 200);
  }
}

function switchTab(tabName) {
  ['walk', 'pokemon', 'items', 'trainer'].forEach(t => {
    let content = document.getElementById(`tab-content-${t}`);
    let btn = document.getElementById(`tab-btn-${t}`);
    if (content) content.classList.add('hidden');
    if (btn) btn.classList.remove('active');
  });

  let activeContent = document.getElementById(`tab-content-${tabName}`);
  let activeBtn = document.getElementById(`tab-btn-${tabName}`);
  if (activeContent) activeContent.classList.remove('hidden');
  if (activeBtn) activeBtn.classList.add('active');
}

function initMap() {
  if (map) return;
  map = L.map('map').setView([51.1657, 10.4515], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

  map.on('click', e => setHomePin(e.latlng.lat, e.latlng.lng));
  setTimeout(() => map.invalidateSize(), 300);
}

function setHomePin(lat, lng) {
  tempHomeCoords = { lat, lng };
  if (selectedMarker) map.removeLayer(selectedMarker);
  selectedMarker = L.marker([lat, lng]).addTo(map);
  let confirmBtn = document.getElementById('confirm-home-btn');
  if (confirmBtn) confirmBtn.disabled = false;
}

function confirmHomeLocation() {
  if (!tempHomeCoords) return;
  currentSaveData.homeLat = tempHomeCoords.lat;
  currentSaveData.homeLon = tempHomeCoords.lng;
  showScreen('screen-starter');
}

function chooseStarter(type, element) {
  document.querySelectorAll('.starter-card').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
  selectedStarter = type;
  let confirmBtn = document.getElementById('confirm-starter-btn');
  if (confirmBtn) confirmBtn.disabled = false;
}

function confirmStarter() {
  let starterData = {
    bisasam: { name: "Bisasam", type: "pflanze", level: 1, hp: 44, maxHp: 44, cardUrl: "https://images.pokemontcg.io/base1/44_hires.png", weakness: "feuer", evoChance: 0 },
    glumanda: { name: "Glumanda", type: "feuer", level: 1, hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/base1/46_hires.png", weakness: "wasser", evoChance: 0 },
    schiggy: { name: "Schiggy", type: "wasser", level: 1, hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/base1/63_hires.png", weakness: "pflanze", evoChance: 0 }
  };

  currentSaveData.pokemonTeam = [starterData[selectedStarter]];
  currentSaveData.pokeballs = 10;
  saveCurrentData();
  showScreen('screen-dashboard');
  loadDashboard();
}

function saveCurrentData() {
  localStorage.setItem('pokemon_rl_slot_' + activeSlot, JSON.stringify(currentSaveData));
}

function loadDashboard() {
  let slotTitle = document.getElementById('dash-slot-title');
  if (slotTitle) slotTitle.innerText = "Slot " + activeSlot;
  
  let ballsCount = document.getElementById('item-pokeballs-count');
  if (ballsCount) ballsCount.innerText = currentSaveData.pokeballs;
  
  let levelText = document.getElementById('trainer-level-text');
  if (levelText) levelText.innerText = "Level " + currentSaveData.level;

  let expPct = Math.min(100, (currentSaveData.exp / currentSaveData.maxExp) * 100);
  let expBar = document.getElementById('trainer-exp-bar');
  if (expBar) expBar.style.width = expPct + "%";

  let expText = document.getElementById('trainer-exp-text');
  if (expText) expText.innerText = `${currentSaveData.exp} / ${currentSaveData.maxExp} EXP`;

  let homeCoords = document.getElementById('trainer-home-coords');
  if (homeCoords && currentSaveData.homeLat && currentSaveData.homeLon) {
    homeCoords.innerText = `${currentSaveData.homeLat.toFixed(4)}, ${currentSaveData.homeLon.toFixed(4)}`;
  }

  let caughtCount = document.getElementById('trainer-caught-count');
  if (caughtCount) caughtCount.innerText = currentSaveData.pokemonTeam.length;

  if (currentSaveData.pokemonTeam) {
    currentSaveData.pokemonTeam.forEach(p => {
      if (!p.level) p.level = 1;
      if (!p.exp) p.exp = 0;
      if (!p.maxExp) p.maxExp = p.level * 15;
      if (p.evoChance === undefined) p.evoChance = 0;
    });
    saveCurrentData();
  }

  renderPokemonTeam();

  if (currentSaveData.pokemonTeam.length > 0) {
    let activeMon = document.getElementById('dash-active-pokemon');
    if (activeMon) activeMon.innerText = currentSaveData.pokemonTeam[0].name;
  }

  updateGPSDistance();
}

function renderPokemonTeam() {
  let container = document.getElementById('pokemon-team-list');
  if (!container) return;
  container.innerHTML = "";

  currentSaveData.pokemonTeam.forEach((p, idx) => {
    let row = document.createElement('div');
    row.className = "pokemon-row";
    row.style.cursor = "pointer";
    row.onclick = () => onPokemonClick(idx);

    row.innerHTML = `
      <div style="display:flex; align-items:center;">
        <img src="${p.cardUrl}" alt="${p.name}">
        <div>
          <strong>${p.name}</strong> <span style="font-size:11px; color:#aaa;">Lv. ${p.level}</span>
          <div style="font-size:12px; color:#4cd137; margin-top:2px;">KP: ${p.hp} / ${p.maxHp} | Evo: ${p.evoChance || 0}%</div>
        </div>
      </div>
      ${idx === 0 ? '<span class="tag tag-gen1">Aktiv</span>' : ''}
    `;
    container.appendChild(row);
  });
}

function updateGPSDistance() {
  if (userLat === 0 || userLon === 0 || !currentSaveData.homeLat) return;
  let dist = calculateDistanceKm(userLat, userLon, currentSaveData.homeLat, currentSaveData.homeLon);
  let distElement = document.getElementById('dash-dist');
  if (distElement) distElement.innerText = dist.toFixed(2) + " km";

  let zoneTag = document.getElementById('dash-zone-tag');
  if (zoneTag) {
    if (dist >= 0.5) {
      zoneTag.innerText = "Gen 2+ Zone";
      zoneTag.className = "tag tag-gen2";
    } else {
      zoneTag.innerText = "Gen 1 Zone";
      zoneTag.className = "tag tag-gen1";
    }
  }
}

function startWalk() {
  unlockAudio();
  refreshDailyPoolsIfNeeded();
  isWalking = true;

  let idleState = document.getElementById('walk-idle-state');
  let activeState = document.getElementById('walk-active-state');
  if (idleState) idleState.classList.add('hidden');
  if (activeState) activeState.classList.remove('hidden');

  if ("geolocation" in navigator) {
    watchId = navigator.geolocation.watchPosition(pos => {
      userLat = pos.coords.latitude;
      userLon = pos.coords.longitude;
      if (lastLat === 0 && lastLon === 0) { lastLat = userLat; lastLon = userLon; }

      updateGPSDistance();

      if (encounterActive && targetLat !== null) {
        let distMeters = calculateDistanceKm(userLat, userLon, targetLat, targetLon) * 1000;
        let radarDist = document.getElementById('radar-distance');
        if (radarDist) radarDist.innerText = Math.round(distMeters) + " m";
        updateBeepFrequency(distMeters);

        if (distMeters <= 5) triggerCatchPhase();
      }
    }, err => {}, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
  }

  checkInterval = setInterval(checkEncounterChance, 60000);
}

function stopWalk() {
  isWalking = false;
  encounterActive = false;
  if (checkInterval) clearInterval(checkInterval);
  if (beepInterval) clearInterval(beepInterval);
  if (watchId && navigator.geolocation) navigator.geolocation.clearWatch(watchId);

  let idleState = document.getElementById('walk-idle-state');
  let activeState = document.getElementById('walk-active-state');
  let radarCard = document.getElementById('radar-card');
  if (idleState) idleState.classList.remove('hidden');
  if (activeState) activeState.classList.add('hidden');
  if (radarCard) radarCard.classList.add('hidden');
}

function checkEncounterChance() {
  if (encounterActive || !isWalking) return;
  timerMinutes++;
  let chance = Math.min(timerMinutes * 0.05, 1.0);

  if (Math.random() <= chance) {
    spawnPokemonNearUser();
    lastLat = userLat;
    lastLon = userLon;
  }
}

function spawnPokemonNearUser() {
  encounterActive = true;
  timerMinutes = 0;
  let radiusInMeters = 40;
  let getRandomOffset = () => (Math.random() - 0.5) * (radiusInMeters / 111320);

  targetLat = userLat + getRandomOffset();
  targetLon = userLon + getRandomOffset();

  let radarCard = document.getElementById('radar-card');
  let startBtn = document.getElementById('btn-start-battle');
  if (radarCard) radarCard.classList.remove('hidden');
  if (startBtn) startBtn.classList.add('hidden');
  playBeep(880, 0.3);
}

function playBeep(pitch = 440, duration = 0.1) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = pitch;
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch(e) {}
}

function updateBeepFrequency(distanceMeters) {
  if (beepInterval) clearInterval(beepInterval);
  let intervalMs = Math.max(200, distanceMeters * 30);

  beepInterval = setInterval(() => {
    let pitch = Math.min(1200, 1000 - (distanceMeters * 10));
    playBeep(Math.max(400, pitch), 0.08);
  }, intervalMs);
}

function triggerCatchPhase() {
  if (beepInterval) clearInterval(beepInterval);
  playBeep(1200, 0.5);
  let distElem = document.getElementById('radar-distance');
  let instrElem = document.getElementById('radar-instruction');
  let startBtn = document.getElementById('btn-start-battle');
  if (distElem) distElem.innerText = "GEFUNDEN!";
  if (instrElem) instrElem.innerText = "Ein wildes Pokémon ist aufgetaucht!";
  if (startBtn) startBtn.classList.remove('hidden');
}

function startBattle() {
  stopWalk();
  showScreen('screen-battle');

  isTrainingBattle = false;
  refreshDailyPoolsIfNeeded();

  let distFromHome = calculateDistanceKm(userLat, userLon, currentSaveData.homeLat, currentSaveData.homeLon);
  let pool = (distFromHome >= 0.5) 
    ? [...activeDailyGen1Pool, ...activeDailyGen2Pool] 
    : activeDailyGen1Pool;
  
  let template = pool[Math.floor(Math.random() * pool.length)];
  currentEnemy = { ...template, hp: template.maxHp };

  playerBattlePokemon = currentSaveData.pokemonTeam[0];
  playerEnergy = 0;
  isPlayerTurn = true;
  isEnemyAttacking = false;

  updateBattleUI();
  let box = document.getElementById('battle-warning-box');
  if (box) box.innerText = `Ein wildes ${currentEnemy.name} greift an! Du bist am Zug.`;
}

function startTrainingBattle(opponent) {
  closeTrainingSelect();
  showScreen('screen-battle');

  isTrainingBattle = true;

  currentEnemy = { ...opponent, hp: opponent.maxHp };
  playerBattlePokemon = selectedTrainingPokemon || currentSaveData.pokemonTeam[0];
  playerEnergy = 0;
  isPlayerTurn = true;
  isEnemyAttacking = false;

  updateBattleUI();
  let box = document.getElementById('battle-warning-box');
  if (box) box.innerText = `Trainingskampf gestartet! Du bist am Zug.`;
}

function updateBattleUI() {
  if (!currentEnemy || !playerBattlePokemon) return;

  let enemyTitle = document.getElementById('enemy-title');
  let enemyCard = document.getElementById('enemy-card-img');
  let enemyHpText = document.getElementById('enemy-hp-text');
  let enemyHpBar = document.getElementById('enemy-hp-bar');

  if (enemyTitle) enemyTitle.innerText = (isTrainingBattle ? "TRAINING: " : "WILDES ") + currentEnemy.name.toUpperCase();
  if (enemyCard) enemyCard.src = currentEnemy.cardUrl;
  if (enemyHpText) enemyHpText.innerText = `${currentEnemy.hp} / ${currentEnemy.maxHp} KP`;
  if (enemyHpBar) enemyHpBar.style.width = Math.max(0, (currentEnemy.hp / currentEnemy.maxHp) * 100) + "%";

  let playerTitle = document.getElementById('player-title');
  let playerCard = document.getElementById('player-card-img');
  let playerHpText = document.getElementById('player-hp-text');
  let playerHpBar = document.getElementById('player-hp-bar');

  if (playerTitle) playerTitle.innerText = playerBattlePokemon.name.toUpperCase();
  if (playerCard) playerCard.src = playerBattlePokemon.cardUrl;
  if (playerHpText) playerHpText.innerText = `${playerBattlePokemon.hp} / ${playerBattlePokemon.maxHp} KP`;
  if (playerHpBar) playerHpBar.style.width = Math.max(0, (playerBattlePokemon.hp / playerBattlePokemon.maxHp) * 100) + "%";

  let ballsCount = document.getElementById('battle-balls-count');
  if (ballsCount) ballsCount.innerText = currentSaveData.pokeballs;

  let catchBtn = document.getElementById('btn-catch-pokemon');
  if (catchBtn) {
    if (isTrainingBattle) {
      catchBtn.disabled = true;
      catchBtn.style.opacity = "0.3";
    } else {
      catchBtn.disabled = false;
      catchBtn.style.opacity = "1";
    }
  }

  let dots = "";
  for(let i = 0; i < 3; i++) dots += (i < playerEnergy) ? "🟡 " : "⚪ ";
  let energyDots = document.getElementById('player-energy-dots');
  if (energyDots) energyDots.innerText = dots;

  let specBtn = document.getElementById('btn-special-attack');
  if (specBtn) {
    if (playerEnergy >= 3 && isPlayerTurn && !isEnemyAttacking) {
      specBtn.disabled = false;
      specBtn.style.opacity = "1";
    } else {
      specBtn.disabled = true;
      specBtn.style.opacity = "0.4";
    }
  }
}

// 4. SPIELER-ANGRIFF (Sicherer Runden-Ablauf mit Entprellung)
function executePlayerAttack() {
  if (!isPlayerTurn || isEnemyAttacking || !currentEnemy || currentEnemy.hp <= 0) return;

  isPlayerTurn = false;
  isEnemyAttacking = true;
  updateBattleUI();

  let card = document.getElementById('player-card-img');
  if (card) {
    card.classList.add('card-attack-anim');
    setTimeout(() => card.classList.remove('card-attack-anim'), 200);
  }

  let box = document.getElementById('battle-warning-box');

  let enemyDodged = Math.random() < 0.25;
  if (enemyDodged) {
    if (box) box.innerText = `💨 ${currentEnemy.name} ist flink ausgewichen! (0 KP)`;
    playBeep(350, 0.15);

    let enemyCard = document.getElementById('enemy-card-img');
    if (enemyCard) {
      enemyCard.style.transform = "translateX(25px)";
      setTimeout(() => enemyCard.style.transform = "translateX(0)", 150);
    }

    addEnergy(1);
    updateBattleUI();
    setTimeout(scheduleEnemyAttack, 1000);
    return;
  }

  let baseDmg = Math.round(playerBattlePokemon.maxHp * 0.25);
  let isCritical = Math.random() < 0.15;
  let dmg = isCritical ? baseDmg * 2 : baseDmg;

  let isEffective = currentEnemy.weakness === playerBattlePokemon.type;
  if (isEffective) dmg = Math.round(dmg * 1.5);

  if (box) {
    if (isCritical && isEffective) {
      box.innerText = `🎯 VOLLTREFFER! 🔥 Sehr effektiv! (-${dmg} KP)`;
      playBeep(1200, 0.2); setTimeout(() => playBeep(1600, 0.25), 100);
    } else if (isCritical) {
      box.innerText = `🎯 KRITISCHER TREFFER! (-${dmg} KP)`;
      playBeep(1100, 0.25);
    } else if (isEffective) {
      box.innerText = `Sehr effektiv! (-${dmg} KP)`;
      playBeep(600, 0.1);
    } else {
      box.innerText = `Angriff trifft! (-${dmg} KP)`;
      playBeep(600, 0.1);
    }
  }

  currentEnemy.hp = Math.max(0, currentEnemy.hp - dmg);
  addEnergy(1);
  updateBattleUI();

  if (currentEnemy.hp <= 0) { 
    isEnemyAttacking = false;
    winBattle(); 
    return; 
  }

  setTimeout(scheduleEnemyAttack, 1000);
}

function executePlayerSpecial() {
  if (!isPlayerTurn || playerEnergy < 3 || isEnemyAttacking || currentEnemy.hp <= 0) return;

  isPlayerTurn = false;
  isEnemyAttacking = true;
  playerEnergy = 0;
  updateBattleUI();

  let dmg = Math.round(playerBattlePokemon.maxHp * 0.70);

  let playerCard = document.getElementById('player-card-img');
  let enemyCard = document.getElementById('enemy-card-img');
  let battleScreen = document.getElementById('screen-battle');

  if (playerCard) {
    playerCard.classList.add('card-special-launch');
    setTimeout(() => playerCard.classList.remove('card-special-launch'), 400);
  }

  playBeep(250, 0.15);
  setTimeout(() => playBeep(900, 0.35), 150);

  setTimeout(() => {
    if (enemyCard) enemyCard.classList.add('card-fire-hit');
    if (battleScreen) battleScreen.classList.add('screen-shake');

    setTimeout(() => {
      if (enemyCard) enemyCard.classList.remove('card-fire-hit');
      if (battleScreen) battleScreen.classList.remove('screen-shake');
    }, 600);

    let box = document.getElementById('battle-warning-box');
    if (currentEnemy.weakness === playerBattlePokemon.type) {
      dmg = Math.round(dmg * 1.5);
      if (box) box.innerText = `SPEZIALKONTRA! 🔥 Sehr effektiv! (-${dmg} KP)`;
    } else {
      if (box) box.innerText = `SPEZIALANGRIFF! 🔥 (-${dmg} KP)`;
    }

    currentEnemy.hp = Math.max(0, currentEnemy.hp - dmg);
    updateBattleUI();

    if (currentEnemy.hp <= 0) { 
      isEnemyAttacking = false;
      winBattle(); 
      return; 
    }
    setTimeout(scheduleEnemyAttack, 1000);
  }, 200);
}

function addEnergy(amount) { playerEnergy = Math.min(3, playerEnergy + amount); }

// 6. GEGNER-ANGRIFF
function scheduleEnemyAttack() {
  if (!currentEnemy || currentEnemy.hp <= 0 || playerBattlePokemon.hp <= 0) {
    isEnemyAttacking = false;
    isPlayerTurn = true;
    updateBattleUI();
    return;
  }
  
  isEnemyAttacking = true;
  isPlayerTurn = false;
  updateBattleUI();

  let box = document.getElementById('battle-warning-box');
  let enemyCard = document.getElementById('enemy-card-img');
  let battleScreen = document.getElementById('screen-battle');

  let isSpecialAttack = Math.random() < 0.20;

  if (isSpecialAttack) {
    if (box) box.innerText = `🔥 ${currentEnemy.name} lädt einen SPEZIALANGRIFF auf!`;
    if (enemyCard) enemyCard.classList.add('card-special-launch');
    playBeep(300, 0.2);

    setTimeout(() => {
      if (enemyCard) enemyCard.classList.remove('card-special-launch');
      if (battleScreen) battleScreen.classList.add('screen-shake');
      
      let specDmg = Math.round(currentEnemy.maxHp * 0.40);
      playerBattlePokemon.hp = Math.max(0, playerBattlePokemon.hp - specDmg);

      if (box) box.innerText = `💥 GEGNER-SPEZIALANGRIFF TRIFFT VOLLE KANNE! (-${specDmg} KP)`;
      playBeep(200, 0.4);

      setTimeout(() => {
        if (battleScreen) battleScreen.classList.remove('screen-shake');
      }, 300);

      isEnemyAttacking = false;
      
      if (!checkPlayerDefeat()) {
        isPlayerTurn = true;
        updateBattleUI();
      }
    }, 1000);

    return;
  }

  let givesDodgeChance = Math.random() < 0.50;

  if (givesDodgeChance) {
    if (box) box.innerText = `⚠️ ${currentEnemy.name} holt Schwung...`;

    setTimeout(() => {
      if (box) {
        box.innerText = "🔴 JETZT AUSWEICHEN!";
        box.classList.add('warning-red');
      }
      canDodge = true;
      dodgeSuccess = false;
      isPerfectTiming = false;

      playBeep(900, 0.1);

      let timingTimer = setTimeout(() => { isPerfectTiming = true; }, 200);

      setTimeout(() => {
        clearTimeout(timingTimer);
        if (box) box.classList.remove('warning-red');
        canDodge = false;
        resolveEnemyAttack(true);
      }, 500);
    }, 600);

  } else {
    if (box) box.innerText = `⚡ ${currentEnemy.name} greift blitzschnell an!`;
    playBeep(400, 0.15);

    setTimeout(() => { resolveEnemyAttack(false); }, 600);
  }
}

function resolveEnemyAttack(hadDodgeChance) {
  let box = document.getElementById('battle-warning-box');
  let enemyDmg = Math.round(currentEnemy.maxHp * 0.20);

  if (hadDodgeChance && dodgeSuccess) {
    if (isPerfectTiming) {
      let counterDmg = Math.round(playerBattlePokemon.maxHp * 0.30);
      currentEnemy.hp = Math.max(0, currentEnemy.hp - counterDmg);
      
      if (box) box.innerText = `⚡ PERFEKTER KONTER! Gegnerschaden ignoriert & -${counterDmg} KP zugefügt!`;
      playBeep(1400, 0.25);

      let enemyCard = document.getElementById('enemy-card-img');
      if (enemyCard) {
        enemyCard.classList.add('card-attack-anim');
        setTimeout(() => enemyCard.classList.remove('card-attack-anim'), 200);
      }

    } else {
      if (box) box.innerText = "✨ Ausgewichen! (+1 Energie)";
      addEnergy(1);
      playBeep(1200, 0.15);
    }
  } else {
    if (box) {
      if (!hadDodgeChance) {
        box.innerText = `💥 Überrascht worden! (-${enemyDmg} KP)`;
      } else {
        enemyDmg = Math.round(enemyDmg * 1.3);
        box.innerText = `💥 Zu spät ausgewichen! (-${enemyDmg} KP)`;
      }
    }
    
    playerBattlePokemon.hp = Math.max(0, playerBattlePokemon.hp - enemyDmg);
    playBeep(300, 0.25);
  }

  isEnemyAttacking = false;

  if (currentEnemy.hp <= 0) {
    winBattle();
  } else if (playerBattlePokemon.hp <= 0) {
    checkPlayerDefeat();
  } else {
    isPlayerTurn = true;
    updateBattleUI();
  }
}

function checkPlayerDefeat() {
  if (playerBattlePokemon.hp <= 0) {
    setTimeout(() => {
      playerBattlePokemon.hp = playerBattlePokemon.maxHp;
      saveCurrentData();
      alert(`${playerBattlePokemon.name} wurde K.O. geschlagen! Es wurde im Pokémon-Center wieder geheilt.`);
      exitToSlots();
    }, 500);
    return true;
  }
  return false;
}

function triggerDodge() {
  if (canDodge && !dodgeSuccess) {
    dodgeSuccess = true;
    canDodge = false;
  }
}

function attemptCatch() {
  if (isTrainingBattle) {
    alert("Im Trainingskampf kannst du keine Pokémon fangen!");
    return;
  }

  if (currentSaveData.pokeballs <= 0) {
    alert("Du hast keine Pokébälle mehr im Beutel!");
    return;
  }

  currentSaveData.pokeballs--;
  updateBattleUI();

  let hpPercent = (currentEnemy.hp / currentEnemy.maxHp);
  let catchChance = 1.0 - (hpPercent * 0.7);

  if (Math.random() <= catchChance) {
    playBeep(1200, 0.4);
    alert(`Erfolg! Du hast ${currentEnemy.name} gefangen!`);
    
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
    showScreen('screen-dashboard');
    loadDashboard();
  } else {
    playBeep(400, 0.2);
    let box = document.getElementById('battle-warning-box');
    if (box) box.innerText = "Schade! Das Pokémon ist entkommen!";
    setTimeout(scheduleEnemyAttack, 1000);
  }
}

function winBattle() {
  let enemyCard = document.getElementById('enemy-card-img');
  if (enemyCard) enemyCard.classList.add('card-defeat-anim');
  
  let box = document.getElementById('battle-warning-box');
  if (box) box.innerText = `💥 ${currentEnemy.name} wurde besiegt!`;
  playVictoryJingle();

  setTimeout(async () => {
    if (enemyCard) enemyCard.classList.remove('card-defeat-anim');
    
    let enemyLevel = currentEnemy.level || 1;
    let earnedExp = 10 + (enemyLevel * 5);

    addTrainerExp(earnedExp);

    let activeMon = playerBattlePokemon;
    let leveledUp = addPokemonExp(activeMon, earnedExp);

    let ballReward = isTrainingBattle ? 1 : 2;
    currentSaveData.pokeballs += ballReward;

    activeMon.hp = activeMon.maxHp;
    saveCurrentData();

    let evoData = await getOrFetchEvolutionData(activeMon);

    if (leveledUp && evoData) {
      pendingEvoPokemon = activeMon;
      showEvolutionScreen(activeMon, evoData);
    } else {
      let subElem = document.getElementById('victory-subtitle');
      let expElem = document.getElementById('victory-exp-text');
      let itemTextElem = document.getElementById('victory-item-text');
      let vicScreen = document.getElementById('victory-screen');

      if (subElem) subElem.innerText = `Du hast ${currentEnemy.name} erfolgreich besiegt!`;
      if (expElem) expElem.innerText = `+${earnedExp} EXP`;
      if (itemTextElem) itemTextElem.innerText = `+${ballReward} 🔴 Pokéball erhalten!`;
      if (vicScreen) vicScreen.classList.remove('hidden');
    }
  }, 1300);
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
    pokemon.evoChance = Math.min(100, pokemon.evoChance + 3);
    
    didLevelUp = true;
  }

  return didLevelUp;
}

function closeVictoryOverlay() {
  let vicScreen = document.getElementById('victory-screen');
  if (vicScreen) vicScreen.classList.add('hidden');
  showScreen('screen-dashboard');
  loadDashboard();
}

function playVictoryJingle() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playBeep(523.25, 0.15);
    setTimeout(() => playBeep(659.25, 0.15), 150);
    setTimeout(() => playBeep(783.99, 0.4), 300);
  } catch(e) {}
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

function exitToSlots() {
  stopWalk();
  saveCurrentData();
  updateSlotUI();
  showScreen('screen-slots');
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function closePokemonModal() {
  let modal = document.getElementById('pokemon-action-modal');
  if (modal) modal.classList.add('hidden');
}

function closeTrainingSelect() {
  let modal = document.getElementById('training-select-modal');
  if (modal) modal.classList.add('hidden');
}

function onPokemonClick(index) {
  selectedTrainingPokemon = currentSaveData.pokemonTeam[index];
  let nameElem = document.getElementById('selected-pokemon-name');
  let modal = document.getElementById('pokemon-action-modal');
  if (nameElem) nameElem.innerText = selectedTrainingPokemon.name + " (Lv. " + selectedTrainingPokemon.level + ")";
  if (modal) modal.classList.remove('hidden');
}

function openTrainingOpponentSelect() {
  closePokemonModal();
  let container = document.getElementById('training-opponents-list');
  if (!container) return;
  container.innerHTML = "";

  let defaultRow = document.createElement('div');
  defaultRow.className = "pokemon-row";
  defaultRow.onclick = () => startTrainingBattle({
    name: "Rattfratz (Sparring)", type: "normal", hp: 30, maxHp: 30, 
    cardUrl: "https://images.pokemontcg.io/base1/61_hires.png", weakness: "kampf"
  });
  defaultRow.innerHTML = `
    <div style="display:flex; align-items:center;">
      <img src="https://images.pokemontcg.io/base1/61_hires.png" alt="Rattfratz">
      <div><strong>Rattfratz</strong> <span style="font-size:11px; color:#aaa;">(Standard-Übung)</span></div>
    </div>
    <button style="width:auto; padding:6px 12px; font-size:12px;">Wählen</button>
  `;
  container.appendChild(defaultRow);

  currentSaveData.pokemonTeam.forEach((p) => {
    if (p !== selectedTrainingPokemon) {
      let row = document.createElement('div');
      row.className = "pokemon-row";
      row.onclick = () => startTrainingBattle(p);
      row.innerHTML = `
        <div style="display:flex; align-items:center;">
          <img src="${p.cardUrl}" alt="${p.name}">
          <div><strong>${p.name}</strong> <span style="font-size:11px; color:#aaa;">Lv. ${p.level}</span></div>
        </div>
        <button style="width:auto; padding:6px 12px; font-size:12px;">Wählen</button>
      `;
      container.appendChild(row);
    }
  });

  let trainModal = document.getElementById('training-select-modal');
  if (trainModal) trainModal.classList.remove('hidden');
}

function showEvolutionScreen(pokemon, evoData) {
  let title = document.getElementById('evo-title');
  let sub = document.getElementById('evo-subtitle');
  let img = document.getElementById('evo-card-img');
  let chance = document.getElementById('evo-chance-info');
  let btn = document.getElementById('evo-roll-btn');

  if (title) title.innerText = `Was? ${pokemon.name} ist bereit!`;
  if (sub) sub.innerText = `${pokemon.name} (Lv. ${pokemon.level})`;
  if (img) img.src = pokemon.cardUrl;
  if (chance) chance.innerText = `Entwicklungschance: ${pokemon.evoChance || 0}%`;
  if (btn) {
    btn.innerText = "🎲 JETZT WÜRFELN!";
    btn.disabled = false;
  }

  let evoScreen = document.getElementById('evo-screen');
  if (evoScreen) evoScreen.classList.remove('hidden');
}

async function rollEvolution() {
  if (!pendingEvoPokemon) return;

  let btn = document.getElementById('evo-roll-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerText = "🎲 Würfelt...";
  }

  let roll = Math.floor(Math.random() * 100) + 1;
  let evoData = await getOrFetchEvolutionData(pendingEvoPokemon);
  let currentChance = pendingEvoPokemon.evoChance || 0;

  setTimeout(() => {
    let title = document.getElementById('evo-title');
    let sub = document.getElementById('evo-subtitle');
    let img = document.getElementById('evo-card-img');
    let chance = document.getElementById('evo-chance-info');
    let evoScreen = document.getElementById('evo-screen');

    if (roll <= currentChance && evoData) {
      playVictoryJingle();
      
      let oldName = pendingEvoPokemon.name;
      pendingEvoPokemon.name = evoData.next;
      pendingEvoPokemon.cardUrl = evoData.cardUrl;
      pendingEvoPokemon.maxHp += (evoData.hpBonus || 20);
      pendingEvoPokemon.hp = pendingEvoPokemon.maxHp;
      pendingEvoPokemon.evoChance = 0;

      if (title) title.innerText = `🎉 GLÜCKWUNSCH!`;
      if (sub) sub.innerText = `${oldName} hat sich zu ${pendingEvoPokemon.name} entwickelt!`;
      if (img) img.src = pendingEvoPokemon.cardUrl;
      if (chance) chance.innerText = `Max-KP stiegen auf ${pendingEvoPokemon.maxHp}!`;

      saveCurrentData();

      setTimeout(() => {
        if (evoScreen) evoScreen.classList.add('hidden');
        showScreen('screen-dashboard');
        loadDashboard();
      }, 2500);

    } else {
      playBeep(300, 0.3);
      if (title) title.innerText = `Fast geschafft!`;
      if (sub) sub.innerText = `${pendingEvoPokemon.name} hat sich noch nicht entwickelt.`;
      if (chance) chance.innerText = `Chance beim nächsten Level: ${currentChance + 3}%!`;

      setTimeout(() => {
        if (evoScreen) evoScreen.classList.add('hidden');
        showScreen('screen-dashboard');
        loadDashboard();
      }, 2000);
    }
  }, 1000);
}

function simulateMove(latOffset, lonOffset) {
  if (userLat === 0 && userLon === 0) {
    userLat = currentSaveData.homeLat || 51.1657;
    userLon = currentSaveData.homeLon || 10.4515;
  }

  userLat += latOffset;
  userLon += lonOffset;

  updateGPSDistance();

  if (encounterActive && targetLat !== null) {
    let distMeters = calculateDistanceKm(userLat, userLon, targetLat, targetLon) * 1000;
    let distDisplay = document.getElementById('radar-distance');
    if (distDisplay) distDisplay.innerText = Math.round(distMeters) + " m";
    updateBeepFrequency(distMeters);

    if (distMeters <= 5) triggerCatchPhase();
  }

  playBeep(600, 0.05);
}

function forceSpawnEncounter() {
  if (!isWalking) startWalk();
  if (userLat === 0 && userLon === 0) {
    userLat = currentSaveData.homeLat || 51.1657;
    userLon = currentSaveData.homeLon || 10.4515;
  }

  spawnPokemonNearUser();
}

function reshuffleEncounter() {
  if (!encounterActive) return;
  playBeep(300, 0.2);
  spawnPokemonNearUser();
  let instr = document.getElementById('radar-instruction');
  if (instr) instr.innerText = "Das Pokémon ist geflüchtet! Neues Signal gesucht...";
}

initApp();
