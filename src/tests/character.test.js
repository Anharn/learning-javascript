import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { Character } from "../game/character.js";
import { MessageBus } from "../game/messages.js";

describe("Character Class", () => {
  let player;
  let consoleSpy;

  beforeEach(() => {
    // Reset the singleton state
    MessageBus.clearMessages();
    
    // Setup console spy
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    player = new Character("Hero", 100, 50);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("should set core properties correctly", () => {
      expect(player.name).toBe("Hero");
      expect(player.health).toBe(100);
      expect(player.isDead()).toBe(false);
    });
  });

  describe("Health Management", () => {
    it("should reduce health via applyDamage", () => {
      player.applyDamage(40);
      expect(player.currentHealth()).toBe(60);
    });

    it("should set dead flag when health hits 0", () => {
      player.applyDamage(100);
      expect(player.isDead()).toBe(true);
      expect(player.dead).toBe(true);
    });

    it("should increase health via applyHeal", () => {
      player.applyDamage(50);
      player.applyHeal(30);
      expect(player.currentHealth()).toBe(80);
    });
  });

  describe("Inventory & MessageBus Integration", () => {
    it("should log item acquisition to the console via MessageBus", () => {
      const item = { name: "Rusty Key" };
      player.acquireItem(item);
      
      // Flush messages to console
      MessageBus.printMessagesAndClear();
      
      expect(consoleSpy).toHaveBeenCalledWith("Hero acquires Rusty Key.");
    });

    it("should log equip actions to the console", () => {
      const sword = { name: "Steel Sword", type: "Weapon" };
      player.equipItem(sword);
      
      MessageBus.printMessagesAndClear();
      
      expect(consoleSpy).toHaveBeenCalledWith("Hero equips Steel Sword.");
    });
  });

  describe("Item Consumption", () => {
    it("should heal the player and log effects", () => {
      const potion = { id: "p1", name: "Health Potion", heals: 20 };
      player.applyDamage(50);
      player.items.push(potion);

      player.consume("Health Potion");
      MessageBus.printMessagesAndClear();

      expect(player.currentHealth()).toBe(70);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("You consume Health Potion (+20 HP, +0 MP)."));
    });

    it("should log error message when item is not found", () => {
      player.consume("Non-existent Potion");
      MessageBus.printMessagesAndClear();

      expect(consoleSpy).toHaveBeenCalledWith('You do not have "Non-existent Potion".');
    });
  });

  describe("Character Information", () => {
    it("should print character stats to the MessageBus", () => {
      player.printCharacter();
      MessageBus.printMessagesAndClear();

      expect(consoleSpy).toHaveBeenCalledWith("--- Hero ---");
      expect(consoleSpy).toHaveBeenCalledWith("HP: 100 | MP: 50");
    });
  });
});