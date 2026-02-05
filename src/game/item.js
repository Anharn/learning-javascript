export class Item {
  id;
  name;
  type;
  damage;
  heals;
  restores;
  resilience;
  bonusHealth;
  bonusMana;

  constructor({ id, name, type, damage, resilience, bonusHealth, bonusMana, heals, restores }) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.damage = damage;
    this.resilience = resilience;
    this.bonusHealth = bonusHealth;
    this.bonusMana = bonusMana;
    this.heals = heals;
    this.restores = restores;
  }

  toString() {
    return this.name;
  }
}
