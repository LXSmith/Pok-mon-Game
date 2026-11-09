/* =========================================================
   POKÉMON REAL-LIFE RPG - APP.JS (TEIL 1 VON 4)
   1. SETUP, SYSTEM & DATENBANK (151 KANTO POKÉMON)
   ========================================================= */

// Service Worker Registrierung
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

function playBeep(frequency, duration) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine'; // Klarer, klassischer Gameboy-Beep-Sound
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch(e){}
}


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
   EVOLUTIONS-REGELN & SCHWELLENWERTE
   isTwoStage: true -> 2-Stufen-Kette (+20 SpcAtk, +10 MaxHP)
   isTwoStage: false -> 3-Stufen-Kette (+10 SpcAtk)
   ========================================================= */
const EVOLUTION_CHAINS = {
  // Starter
  "Bisasam":   { next: "Bisaknosp", cardUrl: "https://images.pokemontcg.io/base1/30_hires.png", requiredMaxHp: 77, isTwoStage: false },
  "Bisaknosp": { next: "Bisaflor",  cardUrl: "https://images.pokemontcg.io/base1/15_hires.png", requiredMaxHp: 115, isTwoStage: false },
  "Glumanda":  { next: "Glutexo",   cardUrl: "https://images.pokemontcg.io/base1/24_hires.png", requiredMaxHp: 77, isTwoStage: false },
  "Glutexo":   { next: "Glurak",    cardUrl: "https://images.pokemontcg.io/base1/4_hires.png",  requiredMaxHp: 115, isTwoStage: false },
  "Schiggy":   { next: "Schillok",  cardUrl: "https://images.pokemontcg.io/base1/42_hires.png", requiredMaxHp: 77, isTwoStage: false },
  "Schillok":  { next: "Turtok",    cardUrl: "https://images.pokemontcg.io/base1/2_hires.png",  requiredMaxHp: 115, isTwoStage: false },

  // 3-Stufen Gewöhnlich & Rare
  "Raupy":     { next: "Safcon",    cardUrl: "https://images.pokemontcg.io/base1/48_hires.png", requiredMaxHp: 53, isTwoStage: false },
  "Safcon":    { next: "Smettbo",   cardUrl: "https://images.pokemontcg.io/base1/33_hires.png", requiredMaxHp: 94, isTwoStage: false },
  "Hornliu":   { next: "Kokuna",    cardUrl: "https://images.pokemontcg.io/base1/69_hires.png", requiredMaxHp: 53, isTwoStage: false },
  "Kokuna":    { next: "Bibor",     cardUrl: "https://images.pokemontcg.io/base1/17_hires.png", requiredMaxHp: 94, isTwoStage: false },
  "Taubsi":    { next: "Tauboga",   cardUrl: "https://images.pokemontcg.io/base1/22_hires.png", requiredMaxHp: 61, isTwoStage: false },
  "Tauboga":   { next: "Tauboss",   cardUrl: "https://images.pokemontcg.io/base1/18_hires.png", requiredMaxHp: 99, isTwoStage: false },
  "Nidoran♀":  { next: "Nidorina",  cardUrl: "https://images.pokemontcg.io/base1/36_hires.png", requiredMaxHp: 61, isTwoStage: false },
  "Nidorina":  { next: "Nidoqueen", cardUrl: "https://images.pokemontcg.io/base1/7_hires.png",  requiredMaxHp: 99, isTwoStage: false },
  "Nidoran♂":  { next: "Nidorino",  cardUrl: "https://images.pokemontcg.io/base1/37_hires.png", requiredMaxHp: 61, isTwoStage: false },
  "Nidorino":  { next: "Nidoking",  cardUrl: "https://images.pokemontcg.io/base1/11_hires.png", requiredMaxHp: 99, isTwoStage: false },
  "Myrapla":   { next: "Duflor",    cardUrl: "https://images.pokemontcg.io/base1/49_hires.png", requiredMaxHp: 61, isTwoStage: false },
  "Duflor":    { next: "Giflor",    cardUrl: "https://images.pokemontcg.io/base1/20_hires.png", requiredMaxHp: 99, isTwoStage: false },
  "Quapsel":   { next: "Quaputzi",  cardUrl: "https://images.pokemontcg.io/base1/59_hires.png", requiredMaxHp: 61, isTwoStage: false },
  "Quaputzi":  { next: "Quappo",    cardUrl: "https://images.pokemontcg.io/base1/13_hires.png", requiredMaxHp: 99, isTwoStage: false },
  "Abra":      { next: "Kadabra",   cardUrl: "https://images.pokemontcg.io/base1/32_hires.png", requiredMaxHp: 77, isTwoStage: false },
  "Kadabra":   { next: "Simsala",   cardUrl: "https://images.pokemontcg.io/base1/1_hires.png",  requiredMaxHp: 115, isTwoStage: false },
  "Machollo":  { next: "Maschock",  cardUrl: "https://images.pokemontcg.io/base1/52_hires.png", requiredMaxHp: 61, isTwoStage: false },
  "Maschock":  { next: "Machomei",  cardUrl: "https://images.pokemontcg.io/base1/8_hires.png",  requiredMaxHp: 99, isTwoStage: false },
  "Knofensa":  { next: "Ultrigaria",cardUrl: "https://images.pokemontcg.io/base1/41_hires.png", requiredMaxHp: 61, isTwoStage: false },
  "Ultrigaria":{ next: "Sarzenia",  cardUrl: "https://images.pokemontcg.io/base1/21_hires.png", requiredMaxHp: 99, isTwoStage: false },
  "Kleinstein":{ next: "Georok",    cardUrl: "https://images.pokemontcg.io/base1/35_hires.png", requiredMaxHp: 61, isTwoStage: false },
  "Georok":    { next: "Geowaz",    cardUrl: "https://images.pokemontcg.io/base1/27_hires.png", requiredMaxHp: 99, isTwoStage: false },
  "Nebulak":   { next: "Alpollo",   cardUrl: "https://images.pokemontcg.io/base1/50_hires.png", requiredMaxHp: 61, isTwoStage: false },
  "Alpollo":   { next: "Gengar",    cardUrl: "https://images.pokemontcg.io/fossil/5_hires.png", requiredMaxHp: 99, isTwoStage: false },
  "Dratini":   { next: "Dragonir",  cardUrl: "https://images.pokemontcg.io/base1/26_hires.png", requiredMaxHp: 80, isTwoStage: false },
  "Dragonir":  { next: "Dragoran",  cardUrl: "https://images.pokemontcg.io/fossil/4_hires.png", requiredMaxHp: 120, isTwoStage: false },

  // 2-Stufen-Ketten (Überspringen Phase 1 -> Direkt Endstufe mit +20 SpcAtk & +10 KP)
  "Rattfratz": { next: "Rattikarl", cardUrl: "https://images.pokemontcg.io/base1/39_hires.png", requiredMaxHp: 65, isTwoStage: true },
  "Habitak":  { next: "Ibitak",    cardUrl: "https://images.pokemontcg.io/jungle/21_hires.png",requiredMaxHp: 65, isTwoStage: true },
  "Rettan":    { next: "Arbok",     cardUrl: "https://images.pokemontcg.io/jungle/31_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Pikachu":  { next: "Raichu",    cardUrl: "https://images.pokemontcg.io/base1/14_hires.png", requiredMaxHp: 80, isTwoStage: true },
  "Sandan":    { next: "Sandamer",  cardUrl: "https://images.pokemontcg.io/fossil/27_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Piepi":     { next: "Pixi",      cardUrl: "https://images.pokemontcg.io/jungle/17_hires.png",requiredMaxHp: 80, isTwoStage: true },
  "Vulpix":    { next: "Vulnona",   cardUrl: "https://images.pokemontcg.io/base1/12_hires.png", requiredMaxHp: 80, isTwoStage: true },
  "Pummeluff": { next: "Knuddeluff",cardUrl: "https://images.pokemontcg.io/jungle/16_hires.png",requiredMaxHp: 70, isTwoStage: true },
  "Zubat":     { next: "Golbat",    cardUrl: "https://images.pokemontcg.io/fossil/34_hires.png",requiredMaxHp: 65, isTwoStage: true },
  "Paras":     { next: "Parasek",   cardUrl: "https://images.pokemontcg.io/jungle/41_hires.png",requiredMaxHp: 65, isTwoStage: true },
  "Bluzuk":    { next: "Omot",      cardUrl: "https://images.pokemontcg.io/jungle/13_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Digda":     { next: "Digdri",    cardUrl: "https://images.pokemontcg.io/base1/19_hires.png", requiredMaxHp: 65, isTwoStage: true },
  "Mauzi":     { next: "Snobilikat",cardUrl: "https://images.pokemontcg.io/jungle/42_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Enton":     { next: "Entoron",   cardUrl: "https://images.pokemontcg.io/fossil/20_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Menki":     { next: "Rasaff",    cardUrl: "https://images.pokemontcg.io/jungle/43_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Fukano":    { next: "Arkani",    cardUrl: "https://images.pokemontcg.io/base1/23_hires.png", requiredMaxHp: 80, isTwoStage: true },
  "Tentacha":  { next: "Tentoxa",   cardUrl: "https://images.pokemontcg.io/fossil/19_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Ponita":    { next: "Gallopa",   cardUrl: "https://images.pokemontcg.io/jungle/44_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Flegmon":   { next: "Lahmus",    cardUrl: "https://images.pokemontcg.io/fossil/43_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Magnetilo": { next: "Magneton",  cardUrl: "https://images.pokemontcg.io/base1/9_hires.png",  requiredMaxHp: 65, isTwoStage: true },
  "Dodu":      { next: "Dodri",     cardUrl: "https://images.pokemontcg.io/jungle/34_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Jurob":     { next: "Jugong",    cardUrl: "https://images.pokemontcg.io/base1/25_hires.png", requiredMaxHp: 67, isTwoStage: true },
  "Sleima":    { next: "Sleimok",   cardUrl: "https://images.pokemontcg.io/fossil/13_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Muschas":   { next: "Austos",    cardUrl: "https://images.pokemontcg.io/fossil/15_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Traumato":  { next: "Hypno",     cardUrl: "https://images.pokemontcg.io/fossil/8_hires.png",  requiredMaxHp: 67, isTwoStage: true },
  "Krabby":    { next: "Kingler",   cardUrl: "https://images.pokemontcg.io/fossil/38_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Voltobal":  { next: "Lektrobal", cardUrl: "https://images.pokemontcg.io/base1/21_hires.png", requiredMaxHp: 65, isTwoStage: true },
  "Owei":      { next: "Kokowei",   cardUrl: "https://images.pokemontcg.io/jungle/18_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Tragosso":  { next: "Knogga",    cardUrl: "https://images.pokemontcg.io/jungle/39_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Smogon":    { next: "Smogmog",   cardUrl: "https://images.pokemontcg.io/fossil/51_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Rihorn":    { next: "Rizeros",   cardUrl: "https://images.pokemontcg.io/jungle/45_hires.png",requiredMaxHp: 72, isTwoStage: true },
  "Seeper":    { next: "Seemon",    cardUrl: "https://images.pokemontcg.io/dragon/40_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Goldini":   { next: "Golking",   cardUrl: "https://images.pokemontcg.io/jungle/38_hires.png",requiredMaxHp: 67, isTwoStage: true },
  "Sterndu":   { next: "Starmie",   cardUrl: "https://images.pokemontcg.io/base1/65_hires.png", requiredMaxHp: 67, isTwoStage: true },
  "Karpador":  { next: "Garados",   cardUrl: "https://images.pokemontcg.io/base1/6_hires.png",  requiredMaxHp: 60, isTwoStage: true },
  "Evoli":     { next: "Aquana",    cardUrl: "https://images.pokemontcg.io/jungle/12_hires.png",requiredMaxHp: 80, isTwoStage: true },
  "Amonitas":  { next: "Amoroso",   cardUrl: "https://images.pokemontcg.io/fossil/40_hires.png",requiredMaxHp: 80, isTwoStage: true },
  "Kabuto":    { next: "Kabutops",  cardUrl: "https://images.pokemontcg.io/fossil/9_hires.png",  requiredMaxHp: 80, isTwoStage: true }
};

/* =========================================================
   VOLLSTÄNDIGE 151 POKÉMON DATENBANK (KANTO REGION)
   stage: 0 = Basic, 1 = Stage 1, 2 = Stage 2
   isSingleStage: true -> Ohne Entwicklung (+4 KP pro Lvl)
   ========================================================= */
const POKEMON_DATABASE = [
  { id: 1, name: "Bisasam", type: "pflanze", stage: 0, isRare: true, isSingleStage: false, baseHp: 50, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/base1/44_hires.png" },
  { id: 2, name: "Bisaknosp", type: "pflanze", stage: 1, isRare: true, isSingleStage: false, baseHp: 85, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/base1/30_hires.png" },
  { id: 3, name: "Bisaflor", type: "pflanze", stage: 2, isRare: true, isSingleStage: false, baseHp: 135, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/base1/15_hires.png" },
  { id: 4, name: "Glumanda", type: "feuer", stage: 0, isRare: true, isSingleStage: false, baseHp: 50, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/base1/46_hires.png" },
  { id: 5, name: "Glutexo", type: "feuer", stage: 1, isRare: true, isSingleStage: false, baseHp: 85, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/base1/24_hires.png" },
  { id: 6, name: "Glurak", type: "feuer", stage: 2, isRare: true, isSingleStage: false, baseHp: 135, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/base1/4_hires.png" },
  { id: 7, name: "Schiggy", type: "wasser", stage: 0, isRare: true, isSingleStage: false, baseHp: 50, weakness: "pflanze", cardUrl: "https://images.pokemontcg.io/base1/63_hires.png" },
  { id: 8, name: "Schillok", type: "wasser", stage: 1, isRare: true, isSingleStage: false, baseHp: 85, weakness: "pflanze", cardUrl: "https://images.pokemontcg.io/base1/42_hires.png" },
  { id: 9, name: "Turtok", type: "wasser", stage: 2, isRare: true, isSingleStage: false, baseHp: 135, weakness: "pflanze", cardUrl: "https://images.pokemontcg.io/base1/2_hires.png" },
  { id: 10, name: "Raupy", type: "käfer", stage: 0, isRare: false, isSingleStage: false, baseHp: 35, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/base1/45_hires.png" },
  { id: 11, name: "Safcon", type: "käfer", stage: 1, isRare: false, isSingleStage: false, baseHp: 70, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/base1/48_hires.png" },
  { id: 12, name: "Smettbo", type: "käfer", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/base1/33_hires.png" },
  { id: 13, name: "Hornliu", type: "käfer", stage: 0, isRare: false, isSingleStage: false, baseHp: 35, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/base1/69_hires.png" },
  { id: 14, name: "Kokuna", type: "käfer", stage: 1, isRare: false, isSingleStage: false, baseHp: 70, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/base1/69_hires.png" },
  { id: 15, name: "Bibor", type: "käfer", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/base1/17_hires.png" },
  { id: 16, name: "Taubsi", type: "normal", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/base1/57_hires.png" },
  { id: 17, name: "Tauboga", type: "normal", stage: 1, isRare: false, isSingleStage: false, baseHp: 75, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/base1/22_hires.png" },
  { id: 18, name: "Tauboss", type: "normal", stage: 2, isRare: false, isSingleStage: false, baseHp: 115, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/base1/18_hires.png" },
  { id: 19, name: "Rattfratz", type: "normal", stage: 0, isRare: false, isSingleStage: false, baseHp: 35, weakness: "kampf", cardUrl: "https://images.pokemontcg.io/base1/61_hires.png" },
  { id: 20, name: "Rattikarl", type: "normal", stage: 2, isRare: false, isSingleStage: false, baseHp: 105, weakness: "kampf", cardUrl: "https://images.pokemontcg.io/base1/39_hires.png" },
  { id: 21, name: "Habitak", type: "normal", stage: 0, isRare: false, isSingleStage: false, baseHp: 35, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/jungle/62_hires.png" },
  { id: 22, name: "Ibitak", type: "normal", stage: 2, isRare: false, isSingleStage: false, baseHp: 105, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/jungle/21_hires.png" },
  { id: 23, name: "Rettan", type: "gift", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/jungle/52_hires.png" },
  { id: 24, name: "Arbok", type: "gift", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/jungle/31_hires.png" },
  { id: 25, name: "Pikachu", type: "elektro", stage: 0, isRare: true, isSingleStage: false, baseHp: 50, weakness: "boden", cardUrl: "https://images.pokemontcg.io/base1/58_hires.png" },
  { id: 26, name: "Raichu", type: "elektro", stage: 2, isRare: true, isSingleStage: false, baseHp: 125, weakness: "boden", cardUrl: "https://images.pokemontcg.io/base1/14_hires.png" },
  { id: 27, name: "Sandan", type: "boden", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/base1/62_hires.png" },
  { id: 28, name: "Sandamer", type: "boden", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/fossil/27_hires.png" },
  { id: 29, name: "Nidoran♀", type: "gift", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/jungle/57_hires.png" },
  { id: 30, name: "Nidorina", type: "gift", stage: 1, isRare: false, isSingleStage: false, baseHp: 75, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/base1/36_hires.png" },
  { id: 31, name: "Nidoqueen", type: "gift", stage: 2, isRare: false, isSingleStage: false, baseHp: 115, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/base1/7_hires.png" },
  { id: 32, name: "Nidoran♂", type: "gift", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/jungle/56_hires.png" },
  { id: 33, name: "Nidorino", type: "gift", stage: 1, isRare: false, isSingleStage: false, baseHp: 75, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/base1/37_hires.png" },
  { id: 34, name: "Nidoking", type: "gift", stage: 2, isRare: false, isSingleStage: false, baseHp: 115, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/base1/11_hires.png" },
  { id: 35, name: "Piepi", type: "fee", stage: 0, isRare: true, isSingleStage: false, baseHp: 50, weakness: "stahl", cardUrl: "https://images.pokemontcg.io/base1/26_hires.png" },
  { id: 36, name: "Pixi", type: "fee", stage: 2, isRare: true, isSingleStage: false, baseHp: 125, weakness: "stahl", cardUrl: "https://images.pokemontcg.io/jungle/17_hires.png" },
  { id: 37, name: "Vulpix", type: "feuer", stage: 0, isRare: true, isSingleStage: false, baseHp: 50, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/base1/68_hires.png" },
  { id: 38, name: "Vulnona", type: "feuer", stage: 2, isRare: true, isSingleStage: false, baseHp: 130, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/base1/12_hires.png" },
  { id: 39, name: "Pummeluff", type: "normal", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "kampf", cardUrl: "https://images.pokemontcg.io/jungle/54_hires.png" },
  { id: 40, name: "Knuddeluff", type: "normal", stage: 2, isRare: false, isSingleStage: false, baseHp: 115, weakness: "kampf", cardUrl: "https://images.pokemontcg.io/jungle/16_hires.png" },
  { id: 41, name: "Zubat", type: "gift", stage: 0, isRare: false, isSingleStage: false, baseHp: 35, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/fossil/57_hires.png" },
  { id: 42, name: "Golbat", type: "gift", stage: 2, isRare: false, isSingleStage: false, baseHp: 105, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/fossil/34_hires.png" },
  { id: 43, name: "Myrapla", type: "pflanze", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/base1/49_hires.png" },
  { id: 44, name: "Duflor", type: "pflanze", stage: 1, isRare: false, isSingleStage: false, baseHp: 75, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/jungle/36_hires.png" },
  { id: 45, name: "Giflor", type: "pflanze", stage: 2, isRare: false, isSingleStage: false, baseHp: 115, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/jungle/15_hires.png" },
  { id: 46, name: "Paras", type: "käfer", stage: 0, isRare: false, isSingleStage: false, baseHp: 35, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/jungle/59_hires.png" },
  { id: 47, name: "Parasek", type: "käfer", stage: 2, isRare: false, isSingleStage: false, baseHp: 105, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/jungle/41_hires.png" },
  { id: 48, name: "Bluzuk", type: "käfer", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/jungle/63_hires.png" },
  { id: 49, name: "Omot", type: "käfer", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/jungle/13_hires.png" },
  { id: 50, name: "Digda", type: "boden", stage: 0, isRare: false, isSingleStage: false, baseHp: 35, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/base1/47_hires.png" },
  { id: 51, name: "Digdri", type: "boden", stage: 2, isRare: false, isSingleStage: false, baseHp: 105, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/base1/19_hires.png" },
  { id: 52, name: "Mauzi", type: "normal", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "kampf", cardUrl: "https://images.pokemontcg.io/jungle/56_hires.png" },
  { id: 53, name: "Snobilikat", type: "normal", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "kampf", cardUrl: "https://images.pokemontcg.io/jungle/42_hires.png" },
  { id: 54, name: "Enton", type: "wasser", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/fossil/53_hires.png" },
  { id: 55, name: "Entoron", type: "wasser", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/fossil/20_hires.png" },
  { id: 56, name: "Menki", type: "kampf", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/jungle/55_hires.png" },
  { id: 57, name: "Rasaff", type: "kampf", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/jungle/43_hires.png" },
  { id: 58, name: "Fukano", type: "feuer", stage: 0, isRare: true, isSingleStage: false, baseHp: 50, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/base1/28_hires.png" },
  { id: 59, name: "Arkani", type: "feuer", stage: 2, isRare: true, isSingleStage: false, baseHp: 135, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/base1/23_hires.png" },
  { id: 60, name: "Quapsel", type: "wasser", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/base1/59_hires.png" },
  { id: 61, name: "Quaputzi", type: "wasser", stage: 1, isRare: false, isSingleStage: false, baseHp: 75, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/base1/38_hires.png" },
  { id: 62, name: "Quappo", type: "wasser", stage: 2, isRare: false, isSingleStage: false, baseHp: 115, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/base1/13_hires.png" },
  { id: 63, name: "Abra", type: "psycho", stage: 0, isRare: true, isSingleStage: false, baseHp: 50, weakness: "unlicht", cardUrl: "https://images.pokemontcg.io/base1/43_hires.png" },
  { id: 64, name: "Kadabra", type: "psycho", stage: 1, isRare: true, isSingleStage: false, baseHp: 85, weakness: "unlicht", cardUrl: "https://images.pokemontcg.io/base1/32_hires.png" },
  { id: 65, name: "Simsala", type: "psycho", stage: 2, isRare: true, isSingleStage: false, baseHp: 135, weakness: "unlicht", cardUrl: "https://images.pokemontcg.io/base1/1_hires.png" },
  { id: 66, name: "Machollo", type: "kampf", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/base1/52_hires.png" },
  { id: 67, name: "Maschock", type: "kampf", stage: 1, isRare: false, isSingleStage: false, baseHp: 75, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/base1/34_hires.png" },
  { id: 68, name: "Machomei", type: "kampf", stage: 2, isRare: false, isSingleStage: false, baseHp: 115, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/base1/8_hires.png" },
  { id: 69, name: "Knofensa", type: "pflanze", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/jungle/49_hires.png" },
  { id: 70, name: "Ultrigaria", type: "pflanze", stage: 1, isRare: false, isSingleStage: false, baseHp: 75, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/base1/41_hires.png" },
  { id: 71, name: "Sarzenia", type: "pflanze", stage: 2, isRare: false, isSingleStage: false, baseHp: 115, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/jungle/30_hires.png" },
  { id: 72, name: "Tentacha", type: "wasser", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/fossil/56_hires.png" },
  { id: 73, name: "Tentoxa", type: "wasser", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/fossil/19_hires.png" },
  { id: 74, name: "Kleinstein", type: "gestein", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/base1/47_hires.png" },
  { id: 75, name: "Georok", type: "gestein", stage: 1, isRare: false, isSingleStage: false, baseHp: 75, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/fossil/36_hires.png" },
  { id: 76, name: "Geowaz", type: "gestein", stage: 2, isRare: false, isSingleStage: false, baseHp: 115, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/fossil/36_hires.png" },
  { id: 77, name: "Ponita", type: "feuer", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/base1/60_hires.png" },
  { id: 78, name: "Gallopa", type: "feuer", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/jungle/44_hires.png" },
  { id: 79, name: "Flegmon", type: "wasser", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/fossil/55_hires.png" },
  { id: 80, name: "Lahmus", type: "wasser", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/fossil/43_hires.png" },
  { id: 81, name: "Magnetilo", type: "elektro", stage: 0, isRare: false, isSingleStage: false, baseHp: 35, weakness: "boden", cardUrl: "https://images.pokemontcg.io/base1/53_hires.png" },
  { id: 82, name: "Magneton", type: "elektro", stage: 2, isRare: false, isSingleStage: false, baseHp: 105, weakness: "boden", cardUrl: "https://images.pokemontcg.io/base1/9_hires.png" },
  { id: 83, name: "Porenta", type: "normal", stage: 0, isRare: false, isSingleStage: true, baseHp: 105, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/base1/27_hires.png" },
  { id: 84, name: "Dodu", type: "normal", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/jungle/52_hires.png" },
  { id: 85, name: "Dodri", type: "normal", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/jungle/34_hires.png" },
  { id: 86, name: "Jurob", type: "wasser", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/base1/41_hires.png" },
  { id: 87, name: "Jugong", type: "wasser", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/base1/25_hires.png" },
  { id: 88, name: "Sleima", type: "gift", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/fossil/48_hires.png" },
  { id: 89, name: "Sleimok", type: "gift", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/fossil/13_hires.png" },
  { id: 90, name: "Muschas", type: "wasser", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/fossil/54_hires.png" },
  { id: 91, name: "Austos", type: "wasser", stage: 2, isRare: false, isSingleStage: false, baseHp: 115, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/fossil/15_hires.png" },
  { id: 92, name: "Nebulak", type: "geist", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "unlicht", cardUrl: "https://images.pokemontcg.io/base1/50_hires.png" },
  { id: 93, name: "Alpollo", type: "geist", stage: 1, isRare: false, isSingleStage: false, baseHp: 75, weakness: "unlicht", cardUrl: "https://images.pokemontcg.io/base1/29_hires.png" },
  { id: 94, name: "Gengar", type: "geist", stage: 2, isRare: false, isSingleStage: false, baseHp: 120, weakness: "unlicht", cardUrl: "https://images.pokemontcg.io/fossil/5_hires.png" },
  { id: 95, name: "Onix", type: "gestein", stage: 0, isRare: false, isSingleStage: true, baseHp: 115, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/base1/56_hires.png" },
  { id: 96, name: "Traumato", type: "psycho", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "unlicht", cardUrl: "https://images.pokemontcg.io/base1/49_hires.png" },
  { id: 97, name: "Hypno", type: "psycho", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "unlicht", cardUrl: "https://images.pokemontcg.io/fossil/8_hires.png" },
  { id: 98, name: "Krabby", type: "wasser", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/fossil/51_hires.png" },
  { id: 99, name: "Kingler", type: "wasser", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/fossil/38_hires.png" },
  { id: 100, name: "Voltobal", type: "elektro", stage: 0, isRare: false, isSingleStage: false, baseHp: 35, weakness: "boden", cardUrl: "https://images.pokemontcg.io/base1/67_hires.png" },
  { id: 101, name: "Lektrobal", type: "elektro", stage: 2, isRare: false, isSingleStage: false, baseHp: 105, weakness: "boden", cardUrl: "https://images.pokemontcg.io/base1/21_hires.png" },
  { id: 102, name: "Owei", type: "pflanze", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/jungle/53_hires.png" },
  { id: 103, name: "Kokowei", type: "pflanze", stage: 2, isRare: false, isSingleStage: false, baseHp: 115, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/jungle/18_hires.png" },
  { id: 104, name: "Tragosso", type: "boden", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/jungle/50_hires.png" },
  { id: 105, name: "Knogga", type: "boden", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/jungle/39_hires.png" },
  { id: 106, name: "Kicklee", type: "kampf", stage: 0, isRare: false, isSingleStage: true, baseHp: 110, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/fossil/7_hires.png" },
  { id: 107, name: "Nockchan", type: "kampf", stage: 0, isRare: false, isSingleStage: true, baseHp: 110, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/base1/7_hires.png" },
  { id: 108, name: "Schlurp", type: "normal", stage: 0, isRare: false, isSingleStage: true, baseHp: 110, weakness: "kampf", cardUrl: "https://images.pokemontcg.io/jungle/38_hires.png" },
  { id: 109, name: "Smogon", type: "gift", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/base1/51_hires.png" },
  { id: 110, name: "Smogmog", type: "gift", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "psycho", cardUrl: "https://images.pokemontcg.io/fossil/51_hires.png" },
  { id: 111, name: "Rihorn", type: "boden", stage: 0, isRare: false, isSingleStage: false, baseHp: 45, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/jungle/61_hires.png" },
  { id: 112, name: "Rizeros", type: "boden", stage: 2, isRare: false, isSingleStage: false, baseHp: 120, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/jungle/45_hires.png" },
  { id: 113, name: "Chaneira", type: "normal", stage: 0, isRare: true, isSingleStage: true, baseHp: 140, weakness: "kampf", cardUrl: "https://images.pokemontcg.io/base1/3_hires.png" },
  { id: 114, name: "Tangela", type: "pflanze", stage: 0, isRare: false, isSingleStage: true, baseHp: 105, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/base1/66_hires.png" },
  { id: 115, name: "Kangama", type: "normal", stage: 0, isRare: false, isSingleStage: true, baseHp: 115, weakness: "kampf", cardUrl: "https://images.pokemontcg.io/jungle/5_hires.png" },
  { id: 116, name: "Seeper", type: "wasser", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/base1/42_hires.png" },
  { id: 117, name: "Seemon", type: "wasser", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/dragon/40_hires.png" },
  { id: 118, name: "Goldini", type: "wasser", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/jungle/53_hires.png" },
  { id: 119, name: "Golking", type: "wasser", stage: 2, isRare: false, isSingleStage: false, baseHp: 110, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/jungle/38_hires.png" },
  { id: 120, name: "Sterndu", type: "wasser", stage: 0, isRare: false, isSingleStage: false, baseHp: 40, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/base1/65_hires.png" },
  { id: 121, name: "Starmie", type: "wasser", stage: 2, isRare: false, isSingleStage: false, baseHp: 115, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/base1/65_hires.png" },
  { id: 122, name: "Pantimos", type: "psycho", stage: 0, isRare: true, isSingleStage: true, baseHp: 110, weakness: "unlicht", cardUrl: "https://images.pokemontcg.io/jungle/6_hires.png" },
  { id: 123, name: "Sichlor", type: "käfer", stage: 0, isRare: true, isSingleStage: true, baseHp: 115, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/jungle/10_hires.png" },
  { id: 124, name: "Rossana", type: "eis", stage: 0, isRare: true, isSingleStage: true, baseHp: 110, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/base1/31_hires.png" },
  { id: 125, name: "Elektek", type: "elektro", stage: 0, isRare: true, isSingleStage: true, baseHp: 115, weakness: "boden", cardUrl: "https://images.pokemontcg.io/base1/20_hires.png" },
  { id: 126, name: "Magmar", type: "feuer", stage: 0, isRare: true, isSingleStage: true, baseHp: 115, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/fossil/39_hires.png" },
  { id: 127, name: "Pinsir", type: "käfer", stage: 0, isRare: true, isSingleStage: true, baseHp: 115, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/jungle/9_hires.png" },
  { id: 128, name: "Tauros", type: "normal", stage: 0, isRare: true, isSingleStage: true, baseHp: 115, weakness: "kampf", cardUrl: "https://images.pokemontcg.io/jungle/47_hires.png" },
  { id: 129, name: "Karpador", type: "wasser", stage: 0, isRare: false, isSingleStage: false, baseHp: 30, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/base1/35_hires.png" },
  { id: 130, name: "Garados", type: "wasser", stage: 2, isRare: true, isSingleStage: false, baseHp: 140, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/base1/6_hires.png" },
  { id: 131, name: "Lapras", type: "wasser", stage: 0, isRare: true, isSingleStage: true, baseHp: 130, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/fossil/10_hires.png" },
  { id: 132, name: "Ditto", type: "normal", stage: 0, isRare: true, isSingleStage: true, baseHp: 100, weakness: "kampf", cardUrl: "https://images.pokemontcg.io/fossil/3_hires.png" },
  { id: 133, name: "Evoli", type: "normal", stage: 0, isRare: true, isSingleStage: false, baseHp: 50, weakness: "kampf", cardUrl: "https://images.pokemontcg.io/jungle/51_hires.png" },
  { id: 134, name: "Aquana", type: "wasser", stage: 2, isRare: true, isSingleStage: false, baseHp: 135, weakness: "elektro", cardUrl: "https://images.pokemontcg.io/jungle/12_hires.png" },
  { id: 135, name: "Blitza", type: "elektro", stage: 2, isRare: true, isSingleStage: false, baseHp: 135, weakness: "boden", cardUrl: "https://images.pokemontcg.io/jungle/4_hires.png" },
  { id: 136, name: "Flamara", type: "feuer", stage: 2, isRare: true, isSingleStage: false, baseHp: 135, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/jungle/3_hires.png" },
  { id: 137, name: "Porygon", type: "normal", stage: 0, isRare: true, isSingleStage: true, baseHp: 105, weakness: "kampf", cardUrl: "https://images.pokemontcg.io/base1/39_hires.png" },
  { id: 138, name: "Amonitas", type: "gestein", stage: 0, isRare: true, isSingleStage: false, baseHp: 50, weakness: "pflanze", cardUrl: "https://images.pokemontcg.io/fossil/40_hires.png" },
  { id: 139, name: "Amoroso", type: "gestein", stage: 2, isRare: true, isSingleStage: false, baseHp: 125, weakness: "pflanze", cardUrl: "https://images.pokemontcg.io/fossil/26_hires.png" },
  { id: 140, name: "Kabuto", type: "gestein", stage: 0, isRare: true, isSingleStage: false, baseHp: 50, weakness: "pflanze", cardUrl: "https://images.pokemontcg.io/fossil/50_hires.png" },
  { id: 141, name: "Kabutops", type: "gestein", stage: 2, isRare: true, isSingleStage: false, baseHp: 125, weakness: "pflanze", cardUrl: "https://images.pokemontcg.io/fossil/9_hires.png" },
  { id: 142, name: "Aerodactyl", type: "gestein", stage: 0, isRare: true, isSingleStage: true, baseHp: 130, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/fossil/1_hires.png" },
  { id: 143, name: "Relaxo", type: "normal", stage: 0, isRare: true, isSingleStage: true, baseHp: 140, weakness: "kampf", cardUrl: "https://images.pokemontcg.io/jungle/11_hires.png" },
  { id: 144, name: "Arktos", type: "eis", stage: 0, isRare: true, isLegendary: true, isSingleStage: true, baseHp: 160, weakness: "feuer", cardUrl: "https://images.pokemontcg.io/fossil/2_hires.png" },
  { id: 145, name: "Zapdos", type: "elektro", stage: 0, isRare: true, isLegendary: true, isSingleStage: true, baseHp: 160, weakness: "gestein", cardUrl: "https://images.pokemontcg.io/base1/16_hires.png" },
  { id: 146, name: "Lavados", type: "feuer", stage: 0, isRare: true, isLegendary: true, isSingleStage: true, baseHp: 160, weakness: "wasser", cardUrl: "https://images.pokemontcg.io/fossil/12_hires.png" },
  { id: 147, name: "Dratini", type: "drache", stage: 0, isRare: true, isSingleStage: false, baseHp: 50, weakness: "eis", cardUrl: "https://images.pokemontcg.io/base1/26_hires.png" },
  { id: 148, name: "Dragonir", type: "drache", stage: 1, isRare: true, isSingleStage: false, baseHp: 85, weakness: "eis", cardUrl: "https://images.pokemontcg.io/base1/18_hires.png" },
  { id: 149, name: "Dragoran", type: "drache", stage: 2, isRare: true, isSingleStage: false, baseHp: 145, weakness: "eis", cardUrl: "https://images.pokemontcg.io/fossil/4_hires.png" },
  { id: 150, name: "Mewtu", type: "psycho", stage: 0, isRare: true, isLegendary: true, isSingleStage: true, baseHp: 200, weakness: "unlicht", cardUrl: "https://images.pokemontcg.io/base1/10_hires.png" },
  { id: 151, name: "Mew", type: "psycho", stage: 0, isRare: true, isLegendary: true, isSingleStage: true, baseHp: 200, weakness: "unlicht", cardUrl: "https://images.pokemontcg.io/promo/9_hires.png" }
];

/* =========================================================
   POKÉMON REAL-LIFE RPG - APP.JS (TEIL 2 VON 4)
   2. STATE, GPS, MENÜS & STARTER-INITIALISIERUNG
   ========================================================= */

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
let isEvolutionFinished = false;

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

/* GEO & MAP LOGIK */
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

/* CINEMATIC INTRO */
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

/* MENÜS & SPIELSTART LOGIK */
function initApp() {
  updateSlotUI();
  initGPSLiveTracking();
  requestCompassPermission();
  showScreen('screen-main-menu');
}

/* =========================================================
   ABGESICHERTE MENÜ- & SLOT-LOGIK (TEIL 2 ERSETZEN)
   ========================================================= */

function updateSlotUI() {
  for (let i = 1; i <= 3; i++) {
    const data = localStorage.getItem('pokemon_rl_slot_' + i);
    const infoDiv = document.getElementById(`slot-${i}-info`);
    if (infoDiv) {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          const activeMonName = parsed.pokemonTeam?.[0]?.name || 'Kein Pokémon';
          infoDiv.innerText = `Trainer Lv. ${parsed.level || 1} | ${activeMonName}`;
        } catch (e) {
          console.error(`Fehler beim Lesen von Slot ${i}:`, e);
          infoDiv.innerText = "Fehlerhafter Speicherstand";
        }
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
      try {
        currentSaveData = JSON.parse(saved);
        if (!currentSaveData.pokemonBox) currentSaveData.pokemonBox = [];
        loadDashboard();
        showScreen('screen-radar-hud');
      } catch (e) {
        console.error("Fehler beim Laden des Spielstands:", e);
        alert("Der Speicherstand in diesem Slot ist beschädigt und konnte nicht geladen werden.");
      }
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

/* STARTER POKÉMON INITIALISIERUNG (EXAKT 50 KP RARE BASIC) */
function confirmStarter() {
  const starters = {
    bisasam:  { name: "Bisasam", type: "pflanze", stage: 0, isRare: true, isSingleStage: false, level: 1, hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/base1/44_hires.png", weakness: "feuer", exp: 0, maxExp: 75, attack: 10, specialAttack: 16 },
    glumanda: { name: "Glumanda", type: "feuer", stage: 0, isRare: true, isSingleStage: false, level: 1, hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/base1/46_hires.png", weakness: "wasser", exp: 0, maxExp: 75, attack: 10, specialAttack: 16 },
    schiggy:  { name: "Schiggy", type: "wasser", stage: 0, isRare: true, isSingleStage: false, level: 1, hp: 50, maxHp: 50, cardUrl: "https://images.pokemontcg.io/base1/63_hires.png", weakness: "pflanze", exp: 0, maxExp: 75, attack: 10, specialAttack: 16 }
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

// --- TAGES-POOL FÜR TRAINER LEVEL 1 BIS 5 (CASE-INSENSITIVE) ---
function getDailyLevel1To5Pool() {
  // 1. Die 4 festen Basis-Pokémon (in Kleinschreibung für den Abgleich) 
  // FIX: 'raupy' mit y statt i
  const fixedTargetIds = ['rattfratz', 'taubsi', 'hornliu', 'raupy'];
  
  // Hilfsfunktion: Wandelt ID oder Name sicher in Kleinschreibung um
  const getCleanId = (p) => (p.id || p.name || '').toLowerCase();

  // 2. Die 4 festen Pokémon aus deiner Datenbank herausfiltern
  const fixedPokemon = POKEMON_DATABASE.filter(p => 
    fixedTargetIds.includes(getCleanId(p))
  );

  // 3. Pool aller anderen gewöhnlichen Basis-Pokémon (Stage 0, ohne Rares/SingleStage)
  // FIX: p.stage === 0 anstatt (p.stage || 1) === 1
  const commonBasicPool = POKEMON_DATABASE.filter(p => 
    p.stage === 0 && 
    !p.isRare && 
    !p.isSingleStage && 
    !fixedTargetIds.includes(getCleanId(p))
  );

  // 4. Kalenderdatum als Seed nutzen (wechselt automatisch um 00:00 Uhr)
  const d = new Date();
  const dateSeed = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  
  let hash = 0;
  for (let i = 0; i < dateSeed.length; i++) {
    hash = (hash << 5) - hash + dateSeed.charCodeAt(i);
    hash |= 0;
  }

  // 5. Exakt 6 zufällige, aber für diesen Tag feste Pokémon auswählen
  const dailyChosen = [];
  const tempPool = [...commonBasicPool];
  
  for (let i = 0; i < 6 && tempPool.length > 0; i++) {
    const index = Math.abs(hash + (i * 37)) % tempPool.length;
    dailyChosen.push(tempPool[index]);
    tempPool.splice(index, 1);
  }

  // Gesamter Tagespool (4 feste + 6 wechselnde = 10 Pokémon)
  return [...fixedPokemon, ...dailyChosen];
}




/* =========================================================
   POKÉMON REAL-LIFE RPG - APP.JS (TEIL 3 VON 4)
   3. SPAWN-LOGIK, RADAR, KAMPFSYSTEM & FANG-ENGINE
   ========================================================= */

/* DYNAMISCHE SPAWN-WAHRSCHEINLICHKEIT NACH TEAM-ZUSAMMENSETZUNG
   - Single-Stage (ohne Evo) zählen als Phase 2
   - Phase 1: +10% pro Slot
   - Phase 2: +10% pro Slot
   - Mindestens 40% Chance auf Basic bleibt erhalten
*/
function determineSpawnStage(team) {
  let phase1Count = 0;
  let phase2Count = 0;

  team.forEach(mon => {
    // Falls ein Pokémon keine Entwicklungsstufe hat (Single-Stage), wird es wie Phase 2 gewertet
    if (mon.isSingleStage) {
      phase2Count++;
    } else if (mon.stage === 1) {
      phase1Count++;
    } else if (mon.stage === 2) {
      phase2Count++;
    }
  });

  if (phase1Count === 0 && phase2Count === 0) {
    return 0; // 100% Basic (Phase 0)
  }

  let chancePhase2 = phase2Count * 10;
  let chancePhase1 = phase1Count * 10;

  if (phase2Count > 0 && chancePhase1 > 50) {
    chancePhase1 = 50;
  }

  // Basic Chance auf mindestens 40% deckeln (Pokédex Komplettierung)
  if ((chancePhase1 + chancePhase2) > 60) {
    const totalEvo = chancePhase1 + chancePhase2;
    chancePhase1 = Math.round((chancePhase1 / totalEvo) * 60);
    chancePhase2 = 60 - chancePhase1;
  }

  const roll = Math.random() * 100;

  if (roll < chancePhase2) {
    return 2; // Phase 2 (Endstufe)
  } else if (roll < (chancePhase2 + chancePhase1)) {
    return 1; // Phase 1 (Erste Entwicklung)
  } else {
    return 0; // Phase 0 (Basic)
  }
}

/* WILDES POKÉMON GENERIEREN (MIT TAGES-POOL BIS LEVEL 5) */
function generateWildPokemon(scanType = 'quick') {
  // FIX: Richtiger Schlüssel 'level' anstatt 'trainerLevel'
  const trainerLevel = currentSaveData.level || 1;
  let candidates = [];

  if (trainerLevel <= 5) {
    // 🔒 BIS LEVEL 5: Ausschließlich die 10 Tages-Pokémon (4 feste + 6 tägliche)
    candidates = getDailyLevel1To5Pool();
  } else {
    // 🔓 AB LEVEL 6: Normales Spawnsystem
    const team = currentSaveData.pokemonTeam || [];
    const targetStage = determineSpawnStage(team);

    let baseRareChance = 15;
    if (scanType === 'power') {
      baseRareChance *= 1.6; // 24% Rare Chance beim Power Scan
    }
    const isRareRoll = (Math.random() * 100) < baseRareChance;

    candidates = POKEMON_DATABASE.filter(p => {
      if (p.isLegendary) return false;
      
      if (p.isSingleStage) {
        return isRareRoll ? p.isRare : !p.isRare;
      }
      return p.stage === targetStage && (p.isRare === isRareRoll);
    });
  }

  // FIX: Fallback streng auf stage === 0 prüfen
  if (!candidates || candidates.length === 0) {
    candidates = POKEMON_DATABASE.filter(p => p.stage === 0 && !p.isLegendary);
  }

  const template = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    name: template.name,
    type: template.type,
    stage: template.stage,
    isRare: template.isRare,
    isSingleStage: template.isSingleStage || false,
    level: 1,
    hp: template.baseHp,
    maxHp: template.baseHp,
    cardUrl: template.cardUrl,
    weakness: template.weakness,
    exp: 0,
    maxExp: 75,
    attack: Math.round(template.baseHp * 0.20),
    specialAttack: Math.round(template.baseHp * 0.30)
  };
}



/* RADAR-STEUERUNG */
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

  const catchBtn = document.getElementById('battle-ready-ball');
  if (catchBtn) catchBtn.classList.add('hidden');
  document.getElementById('battle-warning-box').innerText = `🏋️ Trainingskampf: ${playerBattlePokemon.name} vs ${currentEnemy.name}!`;
}

// --- SPAWN SKALIERUNG (Single-Stage & Rare Pokémon) ---
function prepareSpawnPokemon(pokemonData, playerMaxStage) {
  let spawn = { ...pokemonData };

  // Wenn es ein Pokémon ohne Entwicklung ist, skaliere die KP passend zur Stufe!
// --- SPAWN SKALIERUNG (Single-Stage & Rare Pokémon) ---
function prepareSpawnPokemon(pokemonData, playerMaxStage) {
  let spawn = { ...pokemonData };

  if (spawn.isSingleStage) {
    let scaleFactor = 1.0;
    
    // FIX: Richtige Stufen (0, 1, 2) abfragen
    if (playerMaxStage === 0) scaleFactor = 0.35;      // ca. 42 KP auf Basic-Stufe
    else if (playerMaxStage === 1) scaleFactor = 0.70; // ca. 84 KP auf Stufe 1
    else if (playerMaxStage === 2) scaleFactor = 1.00; // Volle KP auf Stufe 2

    // Mindestens 10 KP als Sicherheitsnetz, falls Werte extrem tief fallen
    spawn.maxHp = Math.max(10, Math.round((spawn.baseHp || 100) * scaleFactor));
    spawn.hp = spawn.maxHp;
  } else {
    spawn.maxHp = spawn.baseHp || 50;
    spawn.hp = spawn.maxHp;
  }

  return spawn;
}



/* KAMPFSYSTEM LOGIK */
function startBattleFromScan(rawPokemonData) {
  const team = currentSaveData.pokemonTeam || playerTeam || [];
  
  // FIX: stage explizit auslesen, damit 0 auch 0 bleibt (kein "p.stage || 1")
  const playerMaxStage = team.length > 0 
    ? Math.max(...team.map(p => p.stage !== undefined ? p.stage : 0))
    : 0;

  const baseData = rawPokemonData || generateWildPokemon(currentScanType);
  currentEnemy = prepareSpawnPokemon(baseData, playerMaxStage);

  playerBattlePokemon = team[0];
  isTrainingMode = false;
  playerEnergy = 0;
  isPlayerTurn = true;
  isEnemyAttacking = false;

  clearTimeout(dodgeTimer);
  isDodgeWindowActive = false;

  const dodgeBtn = document.getElementById('btn-dodge-action');
  if (dodgeBtn) dodgeBtn.classList.add('hidden');

  const catchBtn = document.getElementById('battle-ready-ball');
  if (catchBtn) catchBtn.classList.remove('hidden');

  const bottomHud = document.querySelector('.arena-bottom-hud');
  if (bottomHud) {
    bottomHud.classList.remove('hidden');
    bottomHud.style.display = 'block';
  }

  resetRadarUI();
  showScreen('screen-battle');
  updateBattleUI();

  const warnBox = document.getElementById('battle-warning-box');
  if (warnBox) {
    warnBox.innerText = `Ein wildes ${currentEnemy.name} (KP: ${currentEnemy.maxHp}) greift an!`;
  }
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
  const rawType = elementType ? elementType.toLowerCase() : 'normal';
  
  let symbol = '⭐';
  let animName = (direction === 'down') ? 'flyToPlayerElektro' : 'flyToEnemyElektro';
  
  if (rawType === 'wasser' || rawType === 'schiggy') {
    symbol = '🫧'; animName = (direction === 'down') ? 'flyToPlayerWasser' : 'flyToEnemyWasser';
  } else if (rawType === 'pflanze' || rawType === 'bisasam') {
    symbol = '🍃'; animName = (direction === 'down') ? 'flyToPlayerPflanze' : 'flyToEnemyPflanze';
  } else if (rawType === 'elektro') {
    symbol = '⚡'; animName = (direction === 'down') ? 'flyToPlayerElektro' : 'flyToEnemyElektro';
  } else if (rawType === 'feuer' || rawType === 'glumanda') {
    symbol = '🔥'; animName = (direction === 'down') ? 'flyToPlayerFeuer' : 'flyToEnemyFeuer';
  } else if (rawType === 'käfer') {
    symbol = '🕸️'; animName = (direction === 'down') ? 'flyToPlayerPflanze' : 'flyToEnemyPflanze';
  } else if (rawType === 'gestein') {
    symbol = '🪨'; animName = (direction === 'down') ? 'flyToPlayerFeuer' : 'flyToEnemyFeuer';
  } else if (rawType === 'normal') {
    symbol = '⭐'; animName = (direction === 'down') ? 'flyToPlayerElektro' : 'flyToEnemyElektro';
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
    let dmg = Math.round(playerBattlePokemon.maxHp * 0.50) + (playerBattlePokemon.specialAttack || 0);
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

/* FANG-ENGINE LOGIK */
/* IN TEIL 3 VON APP.JS ERSETZEN */

const CatchEngine = {
  active: false,
  animId: null,
  eventsBound: false,

  // Referenzen für Event-Cleanup
  handlers: {
    onStart: null,
    onMove: null,
    onEnd: null
  },

  ball: {
    x: 0, y: 0, z: 1.0,
    vx: 0, vy: 0, vz: 0,
    isDragging: false,
    isThrown: false,
    isSpinning: false,
    spinAngle: 0,
    spinSpeed: 0
  },

  touchHistory: [],
  ringScale: 1.0,
  ringShrinking: true,

  startCatchSession() {
    this.active = true;
    clearTimeout(dodgeTimer);
    isDodgeWindowActive = false;
    
    const ring = document.getElementById('target-ring-outer');
    if (ring) ring.classList.remove('hidden');

    const ballEl = document.getElementById('catch-throw-ball');
    if (ballEl) {
      ballEl.classList.remove('hidden');
      ballEl.style.display = 'block';
      ballEl.style.opacity = '1';
      ballEl.style.visibility = 'visible';
      this.bindEvents(ballEl);
    }
    
    this.resetBall();
    this.startLoop();
  },

  stopCatchSession() {
    this.active = false;
    cancelAnimationFrame(this.animId);
    
    // Cleanup der Listener beim Beenden der Fang-Session
    this.unbindEvents();

    const ring = document.getElementById('target-ring-outer');
    if (ring) ring.classList.add('hidden');
    
    const ballEl = document.getElementById('catch-throw-ball');
    if (ballEl) {
      ballEl.classList.add('hidden');
      ballEl.style.display = 'none';
    }
  },

  bindEvents(el) {
    if (this.eventsBound) return;
    this.eventsBound = true;

    this.handlers.onStart = (e) => {
      if (!this.active || this.ball.isThrown) return;
      if (e.cancelable) e.preventDefault();

      const pt = e.touches ? e.touches[0] : e;
      this.ball.isDragging = true;
      this.ball.isSpinning = false;
      this.ball.spinSpeed = 0;
      this.touchHistory = [{ x: pt.clientX, y: pt.clientY, time: performance.now() }];
      this.updateBallElement();
    };

    this.handlers.onMove = (e) => {
      if (!this.active || !this.ball.isDragging) return;
      if (e.cancelable) e.preventDefault();

      const pt = e.touches ? e.touches[0] : e;
      const now = performance.now();
      this.ball.x = pt.clientX;
      this.ball.y = pt.clientY;

      this.touchHistory.push({ x: pt.clientX, y: pt.clientY, time: now });
      if (this.touchHistory.length > 8) this.touchHistory.shift();

      if (this.touchHistory.length >= 4) {
        const h = this.touchHistory;
        const len = h.length;
        const v1x = h[len - 2].x - h[len - 4].x;
        const v1y = h[len - 2].y - h[len - 4].y;
        const v2x = h[len - 1].x - h[len - 2].x;
        const v2y = h[len - 1].y - h[len - 2].y;
        const cp = (v1x * v2y) - (v1y * v2x);

        if (Math.abs(cp) > 8) {
          this.ball.isSpinning = true;
          const targetSpeed = cp > 0 ? 14 : -14;
          this.ball.spinSpeed = this.ball.spinSpeed * 0.6 + targetSpeed * 0.4;
        }
      }
      this.updateBallElement();
    };

    this.handlers.onEnd = (e) => {
      if (!this.active || !this.ball.isDragging) return;
      this.ball.isDragging = false;

      if (this.touchHistory.length >= 2) {
        const last = this.touchHistory[this.touchHistory.length - 1];
        const first = this.touchHistory[0];
        const dt = (last.time - first.time) / 1000;

        if (dt > 0.01) {
          const vx = (last.x - first.x) / dt * 0.45;
          const vy = (last.y - first.y) / dt * 0.55;

          if (vy < -120) {
            this.ball.isThrown = true;
            this.ball.vx = vx;
            this.ball.vy = vy;
            const swipeSpeed = Math.hypot(vx, vy);
            this.ball.vz = - (swipeSpeed * 0.0018); 
          } else {
            this.resetBall();
          }
        }
      } else {
        this.resetBall();
      }
    };

    el.addEventListener('touchstart', this.handlers.onStart, { passive: false });
    window.addEventListener('touchmove', this.handlers.onMove, { passive: false });
    window.addEventListener('touchend', this.handlers.onEnd, { passive: false });
    el.addEventListener('mousedown', this.handlers.onStart);
    window.addEventListener('mousemove', this.handlers.onMove);
    window.addEventListener('mouseup', this.handlers.onEnd);
  },

  unbindEvents() {
    if (!this.eventsBound) return;

    const ballEl = document.getElementById('catch-throw-ball');
    if (ballEl && this.handlers.onStart) {
      ballEl.removeEventListener('touchstart', this.handlers.onStart);
      ballEl.removeEventListener('mousedown', this.handlers.onStart);
    }

    if (this.handlers.onMove) {
      window.removeEventListener('touchmove', this.handlers.onMove);
      window.removeEventListener('mousemove', this.handlers.onMove);
    }

    if (this.handlers.onEnd) {
      window.removeEventListener('touchend', this.handlers.onEnd);
      window.removeEventListener('mouseup', this.handlers.onEnd);
    }

    this.eventsBound = false;
  },

  resetBall() {
    const b = this.ball;
    b.x = window.innerWidth / 2;
    b.y = window.innerHeight - 140;
    b.z = 1.0;
    b.vx = 0; b.vy = 0; b.vz = 0;
    b.isDragging = false;
    b.isThrown = false;
    b.isSpinning = false;
    b.spinSpeed = 0;
    b.spinAngle = 0;

    const ballEl = document.getElementById('catch-throw-ball');
    if (ballEl) {
      ballEl.classList.remove('wobble');
      ballEl.style.opacity = '1';
      ballEl.style.display = 'block';
      ballEl.style.visibility = 'visible';
    }

    this.touchHistory = [];
    this.updateBallElement();
  },

  startLoop() {
    const loop = () => {
      if (!this.active) return;
      this.updatePhysics();
      this.updateRing();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  },

  updatePhysics() {
    const b = this.ball;

    if (b.isThrown) {
      const enemyImg = document.getElementById('enemy-card-img');
      const enemyRect = enemyImg ? enemyImg.getBoundingClientRect() : { left: window.innerWidth / 2 - 60, top: 180, width: 120, height: 160 };
      
      const circleCenterX = enemyRect.left + (enemyRect.width / 2);
      const circleCenterY = enemyRect.top + (enemyRect.height / 2);
      const exactRadius = 55; 

      b.x += b.vx * 0.016;
      b.y += b.vy * 0.016;
      b.vy += 580 * 0.016;
      b.z += b.vz * 0.016;
      b.z = Math.max(0.12, b.z);

      if (b.isSpinning) {
        b.vx += (b.spinSpeed * 4.2) * 0.016;
        b.spinAngle += b.spinSpeed * 1.5;
      }

      this.updateBallElement();

      const isAtTargetDepth = (b.z <= 0.52 && b.z >= 0.38);
      const distanceFromCircleCenter = Math.hypot(b.x - circleCenterX, b.y - circleCenterY);

      if (isAtTargetDepth && distanceFromCircleCenter <= exactRadius) {
        b.isThrown = false;
        this.evaluateHit(b.x, b.y, enemyRect);
        return;
      }

      if (b.z < 0.35 || b.y > window.innerHeight + 80 || b.x < -120 || b.x > window.innerWidth + 120) {
        b.isThrown = false;
        this.showFeedback("VORBEI AM KREIS!");
        setTimeout(() => this.resetBall(), 600);
      }
    } else if (b.isSpinning) {
      b.spinAngle += b.spinSpeed;
      this.updateBallElement();
    }
  },

  updateRing() {
    if (this.ball.isThrown) return;
    const innerRing = document.getElementById('target-ring-inner');
    if (!innerRing) return;

    if (this.ringShrinking) {
      this.ringScale -= 0.015;
      if (this.ringScale <= 0.2) this.ringShrinking = false;
    } else {
      this.ringScale += 0.015;
      if (this.ringScale >= 1.0) this.ringShrinking = true;
    }

    innerRing.style.transform = `scale(${this.ringScale})`;
    innerRing.style.borderColor = this.ringScale < 0.4 ? '#ff2e55' : (this.ringScale < 0.7 ? '#ffcb05' : '#10b981');
  },

  updateBallElement() {
    const ballEl = document.getElementById('catch-throw-ball');
    if (!ballEl) return;
    const b = this.ball;
    ballEl.style.left = b.x + 'px';
    ballEl.style.top = b.y + 'px';
    
    const scale = b.z * (b.isDragging ? 1.3 : 1.2);
    const rotation = b.isSpinning ? `rotate(${b.spinAngle}deg)` : '';
    ballEl.style.transform = `translate(-50%, -50%) scale(${scale}) ${rotation}`;
  },

  evaluateHit(ballX, ballY, enemyRect) {
    let throwBonus = 1.0;
    let feedbackText = "TREFFER!";

    if (this.ringScale < 0.4) {
      throwBonus = 1.8;
      feedbackText = "FABELHAFT!";
    } else if (this.ringScale < 0.7) {
      throwBonus = 1.4;
      feedbackText = "GROSSARTIG!";
    }

    if (this.ball.isSpinning) {
      throwBonus *= 1.5;
      feedbackText += " (CURVE)";
    }

    this.showFeedback(feedbackText);
    this.triggerCatchSequence(throwBonus);
  },

  showFeedback(text) {
    const fb = document.getElementById('throw-feedback');
    if (!fb) return;
    fb.innerText = text;
    fb.classList.remove('hidden');
    setTimeout(() => fb.classList.add('hidden'), 1200);
  },

  playFanfareSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.25);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + idx * 0.1); osc.stop(now + idx * 0.1 + 0.25);
      });
    } catch(e){}
  },

  triggerCatchSequence(throwBonus) {
    const ballEl = document.getElementById('catch-throw-ball');
    const enemyImg = document.getElementById('enemy-card-img');
    const ring = document.getElementById('target-ring-outer');
    
    if (ring) ring.classList.add('hidden');
    if (enemyImg) enemyImg.classList.add('anim-suck-in');
    try { playBeep(800, 0.2); } catch(e){}

    setTimeout(() => {
      if (ballEl) ballEl.classList.add('wobble');

      const baseChance = 0.80;
      const finalChance = Math.min(0.98, baseChance * throwBonus);
      let wobbles = 0;

      const wobbleInterval = setInterval(() => {
        wobbles++;
        try { playBeep(450 + (wobbles * 140), 0.15); } catch(e){}

        if (wobbles >= 3) {
          clearInterval(wobbleInterval);
          if (ballEl) ballEl.classList.remove('wobble');

          if (Math.random() <= finalChance) {
            this.playFanfareSound();
            
            const stars = document.createElement('div');
            stars.className = 'catch-stars-overlay';
            stars.innerText = '✨⭐✨';
            document.getElementById('screen-battle').appendChild(stars);
            setTimeout(() => stars.remove(), 1000);

            setTimeout(() => {
              this.stopCatchSession();
              if (enemyImg) {
                enemyImg.classList.remove('anim-suck-in');
                enemyImg.style.transform = '';
                enemyImg.style.opacity = '1';
              }

              const newMon = {
                name: currentEnemy.name,
                type: currentEnemy.type,
                stage: currentEnemy.stage,
                isRare: currentEnemy.isRare,
                isSingleStage: currentEnemy.isSingleStage,
                level: 1,
                hp: currentEnemy.maxHp,
                maxHp: currentEnemy.maxHp,
                cardUrl: currentEnemy.cardUrl,
                weakness: currentEnemy.weakness,
                exp: 0,
                maxExp: 75,
                attack: Math.round(currentEnemy.maxHp * 0.20),
                specialAttack: Math.round(currentEnemy.maxHp * 0.30)
              };

              if (currentSaveData.pokemonTeam.length < 6) {
                currentSaveData.pokemonTeam.push(newMon);
                alert(`🎉 Super! Du hast ${currentEnemy.name} gefangen und ins Team aufgenommen!`);
              } else {
                if (!currentSaveData.pokemonBox) currentSaveData.pokemonBox = [];
                currentSaveData.pokemonBox.push(newMon);
                alert(`📦 Dein Team ist voll! ${currentEnemy.name} wurde in deine Lagerbox geschickt.`);
              }

              if (currentSaveData.pokemonTeam.length > 0) {
                currentSaveData.pokemonTeam[0].hp = currentSaveData.pokemonTeam[0].maxHp;
              }

              addTrainerExp(35);
              saveCurrentData();
              showScreen('screen-radar-hud');
            }, 600);

          } else {
            try { playBeep(220, 0.4); } catch(e){}
            if (enemyImg) {
              enemyImg.classList.remove('anim-suck-in');
              enemyImg.classList.add('anim-puff-out');
            }

            setTimeout(() => {
              if (enemyImg) enemyImg.classList.remove('anim-puff-out');
              this.resetBall();
              alert(`${currentEnemy.name} ist ausgebrochen!`);
            }, 700);
          }
        }
      }, 700);
    }, 450);
  }
};


function attemptCatch() {
  if (isTrainingMode) return;
  if (currentSaveData.pokeballs <= 0) return alert("Keine Pokébälle mehr im Beutel!");
  currentSaveData.pokeballs--;
  updateBattleUI();
  CatchEngine.startCatchSession();
}

/* =========================================================
   POKÉMON REAL-LIFE RPG - APP.JS (TEIL 4 VON 4)
   4. PROGRESSION (EXP/LEVEL-UP), EVOLUTION (+10/+20 BONI) & BACKUP
   ========================================================= */

function winBattle() {
  clearTimeout(dodgeTimer);
  isDodgeWindowActive = false;
  CatchEngine.stopCatchSession();
  
  document.getElementById('battle-warning-box').innerText = `💥 ${currentEnemy.name} besiegt!`;
  try {
    playBeep(523.25, 0.15);
    setTimeout(() => playBeep(659.25, 0.15), 150);
    setTimeout(() => playBeep(783.99, 0.4), 300);
  } catch(e){}

  setTimeout(() => {
    if (isTrainingMode) {
      const earnedExp = Math.round(currentEnemy.maxHp * 0.5);
      addPokemonExp(playerBattlePokemon, earnedExp);
      if (trainingPartnerMon) addPokemonExp(trainingPartnerMon, earnedExp);
      playerBattlePokemon.hp = playerBattlePokemon.maxHp;
      saveCurrentData();

      document.getElementById('victory-exp-text').innerText = `+${earnedExp} EXP (Training)`;
      document.getElementById('victory-item-text').innerText = `Beide Pokémon sind gewachsen!`;
      window._pendingLevelUpInfo = pendingLevelUpData;
      window._launchEvolutionAfterVictory = false;
      document.getElementById('victory-screen').classList.remove('hidden');
    } else {
      const earnedExp = Math.round(currentEnemy.maxHp * 0.5);
      addTrainerExp(earnedExp);
      currentSaveData.pokeballs += 2;

      const activeMon = playerBattlePokemon;
      const leveledUp = addPokemonExp(activeMon, earnedExp);
      activeMon.hp = activeMon.maxHp;
      saveCurrentData();

      // Evolutionsprüfung über den organischen requiredMaxHp Schwellenwert
      let triggeredEvo = false;
      if (EVOLUTION_CHAINS[activeMon.name]) {
        const evoData = EVOLUTION_CHAINS[activeMon.name];
        if (activeMon.maxHp >= evoData.requiredMaxHp) {
          triggeredEvo = true;
          pendingEvoPokemon = activeMon;
        }
      }

      document.getElementById('victory-exp-text').innerText = `+${earnedExp} EXP`;
      document.getElementById('victory-item-text').innerText = `+2 Pokébälle`;

      window._pendingLevelUpInfo = leveledUp ? pendingLevelUpData : null;
      window._launchEvolutionAfterVictory = triggeredEvo;
      document.getElementById('victory-screen').classList.remove('hidden');
    }
  }, 1000);
}

/* POKÉMON EXP & LEVEL-UP STAT-ZUWACHS
   - Single-Stage (ohne Evo): +4 Max-KP pro Level
   - Normale Pokémon: +3 Max-KP pro Level
*/
function addPokemonExp(pokemon, amount) {
  if (!pokemon.exp) pokemon.exp = 0;
  if (!pokemon.maxExp) pokemon.maxExp = 50 + (pokemon.level * pokemon.level * 25);

  const oldLevel = pokemon.level;
  const oldMaxHp = pokemon.maxHp || pokemon.hp;
  const oldAttack = pokemon.attack || Math.round(oldMaxHp * 0.20);
  const oldSpecial = pokemon.specialAttack || Math.round(oldMaxHp * 0.30);

  pokemon.exp += amount;
  let didLevelUp = false;

  while (pokemon.exp >= pokemon.maxExp) {
    pokemon.exp -= pokemon.maxExp;
    pokemon.level++;
    
    pokemon.maxExp = 50 + (pokemon.level * pokemon.level * 25);

    // Stat-Zuwachs
    const hpGain = pokemon.isSingleStage ? 4 : 3;
    pokemon.maxHp += hpGain;
    pokemon.hp = pokemon.maxHp;
    
    pokemon.attack = Math.round(pokemon.maxHp * 0.20);
    pokemon.specialAttack = (pokemon.specialAttack || Math.round(pokemon.maxHp * 0.30)) + 1;
    didLevelUp = true;
  }

  if (didLevelUp) {
    saveCurrentData();
    pendingLevelUpData = {
      pokemon: pokemon,
      oldLevel: oldLevel,
      newLevel: pokemon.level,
      oldHp: oldMaxHp,
      newHp: pokemon.maxHp,
      oldAtk: oldAttack,
      newAtk: pokemon.attack,
      oldSpc: oldSpecial,
      newSpc: pokemon.specialAttack
    };
  }
  return didLevelUp;
}

function closeVictoryOverlay() {
  document.getElementById('victory-screen').classList.add('hidden');

  if (window._pendingLevelUpInfo) {
    const info = window._pendingLevelUpInfo;
    window._pendingLevelUpInfo = null;

    document.getElementById('levelup-title').innerText = `${info.pokemon.name} erreicht Level ${info.newLevel}!`;
    const statsContainer = document.getElementById('levelup-stats-container');
    statsContainer.innerHTML = `
      <div class="stat-change-row"><span class="stat-label">❤️ KP:</span><div class="stat-values"><span class="stat-old">${info.oldHp}</span><span class="stat-arrow">➔</span><span class="stat-new">${info.newHp}</span></div></div>
      <div class="stat-change-row"><span class="stat-label">⚔️ Angriff:</span><div class="stat-values"><span class="stat-old">${info.oldAtk}</span><span class="stat-arrow">➔</span><span class="stat-new">${info.newAtk}</span></div></div>
      <div class="stat-change-row"><span class="stat-label">🔥 Spezialangriff:</span><div class="stat-values"><span class="stat-old">${info.oldSpc}</span><span class="stat-arrow">➔</span><span class="stat-new">${info.newSpc}</span></div></div>
    `;

    document.getElementById('levelup-screen').classList.remove('hidden');
    try { playBeep(880, 0.3); } catch(e){}
    return;
  }

  if (window._launchEvolutionAfterVictory && pendingEvoPokemon) {
    window._launchEvolutionAfterVictory = false;
    triggerBackgroundEvolution(pendingEvoPokemon);
  } else {
    showScreen('screen-radar-hud');
  }
}

function closeLevelUpOverlay() {
  document.getElementById('levelup-screen').classList.add('hidden');

  if (window._launchEvolutionAfterVictory && pendingEvoPokemon) {
    window._launchEvolutionAfterVictory = false;
    triggerBackgroundEvolution(pendingEvoPokemon);
  } else {
    showScreen('screen-radar-hud');
  }
}

/* EVOLUTION DURCHFÜHREN & BONI VERGEBEN
   - 3-Stufen-Ketten: +10 Spezialangriff
   - 2-Stufen-Ketten: +20 Spezialangriff & +10 KP
*/
function triggerBackgroundEvolution(pokemon) {
  const evoData = EVOLUTION_CHAINS[pokemon.name];
  if (!evoData) return;

  const evoImg = document.getElementById('evo-card-img');
  const modalCard = document.querySelector('#evo-screen .modal-card');
  const rollBtn = document.getElementById('evo-roll-btn');

  isEvolutionFinished = false;
  if (rollBtn) rollBtn.style.display = 'none';

  document.getElementById('evo-title').innerText = `Was? ${pokemon.name} entwickelt sich!`;
  document.getElementById('evo-subtitle').innerText = `Magische Energie bricht hervor...`;
  evoImg.src = pokemon.cardUrl;
  evoImg.classList.remove('evo-flash-bright');
  document.getElementById('evo-chance-info').innerText = `✨ EVOLUTION LÄUFT! ✨`;
  document.getElementById('evo-screen').classList.remove('hidden');

  setTimeout(() => {
    evoImg.classList.add('evo-flash-bright');
    try { playBeep(880, 0.4); } catch(e){}
  }, 200);

  setTimeout(() => {
    evoImg.src = evoData.cardUrl;
    pokemon.name = evoData.next;
    pokemon.cardUrl = evoData.cardUrl;
    
    // Stufen-Upgrade in Datenstruktur hinterlegen
    if (evoData.isTwoStage) {
      pokemon.stage = 2;
      pokemon.specialAttack = (pokemon.specialAttack || 0) + 20;
      pokemon.maxHp += 10;
      pokemon.hp = pokemon.maxHp;
    } else {
      pokemon.stage = (pokemon.stage || 0) + 1;
      pokemon.specialAttack = (pokemon.specialAttack || 0) + 10;
    }

    saveCurrentData();

    document.getElementById('evo-title').innerText = `✨ GLÜCKWUNSCH! ✨`;
    document.getElementById('evo-subtitle').innerText = `Dein Pokémon wurde zu ${pokemon.name}!`;
    document.getElementById('evo-chance-info').innerText = `Neue KP: ${pokemon.maxHp} | Spezial-Angriff: +${evoData.isTwoStage ? 20 : 10}`;

    if (modalCard && !document.getElementById('active-evo-stars')) {
      const starsContainer = document.createElement('div');
      starsContainer.id = 'active-evo-stars';
      starsContainer.className = 'evo-dancing-stars';
      starsContainer.innerHTML = `<span>⭐</span><span>✨</span><span>🌟</span><span>💫</span>`;
      modalCard.appendChild(starsContainer);
    }
  }, 1700);

  setTimeout(() => {
    isEvolutionFinished = true;
    if (rollBtn) {
      rollBtn.innerText = "✨ WEITER ✨";
      rollBtn.style.display = 'block';
    }
  }, 3200);
}

function rollEvolution() {
  if (isEvolutionFinished) {
    isEvolutionFinished = false;
    document.getElementById('evo-screen').classList.add('hidden');
    const stars = document.getElementById('active-evo-stars');
    if (stars) stars.remove();
    const evoImg = document.getElementById('evo-card-img');
    if (evoImg) evoImg.classList.remove('evo-flash-bright');
    showScreen('screen-radar-hud');
  }
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

/* BACKUP-SYSTEM & INITIALISIERUNG */
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

// App-Start nach Laden des DOM
const safeStartIntro = () => {
  requestAnimationFrame(() => {
    IntroManager.init();
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeStartIntro);
} else {
  safeStartIntro();
}

