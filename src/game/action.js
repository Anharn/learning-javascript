import { MessageBus } from "./messages.js";
import { rollDice, d100 } from "./utilities.js";

export class Action {
  static MISS_THRESHOLD = 10;
  static CRIT_THRESHOLD = 95;
  static CRIT_MULTIPLIER = 1.5;
  static UNARMED_DAMAGE = 1;
  static NATURAL_WEAPON_FALLBACK = 3;

  static _resolveRoll(potentialDamage, hitBonus = 0) {
    const accuracyRoll = d100() + hitBonus;

    if (accuracyRoll <= this.MISS_THRESHOLD) {
      return { damage: 0, type: "MISS" };
    }

    if (accuracyRoll >= this.CRIT_THRESHOLD) {
      return {
        damage: Math.round(potentialDamage * this.CRIT_MULTIPLIER),
        type: "CRIT",
      };
    }

    return { damage: rollDice(1, potentialDamage), type: "HIT" };
  }

  static attack(attacker, defender) {
    if (attacker.isDead() || defender.isDead()) return;

    const hitBonus = Math.floor(attacker.health / 35);
    const equipment = attacker.equippedItem;
    const isArmed =
      equipment?.type === "Weapon" || equipment?.type === "Natural";
    const weaponDamage = isArmed
      ? (equipment.damage ?? this.NATURAL_WEAPON_FALLBACK)
      : this.UNARMED_DAMAGE;

    const result = this._resolveRoll(weaponDamage, hitBonus);
    const weaponName = equipment?.name ?? "bare hands";

    if (result.type === "MISS") {
      MessageBus.addMessages(`${attacker.name} misses ${defender.name}!`);
      return;
    }

    const criticalSuffix = result.type === "CRIT" ? " Critical hit!" : "";
    defender.applyDamage(result.damage);

    MessageBus.addMessages(
      `${attacker.name} hits ${defender.name} with ${weaponName} for ${result.damage} damage.${criticalSuffix}`,
      `${defender.name} has ${defender.currentHealth()} HP left.`,
    );

    if (defender.isDead())
      MessageBus.addMessages(`${defender.name} is defeated.`);
  }

  static cast(spell, caster, primaryTarget, roomEnemies = []) {
    if (!spell || caster.isDead()) return;

    const availableMana = caster.mana - caster.usedMana;
    const cost = spell.manaCost ?? 0;

    if (availableMana < cost) {
      MessageBus.addMessages(`${caster.name} does not have enough mana!`);
      return;
    }

    caster.usedMana += cost;
    MessageBus.addMessages(`${caster.name} casts ${spell.name}!`);
    if (spell.castMessages) MessageBus.addMessages(...spell.castMessages);

    const hitBonus = Math.floor(caster.mana / 15);
    const magicDamageBonus = Math.floor(caster.mana / 2);
    const magicHealingBonus = Math.round(caster.mana / 5);

    if (spell.damage > 0) {
      const targets = this._determineSpellTargets(
        spell,
        primaryTarget,
        roomEnemies,
      );

      targets.forEach(({ target, damageMultiplier }) => {
        const baseDamage = Math.round(spell.damage * damageMultiplier);
        const result = this._resolveRoll(baseDamage, hitBonus);

        if (result.type === "MISS") {
          MessageBus.addMessages(`The spell misses ${target.name}!`);
        } else {
          const finalDamage = result.damage + magicDamageBonus;
          target.applyDamage(finalDamage);
          MessageBus.addMessages(
            `${target.name} takes ${finalDamage} magic damage.`,
          );

          if (spell.effect === "vampiric" && finalDamage > 0) {
            const healAmount = Math.floor(finalDamage / 2) + magicHealingBonus;
            caster.applyHeal(healAmount);
            MessageBus.addMessages(
              `${caster.name} siphons ${healAmount} health!`,
            );
          }
        }
      });
    }

    if (spell.healsUser > 0) {
      const totalHeal = spell.healsUser + magicHealingBonus;
      caster.applyHeal(totalHeal);
      MessageBus.addMessages(`${caster.name} is healed for ${totalHeal}.`);
    }
  }

  static _determineSpellTargets(spell, primaryTarget, roomEnemies) {
    if (spell.effect === "area") {
      return roomEnemies.map((enemy) => ({
        target: enemy,
        damageMultiplier: 1.0,
      }));
    }

    if (spell.effect === "targets-additional" && roomEnemies.length > 1) {
      const secondary = roomEnemies.find(
        (e) => e !== primaryTarget && !e.isDead(),
      );
      const list = [{ target: primaryTarget, damageMultiplier: 1.0 }];
      if (secondary) list.push({ target: secondary, damageMultiplier: 0.5 });
      return list;
    }

    return primaryTarget
      ? [{ target: primaryTarget, damageMultiplier: 1.0 }]
      : [];
  }

  static useItem(character, itemName) {
    if (character.isDead()) return;

    const searchName = (itemName ?? "").trim().toLowerCase();
    const inventoryIndex = character.items.findIndex(
      (item) => (item.name ?? "").toLowerCase() === searchName,
    );

    if (inventoryIndex === -1) {
      MessageBus.addMessages(`${character.name} does not have "${itemName}".`);
      return;
    }

    const item = character.items[inventoryIndex];

    if (item.heals > 0 || item.restores > 0) {
      if (item.heals) character.applyHeal(item.heals);
      if (item.restores)
        character.usedMana = Math.max(0, character.usedMana - item.restores);
      character.items.splice(inventoryIndex, 1);
      MessageBus.addMessages(`${character.name} uses ${item.name}.`);
    } else if (["Weapon", "Armor", "Shield"].includes(item.type)) {
      character.equippedItem = item;
      MessageBus.addMessages(`${character.name} equips the ${item.name}.`);
    }
    if (item.teaches) {
      item.teaches.forEach((spell) => {
        character.addSpell(spell);
      });
    }
  }
}
