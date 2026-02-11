import { Character, Item, pickRandom, randomInt } from "./index.js";
import enemyTemplates from "../data/enemies.json" with { type: "json" };
import itemTemplates from "../data/items.json" with { type: "json" };
import spellTemplates from "../data/spells.json" with { type: "json" };

export const pickRandomWeapon = () => {
  const weapons = itemTemplates.filter((i) => i.type === "Weapon");
  return weapons.length ? pickRandom(weapons) : null;
};

export const createEnemy = (possibleEnemies = enemyTemplates) => {
  const template = pickRandom(possibleEnemies);
  const enemy = new Character(template.name, template.health, template.mana, {
    typeid: template.typeid,
  });

  // Initial Arming
  const weaponTemplate = template.equippedItemTemplate || pickRandomWeapon();
  if (weaponTemplate) {
    const weapon = new Item(weaponTemplate);
    enemy.acquireItem(weapon);
    enemy.equipItem(weapon);
  }

  // Scaling Loot
  const lootCount = randomInt(0, Math.ceil(enemy.health / 10));
  for (let i = 0; i < lootCount; i++) {
    const item = new Item(pickRandom(itemTemplates));
    enemy.acquireItem(item);

    const isBetterWeapon =
      item.type === "Weapon" &&
      (!enemy.equippedItem || enemy.equippedItem.type !== "Natural");

    if (isBetterWeapon) enemy.equipItem(item);
  }

  if (template.spellTypeids) {
    template.spellTypeids.forEach(typeid => {
        enemy.addSpell(getSpellById(typeid));
    });
  }
  return enemy;
};

export const getSpellById = (id) => {
    return spellTemplates.find(spell => spell.typeid === id);
}

export const populateRooms = (rooms) => {
  rooms.forEach((room) => {
    if (Math.random() < 0.5) {
      if (Math.random() < 0.1)
        room.addItem(new Item(pickRandom(itemTemplates)));
      return;
    }

    const roll = randomInt(1, 10);
    const enemyCount = roll <= 6 ? 1 : roll <= 9 ? 2 : 3;

    for (let i = 0; i < enemyCount; i++) {
      room.addEnemy(createEnemy());
    }
  });
  return rooms;
};
