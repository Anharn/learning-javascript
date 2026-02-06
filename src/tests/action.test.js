import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Action } from "../game/action.js";
import { Character } from "../game/character.js";
import { MessageBus } from "../game/messages.js";

describe("Action Class", () => {
  let attacker;
  let target;
  let consoleSpy;

  beforeEach(() => {
    MessageBus.clearMessages();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    attacker = new Character("Attacker", 100, 50);
    target = new Character("Target", 100, 50);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Physical Attacks", () => {
    it("should handle a MISS (natural 1)", () => {
      // Force a 1: (0 * 20) + 1 = 1
      vi.spyOn(Math, "random").mockReturnValue(0);
      
      Action.attack(attacker, target);
      MessageBus.printMessagesAndClear();

      expect(target.currentHealth()).toBe(100);
      expect(consoleSpy).toHaveBeenCalledWith("Attacker swings at Target and misses!");
    });

    it("should handle a CRITICAL HIT (natural 20)", () => {
      // Force a 20: (0.99 * 20) + 1 = 20.8 -> floor is 20
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      attacker.equipItem({ name: "Sword", type: "Weapon", damage: 10 });
      
      Action.attack(attacker, target);
      MessageBus.printMessagesAndClear();

      // Damage: 10 * 2 = 20
      expect(target.currentHealth()).toBe(80);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Critical hit!"));
    });

    it("should apply variable damage on a standard HIT", () => {
      // Force middle of the road roll (e.g., 10) and 1.0 variance
      // This is tricky with one Math.random spy, so we mock specific returns sequentially
      const randomSpy = vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.5) // Roll logic
        .mockReturnValueOnce(0.5); // Variance logic: 0.8 + (0.5 * 0.4) = 1.0

      attacker.equipItem({ name: "Mace", type: "Weapon", damage: 10 });
      
      Action.attack(attacker, target);
      MessageBus.printMessagesAndClear();

      expect(target.currentHealth()).toBe(90);
      expect(consoleSpy).toHaveBeenCalledWith("Attacker attacks Target for 10 damage. They have 90 HP left.");
    });
  });

  describe("Spell Casting", () => {
    const fireball = { name: "Fireball", manaCost: 10, damage: 20 };

    it("should fail if caster lacks enough mana", () => {
      attacker.usedMana = 45; // Only 5 left
      Action.cast(fireball, attacker, target);
      MessageBus.printMessagesAndClear();

      expect(consoleSpy).toHaveBeenCalledWith("Attacker does not have enough mana to cast Fireball!");
      expect(target.currentHealth()).toBe(100);
    });

    it("should deduct mana and deal damage on success", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5); // Ensure hit and 1.0 variance
      
      Action.cast(fireball, attacker, target);
      MessageBus.printMessagesAndClear();

      expect(attacker.mana - attacker.usedMana).toBe(40);
      expect(target.currentHealth()).toBe(80);
      expect(consoleSpy).toHaveBeenCalledWith("Attacker casts Fireball on Target.");
    });

    it("should heal the user if the spell has healsUser property", () => {
      const healSpell = { name: "Lesser Heal", manaCost: 5, healsUser: 15 };
      attacker.applyDamage(20);
      
      Action.cast(healSpell, attacker, target);
      MessageBus.printMessagesAndClear();

      expect(attacker.currentHealth()).toBe(95);
      expect(consoleSpy).toHaveBeenCalledWith("Attacker is healed for 15.");
    });
  });

  describe("Using Items", () => {
    it("should equip a weapon when used", () => {
      const axe = { name: "Battle Axe", type: "Weapon", damage: 15 };
      attacker.items.push(axe);
      
      Action.useItem(attacker, "Battle Axe");
      MessageBus.printMessagesAndClear();

      expect(attacker.equippedItem.name).toBe("Battle Axe");
      expect(consoleSpy).toHaveBeenCalledWith("Attacker equips the Battle Axe.");
    });

    it("should consume a potion and apply both HP and MP effects", () => {
      const elixir = { name: "Elixir", heals: 10, restores: 10 };
      attacker.applyDamage(20);
      attacker.usedMana = 20;
      attacker.items.push(elixir);

      Action.useItem(attacker, "Elixir");
      MessageBus.printMessagesAndClear();

      expect(attacker.currentHealth()).toBe(90);
      expect(attacker.mana - attacker.usedMana).toBe(40);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("You use Elixir. (+10 HP, +10 MP)"));
    });
  });
});