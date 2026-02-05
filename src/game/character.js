import { randomUUID } from "node:crypto";

export class Character {
  id;
  typeid;
  name;
  health;
  damage = 0;
  mana;
  usedMana = 0;
  items;
  equippedItem;
  spells;
  spellTypeids;
  dead = false;

  constructor(name, health, mana, template = {}) {
    this.name = name;
    this.health = health;
    this.mana = mana;
    this.items = [];
    this.equippedItem = null;
    this.spells = [];
    this.spellTypeids = [];

    for (const [key, value] of Object.entries(template)) {
      this[key] = value;
    }

    this.id = randomUUID();
  }

  acquireItem(item, messages) {
    this.items.push(item);

    const addedMessages = [`${this.name} acquires ${item?.name ?? item}.`];
    messages?.push(...addedMessages);
    return addedMessages;
  }

  addSpell(spell, messages) {
    if (!spell) {
      const addedMessages = ["No spell to add."];
      messages?.push(...addedMessages);
      return addedMessages;
    }

    this.spells.push(spell);

    const addedMessages = [`${this.name} learns ${spell?.name ?? spell}.`];
    messages?.push(...addedMessages);
    return addedMessages;
  }

  affectedBySpell(spell, caster, messages) {
    if (!spell) {
      const affectedMessages = ["No spell affected anything."];
      messages?.push(...affectedMessages);
      return affectedMessages;
    }

    const spellName = spell?.name ?? "a spell";
    const spellDamage = Number.isFinite(spell?.damage) ? spell.damage : 0;
    const healCasterAmount = Number.isFinite(spell?.healsUser) ? spell.healsUser : 0;

    const affectedMessages = [];

    if (spellDamage > 0) {
      this.damage += spellDamage;
      affectedMessages.push(`${this.name} is hit by ${spellName} for ${spellDamage} damage.`);
    } else {
      affectedMessages.push(`${this.name} is affected by ${spellName}.`);
    }

    if (caster && healCasterAmount > 0) {
      caster.damage = Math.max(0, caster.damage - healCasterAmount);
      affectedMessages.push(`${caster.name} recovers ${healCasterAmount} health.`);
    }

    if (this.isDead()) {
      this.dead = true;
      affectedMessages.push(`${this.name} is defeated.`);
    }

    messages?.push(...affectedMessages);
    return affectedMessages;
  }

  attacked(enemy, messages) {
    const weaponDamage =
      enemy?.equippedItem?.type === "Weapon" || enemy?.equippedItem?.type === "Natural"
        ? enemy.equippedItem?.damage ?? 2
        : 1;

    this.damage += weaponDamage;

    const attackedMessages = [`${enemy.name} attacks ${this.name} for ${weaponDamage} damage.`];

    if (this.isDead()) {
      this.dead = true;
      attackedMessages.push(`${this.name} is defeated.`);
    }

    messages?.push(...attackedMessages);
    return attackedMessages;
  }

  currentHealth() {
    return this.health - this.damage;
  }

  equipItem(item, messages) {
    if (!item) {
      const equipMessages = ["Nothing to equip."];
      messages?.push(...equipMessages);
      return equipMessages;
    }

    this.equippedItem = item;

    const equipMessages = [`${this.name} equips ${item.name ?? item}.`];
    messages?.push(...equipMessages);
    return equipMessages;
  }

  equipWeapon(weapon, messages) {
    return this.equipItem(weapon, messages);
  }

  isDead() {
    return this.dead === true || this.currentHealth() <= 0;
  }

  printCharacter(messages) {
    const characterMessages = [];
    characterMessages.push(`Name: ${this.name}`);
    characterMessages.push(`Health: ${this.currentHealth()}`);
    characterMessages.push(`Mana: ${this.mana - this.usedMana}`);

    if (this.equippedItem) {
      characterMessages.push(`Equipped Item: ${this.equippedItem.name ?? this.equippedItem}`);
    }

    if (this.spells?.length) {
      characterMessages.push("Spells:");
      for (const spell of this.spells) {
        characterMessages.push(`- ${spell.name ?? spell}`);
      }
    }

    if (this.items.length > 0) {
      characterMessages.push("Items:");
      for (const item of this.items) {
        characterMessages.push(`- ${item.name ?? item}`);
      }
    }

    messages?.push(...characterMessages);
    return characterMessages;
  }

