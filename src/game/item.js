import { randomUUID } from "node:crypto";

export class Item {
  id;
  typeid;
  name;
  type;
  damage;
  heals;
  restores;
  resilience;
  bonusHealth;
  bonusMana;
  useMessages;

  constructor({ typeid, name, type, damage, resilience, bonusHealth, bonusMana, heals, restores, useMessages } = {}) {
    this.id = randomUUID();
    this.typeid = typeid;
    this.name = name;
    this.type = type;
    this.damage = damage;
    this.resilience = resilience;
    this.bonusHealth = bonusHealth;
    this.bonusMana = bonusMana;
    this.heals = heals;
    this.restores = restores;
    this.useMessages = Array.isArray(useMessages) ? useMessages : [];
  }

  damageItem(amount) {
    if (typeof this.resilience !== "number") {
      return [];
    }

    const appliedDamage = Math.max(0, amount ?? 0);
    this.resilience = Math.max(0, this.resilience - appliedDamage);

    if (this.resilience === 0) {
      return [`${this.name} was destroyed.`];
    }

    return [`${this.name} was damaged.`];
  }

  getUseMessages() {
    if (!this.useMessages.length) return [];
    return [...this.useMessages];
  }

  toString() {
    return this.name;
  }
}
