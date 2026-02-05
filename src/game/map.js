import { Room } from "./room.js";
import { Character } from "./character.js";
import { Item } from "./item.js";

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
    return roomTemplates.map(t => new Room(t.description, t.id));
  }

  connectRoomsRandomly(rooms) {
    const directions = ["north", "south", "east", "west", "up", "down"];

    const shuffledRooms = [...rooms];
    this.shuffleInPlace(shuffledRooms);

    for (let i = 1; i < shuffledRooms.length; i++) {
      const a = shuffledRooms[i - 1];
      const b = shuffledRooms[i];

      const available = directions.filter(d => a.getConnection(d) === null);
      const direction = available.length > 0 ? this.pickRandom(available) : this.pickRandom(directions);

      a.connect(direction, b);
    }

    const extraConnections = Math.max(0, Math.floor(rooms.length / 2));
    for (let i = 0; i < extraConnections; i++) {
      const a = this.pickRandom(rooms);
      const b = this.pickRandom(rooms);
      if (a === b) continue;

      const available = directions.filter(d => a.getConnection(d) === null);
      if (available.length === 0) continue;

      a.connect(this.pickRandom(available), b);
    }
  }

  populateRooms(rooms, enemyTemplates, itemTemplates) {
    for (const room of rooms) {
      const enemyRoll = Math.random();

      if (enemyRoll < 0.5) {
        if (Math.random() < 0.1) {
          const item = this.createItem(this.pickRandom(itemTemplates));
          room.addItem(item);
        }
        continue;
      } else {
        const d10 = this.randomIntInclusive(1, 10);
        const enemyCount = d10 <= 6 ? 1 : d10 <= 9 ? 2 : 3;
        for (let i = 0; i < enemyCount; i++) {
            const enemyTemplate = this.pickRandom(enemyTemplates);

            const enemy = new Character(
            enemyTemplate.name,
            enemyTemplate.health,
            enemyTemplate.mana,
            { id: enemyTemplate.id }
            );

            const item = this.createItem(this.pickRandom(itemTemplates));
            enemy.acquireItem(item);

            if (item.type === "Weapon") {
            enemy.equipWeapon(item);
            }

            room.addEnemy(enemy);
        }
      }
    }
  }

  createItem(itemTemplate) {
    return new Item(itemTemplate);
  }

  move(direction) {
    const next = this.currentRoom.getConnection(direction);
    if (!next) return false;
    this.currentRoom = next;
    return true;
  }

  look() {
    this.currentRoom.printRoom();
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  getAvailableDirections() {
    const directions = [];
    this.currentRoom.connections.forEach((nextRoom, direction) => {
      if (nextRoom) directions.push(direction);
    });
    return directions;
  }

  moveEnemies(fromRoom, toRoom) {
    if (fromRoom.enemies?.length === 0) return;

    for (const enemy of fromRoom.enemies) {
        toRoom.addEnemy(enemy);
    }

    fromRoom.enemies = [];
  }

  printCurrentDirections() {
    this.currentRoom.printDirections();
  }

  pickRandom(list) {
    return list[this.randomIntInclusive(0, list.length - 1)];
  }

  randomIntInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  shuffleInPlace(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = this.randomIntInclusive(0, i);
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
  }
}
