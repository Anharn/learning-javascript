import { Room, Character, Item, context, d10 } from "./index.js";
import { MessageBus } from "./messages.js";

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
    return roomTemplates.map(
      (template) => new Room(template.description, template.typeid),
    );
  }

  connectRoomsRandomly(rooms) {
    const DIRECTIONS = ['north', 'south', 'east', 'west', 'up', 'down'];

    const DELTAS = {
      north: { x: 0, y: 1, z: 0 },
      south: { x: 0, y: -1, z: 0 },
      east: { x: 1, y: 0, z: 0 },
      west: { x: -1, y: 0, z: 0 },
      up: { x: 0, y: 0, z: 1 },
      down: { x: 0, y: 0, z: -1 },
    };

    const OPPOSITE = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
      up: 'down',
      down: 'up',
    };

    if (!rooms?.length) return;

    const shuffledRooms = [...rooms];
    this.shuffleInPlace(shuffledRooms);

    const coordinateKey = (x, y, z) => `${x},${y},${z}`;

    const roomByCoordinate = new Map(); // "x,y,z" -> room
    const coordinateByRoom = new Map(); // room -> {x,y,z}

    const connectPair = (fromRoom, directionFromFromRoom, toRoom) => {
      if (fromRoom.getConnection(directionFromFromRoom) !== null) return false;

      const directionFromToRoom = OPPOSITE[directionFromFromRoom];
      if (toRoom.getConnection(directionFromToRoom) !== null) return false;

      fromRoom.connect(directionFromFromRoom, toRoom);
      toRoom.connect(directionFromToRoom, fromRoom);
      return true;
    };

    const placeRoomAt = (room, x, y, z) => {
      roomByCoordinate.set(coordinateKey(x, y, z), room);
      coordinateByRoom.set(room, { x, y, z });
    };

    const neighborCoordinateOf = (x, y, z, direction) => {
      const delta = DELTAS[direction];
      return { x: x + delta.x, y: y + delta.y, z: z + delta.z };
    };

    const firstRoom = shuffledRooms[0];
    placeRoomAt(firstRoom, 0, 0, 0);

    const unplacedRooms = shuffledRooms.slice(1);
    const frontierQueue = [firstRoom];

    while (frontierQueue.length && unplacedRooms.length) {
      const currentRoom = frontierQueue.shift();
      const currentCoordinate = coordinateByRoom.get(currentRoom);
      if (!currentCoordinate) continue;

      const directionsInRandomOrder = [...DIRECTIONS];
      this.shuffleInPlace(directionsInRandomOrder);

      for (const direction of directionsInRandomOrder) {
        if (!unplacedRooms.length) break;

        if (currentRoom.getConnection(direction) !== null) continue;

        const neighborCoordinate = neighborCoordinateOf(
          currentCoordinate.x,
          currentCoordinate.y,
          currentCoordinate.z,
          direction,
        );

        const neighborKey = coordinateKey(
          neighborCoordinate.x,
          neighborCoordinate.y,
          neighborCoordinate.z,
        );

        const existingNeighborRoom = roomByCoordinate.get(neighborKey);

        if (existingNeighborRoom) {
          connectPair(currentRoom, direction, existingNeighborRoom);
          continue;
        }

        const nextRoomToPlace = unplacedRooms.shift();
        placeRoomAt(
          nextRoomToPlace,
          neighborCoordinate.x,
          neighborCoordinate.y,
          neighborCoordinate.z,
        );

        connectPair(currentRoom, direction, nextRoomToPlace);
        frontierQueue.push(nextRoomToPlace);
      }
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
          room.addItem(this.createRandomItem());
        }
        continue;
      }

      const roll = this.randomIntInclusive(1, 10);
      const enemyCount = roll <= 6 ? 1 : roll <= 9 ? 2 : 3;

      for (let i = 0; i < enemyCount; i++) {
        const enemy = this.createEnemy(enemyTemplates, itemTemplates);
        room.addEnemy(enemy);
      }
    }
  }

  createEnemy(enemyTemplates = enemyTemplates, itemTemplates = itemTemplates) {
    const template = this.pickRandom(enemyTemplates);

    const enemy = new Character(template.name, template.health, template.mana, {
      typeid: template.typeid,
    });

    if (template.equippedItemTemplate) {
      enemy.equipItem(new Item(template.equippedItemTemplate));
    } else {
      const weaponData = this.pickRandomWeapon(itemTemplates);
      if (weaponData) {
        const weapon = new Item(weaponData);
        enemy.acquireItem(weapon);
        enemy.equipItem(weapon);
      }
    }

    const maxLoot = Math.ceil(enemy.health / 10);
    const lootCount = this.randomIntInclusive(0, maxLoot);

    for (let i = 0; i < lootCount; i++) {
      const item = new Item(this.pickRandom(itemTemplates));
      enemy.acquireItem(item);

      if (
        item.type === "Weapon" &&
        (!enemy.equippedItem || enemy.equippedItem.type === "Natural")
      ) {
        enemy.equipItem(item);
      }
    }

    if (Array.isArray(template.spellTypeids)) {
      enemy.spellTypeids = [...template.spellTypeids];
    }

    return enemy;
  }

  look() {
    const description = this.currentRoom.getRoomDescription();
    MessageBus.addMessages(...description);
    return description;
  }

  move(direction) {
    const nextRoom = this.currentRoom.getConnection(direction);
    if (!nextRoom) return false;
    this.currentRoom = nextRoom;
    return true;
  }

  moveEnemies(fromRoom, toRoom) {
    if (!fromRoom?.enemies?.length) return [];
    context.activatedEnemies = context.activatedEnemies.filter(
      (a) => a.room !== fromRoom,
    );
    const movedEnemyNames = [];
    const remainingEnemies = [];
    const enemiesToMove = [...fromRoom.enemies].filter(
      (enemy) => !enemy.isDead(),
    );

    for (const enemy of enemiesToMove) {
      const roll = d10();
      if (roll <= 7) {
        toRoom.addEnemy(enemy);
        movedEnemyNames.push(enemy.name ?? String(enemy));
      } else {
        remainingEnemies.push(enemy);
      }
    }

    fromRoom.enemies = remainingEnemies;
    return movedEnemyNames;
  }

  printCurrentDirections() {
    const directions = this.currentRoom.getDirections();
    MessageBus.addMessages(...directions);
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

  pickRandom(list = itemTemplates) {
    return list[this.randomIntInclusive(0, list.length - 1)];
  }

  pickRandomWeapon(list = itemTemplates) {
    const filtered = list.filter((item) => item.type === "Weapon");
    if (filtered.length === 0) return null;
    return filtered[this.randomIntInclusive(0, filtered.length - 1)];
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
