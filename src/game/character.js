import { randomUUID } from "node:crypto";
import { MessageBus } from "./messages.js";

export class Character {
  id;
  typeid;
  name;
  health;
  damage = 0;
  mana;
  usedMana = 0;
  items = [];
  equippedItem = null;
  spells = [];
  spellTypeids = [];
  dead = false;
  messages = MessageBus;

  constructor(name, health, mana, template = {}) {
    this.name = name;
    this.health = health;
    this.mana = mana;
    Object.assign(this, template);

    this.id = this.id || randomUUID();
  }

  currentHealth() {
    return Math.max(0, this.health - this.damage);
  }

  isDead() {
    return this.dead || this.currentHealth() <= 0;
  }

  applyDamage(amount) {
    this.damage += amount;
    if (this.isDead()) {
      this.dead = true;
    }
  }

  applyHeal(amount) {
    this.damage = Math.max(0, this.damage - amount);
  }

  applyManaGain(amount) {
    this.usedMana = Math.max(0, this.usedMana - amount);
  }

  acquireItem(item) {
    this.items.push(item);
    if (item.bonusHealth) {
      this.health += item.bonusHealth;
    }
    if (item.bonusMana) {
      this.mana += item.bonusMana;
    }
    this.messages.addMessages(`${this.name} acquires ${item?.name ?? item}.`);
    return true;
  }

  dropItem(itemName) {
    const lowerName = (itemName ?? "").trim().toLowerCase();
    const itemIndex = this.items.findIndex(
      (i) => (i.name ?? "").toLowerCase() === lowerName,
    );

    if (itemIndex === -1) {
      this.messages.addMessages(`You do not have "${itemName}".`);
      return null;
    }

    const item = this.items.splice(itemIndex, 1)[0];
    if (item.bonusHealth) {
      this.health -= item.bonusHealth;
    }
    if (item.bonusMana) {
      this.mana -= item.bonusMana;
    }
    if (this.equippedItem && this.equippedItem.id === item.id) {
      this.equippedItem = null;
    }
    this.messages.addMessages(`You drop ${item.name ?? item}.`);
    return item;
  }

  addSpell(spell) {
    if (!spell) {
      this.messages.addMessages("No spell to add.");
      return false;
    }
    this.spells.push(spell);
    this.messages.addMessages(`${this.name} learns ${spell?.name ?? spell}.`);
    return true;
  }

  equipItem(item) {
    if (!item) {
      this.messages.addMessages("Nothing to equip.");
      return false;
    }
    this.equippedItem = item;
    this.messages.addMessages(`${this.name} equips ${item.name ?? item}.`);
    return true;
  }

  search() {
    if (!this.isDead()) {
      this.messages.addMessages(`${this.name} is not defeated.`);
      return false;
    }

    const uniqueLoot = new Set(this.items);
    if (this.equippedItem) {
      uniqueLoot.add(this.equippedItem);
    }

    const lootableItems = Array.from(uniqueLoot).filter(
      (item) => item.type !== "Natural",
    );

    this.items = [];
    this.equippedItem = null;

    if (lootableItems.length === 0) {
      this.messages.addMessages(
        `You search ${this.name} but find nothing useful.`,
      );
      return { items: [] };
    }

    this.messages.addMessages(`You search ${this.name} and find:`);
    lootableItems.forEach((item) =>
      this.messages.addMessages(`- ${item.name}`),
    );

    return { items: lootableItems };
  }

  take(source, itemName) {
    const normalizedItemName = (itemName ?? "").trim();
    if (!normalizedItemName) {
      this.messages.addMessages("Usage: take <item name>");
      return null;
    }

    if (!source?.items) {
      this.messages.addMessages("There is nothing to take from.");
      return null;
    }

    if (source instanceof Character && !source.isDead()) {
      this.messages.addMessages(
        "You can only take items from a defeated enemy.",
      );
      return null;
    }

    const lowerName = normalizedItemName.toLowerCase();
    const itemIndex = source.items.findIndex(
      (i) => (i.name ?? "").toLowerCase() === lowerName,
    );

    if (itemIndex === -1) {
      this.messages.addMessages(`No "${normalizedItemName}" here.`);
      return null;
    }

    const item = source.items.splice(itemIndex, 1)[0];
    this.acquireItem(item)

    this.messages.addMessages(`You take ${item.name ?? item}.`);
    return item;
  }

  consume(itemName) {
    const lowerName = (itemName ?? "").trim().toLowerCase();
    const itemIndex = this.items.findIndex(
      (i) => (i.name ?? "").toLowerCase() === lowerName,
    );

    if (itemIndex === -1) {
      this.messages.addMessages(`You do not have "${itemName}".`);
      return false;
    }

    const item = this.items[itemIndex];
    const hGain = item.heals ?? 0;
    const mGain = item.restores ?? 0;

    if (!hGain && !mGain) {
      this.messages.addMessages(`${item.name} cannot be consumed.`);
      return false;
    }

    if (hGain) this.applyHeal(hGain);
    if (mGain) this.usedMana = Math.max(0, this.usedMana - mGain);

    this.items.splice(itemIndex, 1);

    this.messages.addMessages(
      `You consume ${item.name} (+${hGain} HP, +${mGain} MP).`,
    );
    return true;
  }

  printCharacter() {
    this.messages.addMessages(`--- ${this.name} ---`);
    this.messages.addMessages(
      `HP: ${this.currentHealth()} | MP: ${this.mana - this.usedMana}`,
    );
    if (this.equippedItem)
      this.messages.addMessages(`Weapon: ${this.equippedItem.name}`);
    if (this.items.length) {
      this.messages.addMessages("Inventory:");
      this.items.forEach((item) => {
        let details = "";

        switch (item.type) {
          case "Weapon":
            details = ` (Damage: ${item.damage})`;
            break;
          case "Armor":
            const armorBonus = item.bonusHealth
              ? ` +${item.bonusHealth} HP`
              : "";
            details = ` (${item.resilience} Res${armorBonus})`;
            break;
          case "Consumable":
            if (item.heals) details = ` (Heals: ${item.heals} HP)`;
            if (item.restores) details = ` (Restores: ${item.restores} MP)`;
            break;
          case "Trinket":
            const tHP = item.bonusHealth ? `+${item.bonusHealth}HP ` : "";
            const tMP = item.bonusMana ? `+${item.bonusMana}MP` : "";
            details = ` (${(tHP + tMP).trim()})`;
            break;
          case "Scroll":
          case "SpellBook":
            details = ` [Teaches: ${item.teaches.name || "Unknown Spell"}]`;
            break;
        }

        this.messages.addMessages(`- ${item.name}${details}`);
      });
    }
    if (this.spells.length) {
      this.messages.addMessages("Spells:");
      this.spells.forEach((spell) => {
        const parts = [];

        if (spell.damage > 0) {
          const effectiveDmg = spell.damage + Math.floor(this.mana / 2);
          parts.push(`${effectiveDmg} Dmg`);
        }

        if (spell.healsUser > 0) {
          parts.push(`${spell.healsUser} Heal`);
        }

        const stats = parts.length > 0 ? ` (${parts.join(" / ")})` : "";
        const cost = ` [${spell.manaCost ?? 0} MP]`;

        this.messages.addMessages(`- ${spell.name}${stats}${cost}`);
      });
    }
    return true;
  }
}
