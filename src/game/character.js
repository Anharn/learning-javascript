import { randomUUID } from "node:crypto";

export class Character {
  id;
  name;
  health;
  damage = 0;
  mana;
  usedMana = 0;
  items;
  equippedItem;

  constructor(name, health, mana, template = {}) {
    this.name = name;
    this.health = health;
    this.mana = mana;
    this.items = [];
    this.equippedItem = null;

    for (const [key, value] of Object.entries(template)) {
        this[key] = value;
    }
    
    this.id = randomUUID();
  }


  acquireItem(item) {
    this.items.push(item);
  }

  currentHealth() {
    return this.health - this.damage;
  }

  equipItem(item) {
    this.equippedItem = item;
  }

  equipWeapon(weapon) {
    this.equipItem(weapon);
  }

  attacked(enemy) {
    const weaponDamage = enemy.equippedItem.type === 'weapon' ? enemy.equippedItem?.damage ?? 2 : 1;
    console.log(`${enemy.name} attacks ${this.name} for ${weaponDamage} damage.`);
    this.damage += weaponDamage;
  }

  printCharacter() {
    console.log(`Name: ${this.name}`);
    console.log(`Health: ${this.health}`);
    console.log(`Mana: ${this.mana}`);

    if (this.equippedItem) {
      console.log(`Equipped Item: ${this.equippedItem.name ?? this.equippedItem}`);
    }

    if (this.items.length > 0) {
      console.log("Items:");
      for (const item of this.items) {
        console.log(`- ${item.name ?? item}`);
      }
    }
  }
}
