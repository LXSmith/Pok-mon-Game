// SERVICE WORKER REGISTRIERUNG
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
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

// AUDIO ENTSPERREN BEI ERSTEM TOUCH
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
   1. CINEMATIC INTRO ENGINE (Unskippable Version)
   ========================================================= */
const IntroManager = {
  active: true,
  canInteractiveFinish: false, // Erst nach Ablauf des Logos erlaubt

  init() {
    const introScreen = document.getElementById('intro-screen');
    const container = document.getElementById('introContainer') || document.querySelector('.intro-container');

    if (!introScreen || !container) {
      this.finishIntro();
      return;
    }

    // Audio-Freischaltung beim ersten Touch (aber KEIN Skip des Intros!)
    const triggerAudio = () => unlockAudio();
    container.addEventListener('pointerdown', triggerAudio, { once: true });

    // Klick zum Starten ERST erlauben, wenn das Intro komplett durchgelaufen ist
    container.addEventListener('click', () => {
      if (this.canInteractiveFinish) {
        this.finishIntro();
      }
    });

    // 1. Karten-Rush starten (Dauer: 5 Sekunden)
    this.startCardRush();

    // 2. Slash & Sound nach 5.3 Sekunden
    setTimeout(() => this.playSlashSound(), 5300);

    // 3. Nach 7.3 Sekunden (5.3s Slash + 2s Logo-Präsenz): Text einblenden & Klick freischalten
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

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
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

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
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

    const introEl = document.getElementById('intro-screen');
    const gameScreen = document.getElementById('game-screen');

    if (introEl) {
      introEl.classList.add('fade-out');
      setTimeout(() => {
        introEl.style.display = 'none';
        if (gameScreen) gameScreen.classList.remove('hidden');
        initApp();
      }, 500);
    } else {
      if (gameScreen) gameScreen.classList.remove('hidden');
      initApp();
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
let scanCountdown = 20;
let currentScanType = 'quick';

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
  pokemonTeam: []
};

/* =========================================================
   3. NAVIGATION & SPIELSTAND LOGIK
   ========================================================= */
function initApp() {
  updateSlotUI();
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
    currentSaveData = { level: 1, exp: 0, maxExp: 100, pokeballs: 10, pokemonTeam: [] };
    showScreen('screen-starter');
  }
}

function showScreen(screenId) {
  ['screen-main-menu', 'screen-slots', 'screen-starter', 'screen-radar-hud', 'screen-battle'].forEach(id => {
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
   4. RADAR- & SCAN-MECHANIK
   ========================================================= */
function openScanModal() {
  if (isScanning) {
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

  triggerBtn.innerText = "🛑 SCAN ABBRECHEN";
  ringContainer.className = "radar-rings state-scanning";
  statusText.innerText = "Scanne Umgebung...";

  const searchDelay = Math.floor(Math.random() * 4000) + 3000;

  scanTimer = setTimeout(() => {
    triggerSignalDetected();
  }, searchDelay);
}

function triggerSignalDetected() {
  const ringContainer = document.getElementById('radar-ring-container');
  const statusText = document.getElementById('radar-status-text');
  const timerDisplay = document.getElementById('radar-timer-display');

  ringContainer.className = "radar-rings state-detected";
  statusText.innerText = "⚠️ POKÉMON IN DER NÄHE!";
  timerDisplay.classList.remove('hidden');

  scanCountdown = 20;
  timerDisplay.innerText = scanCountdown + "s";

  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  playBeep(880, 0.3);

  clearInterval(scanTimer);
  scanTimer = setInterval(() => {
    scanCountdown--;
    timerDisplay.innerText = scanCountdown + "s";

    if (scanCountdown <= 10 && scanCountdown > 3) {
      ringContainer.className = "radar-rings state-warning";
      if (navigator.vibrate) navigator.vibrate(100);
      playBeep(600, 0.05);
    } else if (scanCountdown <= 3 && scanCountdown > 0) {
      ringContainer.className = "radar-rings state-target";
      if (navigator.vibrate) navigator.vibrate([150, 50, 150]);
      playBeep(1200, 0.1);
    } else if (scanCountdown <= 0) {
      clearInterval(scanTimer);
      startBattleFromScan();
    }
  }, 1000);
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

function startBattleFromScan() {
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

function cancelScan() {
  clearInterval(scanTimer);
  clearTimeout(scanTimer);
  resetRadarUI();
}

function resetRadarUI() {
  isScanning = false;
  document.getElementById('btn-scan-trigger').innerText = "📡 STARTE POKÉMON SCAN";
  document.getElementById('radar-ring-container').className = "radar-rings";
  document.getElementById('radar-status-text').innerText = "Bereit für Scan...";
  document.getElementById('radar-timer-display').classList.add('hidden');
}

/* =========================================================
   5. KAMPFSYSTEM & FANGSYSTEM
   ========================================================= */
function updateBattleUI() {
  if (!currentEnemy || !playerBattlePokemon) return;

  document.getElementById('enemy-title').innerText = "WILDES " + currentEnemy.name.toUpperCase();
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
      document.getElementById('victory-screen').classList.remove('hidden');
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
