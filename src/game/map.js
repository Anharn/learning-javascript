import { Room, Character, Item } from "./index.js";

import roomTemplates from "../data/rooms.json" with { type: "json" };
import enemyTemplates from "../data/enemies.json" with { type: "json" };
import itemTemplates from "../data/items.json" with { type: "json" };

export class GameMap {
  rooms;
  currentRoom;

  constructor() {
    this.rooms = this.buildRooms(roomTemplates);
    this.connectRoomsRandomly(this.rooms);
    this.populateRooms(this.rooms, enemyTemplates, itemTemplates);
    this.currentRoom = this.pickRandom(this.rooms);
  }

  buildRooms(roomTemplates) {
    return roomTemplates.map(template => new Room(template.description, template.typeid));
  }

  connectRoomsRandomly(rooms) {
    const directions = ["north", "south", "east", "west", "up", "down"];
    const shuffledRooms = [...rooms];
    this.shuffleInPlace(shuffledRooms);

    for (let index = 1; index < shuffledRooms.length; index++) {
      const previousRoom = shuffledRooms[index - 1];
      const nextRoom = shuffledRooms[index];

      const availableDirections = directions.filter(direction => previousRoom.getConnection(direction) === null);
      const chosenDirection = availableDirections.length ? this.pickRandom(availableDirections) : this.pickRandom(directions);

      previousRoom.connect(chosenDirection, nextRoom);
    }

    const extraConnections = Math.max(0, Math.floor(rooms.length / 2));
    for (let index = 0; index < extraConnections; index++) {
      const fromRoom = this.pickRandom(rooms);
      const toRoom = this.pickRandom(rooms);
      if (fromRoom === toRoom) continue;

      const availableDirections = directions.filter(direction => fromRoom.getConnection(direction) === null);
      if (!availableDirections.length) continue;

      fromRoom.connect(this.pickRandom(availableDirections), toRoom);
    }
  }

  createItem(itemTemplate) {
    return new Item(itemTemplate);
  }

  createRandomItem() {
    return this.createItem(this.pickRandom(itemTemplates));
  }

  populateRooms(rooms, enemyTemplates, itemTemplates) {
    for (const room of rooms) {
      const enemyRoll = Math.random();

      if (enemyRoll < 0.5) {
        if (Math.random() < 0.1) {
          const item = new Item(this.pickRandom(itemTemplates));
          room.addItem(item);
        }
        continue;
      }

      const roll = this.randomIntInclusive(1, 10);
      const enemyCount = roll <= 6 ? 1 : roll <= 9 ? 2 : 3;

      for (let index = 0; index < enemyCount; index++) {
        const enemyTemplate = this.pickRandom(enemyTemplates);

        const enemy = new Character(
          enemyTemplate.name,
          enemyTemplate.health,
          enemyTemplate.mana,
          { typeid: enemyTemplate.typeid }
        );

        if (enemyTemplate.equippedItemTemplate) {
          enemy.equipItem(new Item(enemyTemplate.equippedItemTemplate));
        } else {
          const item = new Item(this.pickRandom(itemTemplates));
          enemy.acquireItem(item);
          if (item.type === "Weapon") enemy.equipWeapon(item);
        }

        if (Array.isArray(enemyTemplate.spellTypeids)) {
          enemy.spellTypeids = [...enemyTemplate.spellTypeids];
        }

        room.addEnemy(enemy);
      }
    }
  }

  look(messages) {
    const description = this.currentRoom.getRoomDescription();
    messages?.push(...description);
    return description;
  }

  move(direction) {
    const nextRoom = this.currentRoom.getConnection(direction);
    if (!nextRoom) return false;
    this.currentRoom = nextRoom;
    return true;
  }

  moveEnemies(fromRoom, toRoom, messages) {
    if (!fromRoom?.enemies?.length) return [];

    const movedEnemyNames = [];
    const enemiesToMove = [...fromRoom.enemies];

    for (const enemy of enemiesToMove) {
      toRoom.addEnemy(enemy, messages);
      movedEnemyNames.push(enemy.name ?? String(enemy));
    }

    fromRoom.enemies = [];
    return movedEnemyNames;
  }

  printCurrentDirections(messages) {
    const directions = this.currentRoom.getDirections();
    messages?.push(...directions);
    return directions;
  }

  getAvailableDirections() {
    const directions = [];
    this.currentRoom.connections.forEach((nextRoom, direction) => {
      if (nextRoom) directions.push(direction);
    });
    return directions;
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  pickRandom(list) {
    return list[this.randomIntInclusive(0, list.length - 1)];
  }

  randomIntInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  shuffleInPlace(list) {
    for (let index = list.length - 1; index > 0; index--) {
      const swapIndex = this.randomIntInclusive(0, index);
      const temp = list[index];
      list[index] = list[swapIndex];
      list[swapIndex] = temp;
    }
  }
}
