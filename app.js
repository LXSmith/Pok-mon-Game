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

  // 1. Pokémon aus Pool wählen
  const pool = (currentScanType === 'power') ? RARE_POKEMON : COMMON_POKEMON;
  const template = pool[Math.floor(Math.random() * pool.length)];

  // 2. Basis-Karten-KP als Minimum festlegen
  const minHp = template.maxHp;
  
  // 3. Wenn ein Spieler-Pokémon aktiv ist, KP dynamisch anpassen (Spieler-KP +/- 15%)
  let calculatedHp = minHp;
  if (playerBattlePokemon && playerBattlePokemon.maxHp) {
    const playerHp = playerBattlePokemon.maxHp;
    const variation = (Math.random() * 0.3) - 0.15; // Zwischen -15% und +15%
    calculatedHp = Math.round(playerHp * (1 + variation));
    
    // Nicht weniger als der aufgedruckte Kartenwert!
    calculatedHp = Math.max(minHp, calculatedHp);
  }

  // Gegner mit den neuen skalierten KP erstellen
  currentEnemy = { 
    ...template, 
    maxHp: calculatedHp,
    hp: calculatedHp 
  };

  playerBattlePokemon = currentSaveData.pokemonTeam[0];
  playerEnergy = 0;
  isPlayerTurn = true;
  isEnemyAttacking = false;

  updateBattleUI();
  
  const warnBox = document.getElementById('battle-warning-box');
  if (warnBox) warnBox.innerText = `Ein wildes ${currentEnemy.name} (KP: ${calculatedHp}) greift an!`;
}