  search(messages) {
    if (!this.isDead()) {
      const searchMessages = [`${this.name} is not defeated.`];
      messages?.push(...searchMessages);
      return { items: [], messages: searchMessages };
    }

    if (!this.items?.length) {
      const searchMessages = [`You search ${this.name} but find nothing.`];
      messages?.push(...searchMessages);
      return { items: [], messages: searchMessages };
    }

    const foundItems = [...this.items];
    this.items = [];

    const searchMessages = [`You search ${this.name} and find:`];
    for (const item of foundItems) {
      searchMessages.push(`- ${item.name ?? item}`);
    }

    messages?.push(...searchMessages);
    return { items: foundItems, messages: searchMessages };
  }

  take(source, itemName, messages) {
    const normalizedItemName = (itemName ?? "").trim();
    if (!normalizedItemName) {
      const takeMessages = ["Usage: take <item name>"];
      messages?.push(...takeMessages);
      return { item: null, messages: takeMessages };
    }

    if (!source || !Array.isArray(source.items)) {
      const takeMessages = ["There is nothing to take from."];
      messages?.push(...takeMessages);
      return { item: null, messages: takeMessages };
    }

    if (source instanceof Character && !source.isDead()) {
      const takeMessages = ["You can only take items from a defeated enemy."];
      messages?.push(...takeMessages);
      return { item: null, messages: takeMessages };
    }

    const normalizedItemNameLower = normalizedItemName.toLowerCase();
    const item = source.items.find(
      candidateItem => (candidateItem.name ?? "").toLowerCase() === normalizedItemNameLower
    );

    if (!item) {
      const takeMessages = [`No "${normalizedItemName}" here.`];
      messages?.push(...takeMessages);
      return { item: null, messages: takeMessages };
    }

    source.items = source.items.filter(candidateItem => candidateItem.id !== item.id);
    this.items.push(item);

    const takeMessages = [`You take ${item.name ?? item}.`];
    messages?.push(...takeMessages);
    return { item, messages: takeMessages };
  }

  consume(itemName, messages) {
    const normalizedItemName = (itemName ?? "").trim();
    if (!normalizedItemName) {
      const consumeMessages = ["Usage: consume <item name>"];
      messages?.push(...consumeMessages);
      return consumeMessages;
    }

    const normalizedItemNameLower = normalizedItemName.toLowerCase();
    const item = this.items.find(
      candidateItem => (candidateItem.name ?? "").toLowerCase() === normalizedItemNameLower
    );

    if (!item) {
      const consumeMessages = [`You do not have "${normalizedItemName}".`];
      messages?.push(...consumeMessages);
      return consumeMessages;
    }

    const healthGain = item.heals ?? 0;
    const manaGain = item.restores ?? 0;

    if (!healthGain && !manaGain) {
      const consumeMessages = [`${item.name ?? "That item"} cannot be consumed.`];
      messages?.push(...consumeMessages);
      return consumeMessages;
    }

    if (healthGain) {
      this.damage = Math.max(0, this.damage - healthGain);
    }

    if (manaGain) {
      this.usedMana = Math.max(0, this.usedMana - manaGain);
    }

    this.items = this.items.filter(inventoryItem => inventoryItem.id !== item.id);

    const effects = [];
    if (healthGain) effects.push(`+${healthGain} health`);
    if (manaGain) effects.push(`+${manaGain} mana`);

    const consumeMessages = [`You consume ${item.name ?? item} (${effects.join(", ")}).`];
    messages?.push(...consumeMessages);
    return consumeMessages;
  }
}
