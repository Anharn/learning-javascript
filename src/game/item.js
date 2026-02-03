export class Item {
    name;
    type;
    damage;
    heals;
    restores;
    resilience;

    constructor({ name, type, damage, resilience, bonusHealth, bonusMana, heals, restores }) {
        this.name = name;
        this.type = type;
        this.damage = damage;
        this.bonusHealth = bonusHealth;
        this.resilience = resilience;
    }
}