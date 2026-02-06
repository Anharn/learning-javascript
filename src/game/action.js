import { MessageBus } from "./messages.js";
import { rollDice, d100, d10 } from "./utilities.js";

export class Action {
  static ROLL_MAX = 20;

  static _resolveRoll(baseDamage) {
    const roll = d100();

    if (roll <= 10) {
      return { damage: 0, type: "MISS" };
    }

    if (roll >= 95) {
      return { damage: Math.round(baseDamage * 1.5), type: "CRIT" };
    }

    const finalDamage = rollDice(1, baseDamage);

    return { damage: finalDamage, type: "HIT" };
  }

  static attack(attacker, target) {
    if (attacker.isDead()) return;

    const isArmed = attacker.equippedItem?.type === "Weapon" || attacker.equippedItem?.type === "Natural";
    const baseDamage = isArmed ? (attacker.equippedItem?.damage ?? 3) : 1;

    const result = this._resolveRoll(baseDamage);

    if (result.type === "MISS") {
      MessageBus.addMessages(`${attacker.name} swings at ${target.name} and misses!`);
    } else {
      const critText = result.type === "CRIT" ? " Critical hit!" : "";
      target.applyDamage(result.damage);
      MessageBus.addMessages(`${attacker.name} attacks ${target.name} with ${attacker?.equippedItem?.name} for ${result.damage} damage.${critText} They have ${target.currentHealth()} HP left.`);
    }

    if (target.isDead()) {
      MessageBus.addMessages(`${target.name} is defeated.`);
    }
  }

  static cast(spell, caster, target) {
    if (!spell || caster.isDead()) return;

    const manaAvailable = caster.mana - caster.usedMana;
    if (manaAvailable < (spell.manaCost ?? 0)) {
      MessageBus.addMessages(`${caster.name} does not have enough mana to cast ${spell.name}!`);
      return;
    }

    caster.usedMana += (spell.manaCost ?? 0);

    MessageBus.addMessages(`${caster.name} casts ${spell.name} on ${target.name}.`);
    if (spell.castMessages?.length) {
      MessageBus.addMessages(...spell.castMessages);
    }

    const spellBase = spell.damage ?? 0;
    if (spellBase > 0) {
      const result = this._resolveRoll(spellBase);
      if (result.type === "MISS") {
        MessageBus.addMessages("The spell fizzles and misses the target!");
      } else {
        const damage = result.damage + Math.floor(caster.mana / 2);
        target.applyDamage(damage);
        MessageBus.addMessages(`${target.name} takes ${damage} magic damage. They have ${target.currentHealth()} HP left.`);
      }
    }

    if (spell.healsUser > 0) {
      caster.applyHeal(spell.healsUser);
      MessageBus.addMessages(`${caster.name} is healed for ${spell.healsUser}.`);
    }

    if (target.isDead()) {
      MessageBus.addMessages(`${target.name} is defeated.`);
    }
  }

  static useItem(character, itemName) {
    if (character.isDead()) return;

    const nameLower = (itemName ?? "").trim().toLowerCase();
    const itemIndex = character.items.findIndex(
      (i) => (i.name ?? "").toLowerCase() === nameLower
    );

    if (itemIndex === -1) {
      MessageBus.addMessages(`${character.name} does not have "${itemName}".`);
      return;
    }

    const item = character.items[itemIndex];

    if (item.heals > 0 || item.restores > 0) {
      if (item.heals) character.applyHeal(item.heals);
      if (item.restores) {
        character.usedMana = Math.max(0, character.usedMana - item.restores);
      }

      character.items.splice(itemIndex, 1);

      const effects = [];
      if (item.heals) effects.push(`+${item.heals} HP`);
      if (item.restores) effects.push(`+${item.restores} MP`);
      
      MessageBus.addMessages(`You use ${item.name}. (${effects.join(", ")})`);
    } 
    else if (item.type === "Weapon" || item.type === "Armor") {
      character.equippedItem = item;
      MessageBus.addMessages(`${character.name} equips the ${item.name}.`);
    } 
    else {
      MessageBus.addMessages(`${item.name} cannot be used right now.`);
    }
  }
}