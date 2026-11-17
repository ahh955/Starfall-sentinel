// The upgrade pool: what the sentinel can become between waves. Each upgrade
// is a card with a name, a short promise and an effect applied to the player
// or the core. Three distinct cards are offered after every cleared wave.

import { CORE } from './config.js';

export const UPGRADES = [
  { id: 'bomb', name: 'Nova Bomb', desc: 'Q: clear enemies. Once per wave.', icon: 'nova',
    apply(player, game) { game.novaUnlocked = true; game.novaReady = true; } },
  { id: 'overdrive', name: 'Overdrive', desc: '+35% fire rate. −10% damage.', icon: 'bolt',
    apply(player) { player.fireInterval /= 1.35; player.bulletDamage *= 0.9; } },
  { id: 'fortress', name: 'Core Fortress', desc: '+25 max core HP, heal 25.', icon: 'shield',
    apply(player, game) { game.coreMaxHp = (game.coreMaxHp || CORE.maxHp) + 25; game.coreHp = Math.min(game.coreMaxHp, game.coreHp + 25); } },
  { id: 'longfuse', name: 'Long Fuse', desc: 'Combo window +60%.', icon: 'burst',
    apply(player) { player.comboWindow *= 1.6; } },
  { id: 'scavenger', name: 'Scavenger', desc: 'Shards drop +1 starlight.', icon: 'magnet',
    apply(player) { player.dropBonus += 1; } },
  {
    id: 'rapid',
    name: 'Rapid Cycler',
    desc: 'Fire 18% faster.',
    icon: 'burst',
    apply(player) {
      player.fireInterval *= 0.82;
    },
  },
  {
    id: 'spread',
    name: 'Split Cannon',
    desc: '+1 bullet per volley.',
    icon: 'spread',
    apply(player) {
      player.bulletCount += 1;
    },
  },
  {
    id: 'heavy',
    name: 'Heavy Bolts',
    desc: '+1 damage per bullet.',
    icon: 'bolt',
    apply(player) {
      player.bulletDamage += 1;
    },
  },
  {
    id: 'thrusters',
    name: 'Ion Thrusters',
    desc: 'Move 15% faster.',
    icon: 'wings',
    apply(player) {
      player.speed *= 1.15;
    },
  },
  {
    id: 'aegis',
    name: 'Aegis Plating',
    desc: '+1 shield, and refill it.',
    icon: 'shield',
    apply(player) {
      player.maxShield += 1;
      player.shield = player.maxShield;
    },
  },
  {
    id: 'magnet',
    name: 'Star Magnet',
    desc: 'Pull starlight from 60% further.',
    icon: 'magnet',
    apply(player) {
      player.magnetRadius *= 1.6;
    },
  },
  {
    id: 'repair',
    name: 'Core Mend',
    desc: 'Restore 35 core HP.',
    icon: 'core',
    apply(player, game) {
      game.coreHp = Math.min(game.coreMaxHp || CORE.maxHp, game.coreHp + 35);
    },
  },
  {
    id: 'nova',
    name: 'Nova Shell',
    desc: 'Bullets fly 25% faster and hit harder at range.',
    icon: 'nova',
    apply(player) {
      player.bulletDamage += 1;
      player.fireInterval *= 0.94;
    },
  },
];

// Draw three distinct upgrades at random. The repair card only appears when
// the core is actually hurt, so the choice is never a dead card.
export function rollUpgrades(rng, coreHp, maxHp) {
  const ceiling = maxHp || CORE.maxHp;
  const pool = UPGRADES.filter((u) => u.id !== 'repair' || coreHp < ceiling);
  const picks = [];
  const copy = pool.slice();
  while (picks.length < 3 && copy.length > 0) {
    const index = Math.floor(rng.next() * copy.length);
    picks.push(copy.splice(index, 1)[0]);
  }
  return picks;
}
