import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Room } from "../game/room.js";
import { MessageBus } from "../game/messages.js";

describe("Room Class", () => {
  let room1;
  let room2;
  let consoleSpy;

  beforeEach(() => {
    MessageBus.clearMessages();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    room1 = new Room("A dark, damp cellar.");
    room2 = new Room("A bright, sunlit hallway.");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with a UUID and empty collections", () => {
      expect(room1.id).toBeDefined();
      expect(room1.enemies).toHaveLength(0);
      expect(room1.items).toHaveLength(0);
    });
  });

  describe("Room Connections", () => {
    it("should connect rooms bi-directionally by default", () => {
      room1.connect("north", room2);
      
      expect(room1.getConnection("north")).toBe(room2);
      expect(room2.getConnection("south")).toBe(room1);
    });

    it("should throw an error for invalid directions", () => {
      expect(() => room1.connect("sideways", room2)).toThrow("Unknown direction: sideways");
    });

    it("should log connection messages to the MessageBus", () => {
      room1.connect("east", room2);
      MessageBus.printMessagesAndClear();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Connected"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("east"));
    });

    it("should prevent overwriting connections unless specified", () => {
      const room3 = new Room("A third room.");
      room1.connect("north", room2);
      room1.connect("north", room3); // Should fail to overwrite
      
      MessageBus.printMessagesAndClear();
      expect(room1.getConnection("north")).toBe(room2);
      expect(consoleSpy).toHaveBeenCalledWith("A passage north already exists.");
    });
  });

  describe("Entities and Inventory", () => {
    it("should add and remove enemies correctly", () => {
      const enemy = { id: "e1", name: "Goblin" };
      room1.addEnemy(enemy);
      expect(room1.getEnemies()).toContain(enemy);

      room1.removeEnemy(enemy);
      expect(room1.getEnemies()).not.toContain(enemy);
      
      MessageBus.printMessagesAndClear();
      expect(consoleSpy).toHaveBeenCalledWith("Goblin added to the room.");
      expect(consoleSpy).toHaveBeenCalledWith("Goblin removed from the room.");
    });

    it("should add and remove items correctly", () => {
      const item = { id: "i1", name: "Golden Key" };
      room1.addItem(item);
      expect(room1.getItems()).toContain(item);

      room1.removeItem(item);
      expect(room1.getItems()).not.toContain(item);
      
      MessageBus.printMessagesAndClear();
      expect(consoleSpy).toHaveBeenCalledWith("Golden Key added to the room.");
      expect(consoleSpy).toHaveBeenCalledWith("Golden Key removed from the room.");
    });
  });

  describe("Descriptions", () => {
    it("should generate a complete description with exits, enemies, and items", () => {
      room1.connect("west", room2);
      room1.addEnemy({ name: "Orc" });
      room1.addItem({ name: "Sword" });

      const desc = room1.getRoomDescription();

      expect(desc).toContain("A dark, damp cellar.");
      expect(desc).toContain("Enemies here:");
      expect(desc).toContain("- Orc");
      expect(desc).toContain("Items here:");
      expect(desc).toContain("- Sword");
      expect(desc).toContain("Available directions: west");
    });

    it("should show a 'no visible exits' message when isolated", () => {
      const directions = room1.getDirections();
      expect(directions).toContain("There are no visible exits.");
    });
  });
});