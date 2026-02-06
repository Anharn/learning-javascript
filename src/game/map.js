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
    const DIRECTIONS = ["north", "south", "east", "west"];
    const DELTAS = {
      north: { x: 0, y: -1 },
      south: { x: 0, y: 1 },
      west: { x: -1, y: 0 },
      east: { x: 1, y: 0 },
    };
    const OPPOSITE = {
      north: "south",
      south: "north",
      west: "east",
      east: "west",
    };

    if (!rooms?.length) return;

    const n = rooms.length;
    const width = Math.ceil(Math.sqrt(n));
    const height = Math.ceil(n / width);

    const shuffled = [...rooms];
    this.shuffleInPlace(shuffled);

    const cells = new Map(); // "x,y" -> room
    const posByRoom = new Map(); // room -> {x,y}

    const keyOf = (x, y) => `${x},${y}`;

    const inBounds = (x, y) => x >= 0 && y >= 0 && x < width && y < height;

    const openNeighbors = (x, y) => {
      const list = [];
      for (const dir of DIRECTIONS) {
        const d = DELTAS[dir];
        const nx = x + d.x;
        const ny = y + d.y;
        if (!inBounds(nx, ny)) continue;
        if (!cells.has(keyOf(nx, ny))) list.push({ dir, x: nx, y: ny });
      }
      return list;
    };

    const occupiedNeighbors = (x, y) => {
      const list = [];
      for (const dir of DIRECTIONS) {
        const d = DELTAS[dir];
        const nx = x + d.x;
        const ny = y + d.y;
        if (!inBounds(nx, ny)) continue;
        const room = cells.get(keyOf(nx, ny));
        if (room) list.push({ dir, room, x: nx, y: ny });
      }
      return list;
    };

    const connectPair = (a, dirFromA, b) => {
      if (a.getConnection(dirFromA) !== null) return false;
      const dirFromB = OPPOSITE[dirFromA];
      if (b.getConnection(dirFromB) !== null) return false;

      a.connect(dirFromA, b);
      b.connect(dirFromB, a);
      return true;
    };

    const placeRoom = (room, x, y) => {
      const k = keyOf(x, y);
      cells.set(k, room);
      posByRoom.set(room, { x, y });
    };

    // Place first room at center-ish
    placeRoom(shuffled[0], Math.floor(width / 2), Math.floor(height / 2));

    // Grow a connected layout by placing each new room into an empty adjacent cell
    for (let i = 1; i < shuffled.length; i++) {
      const room = shuffled[i];

      const occupiedKeys = [...cells.keys()];
      this.shuffleInPlace(occupiedKeys);

      let placed = false;

      for (const k of occupiedKeys) {
        const [xStr, yStr] = k.split(",");
        const x = Number(xStr);
        const y = Number(yStr);

        const candidates = openNeighbors(x, y);
        if (!candidates.length) continue;

        const pick = this.pickRandom(candidates);
        placeRoom(room, pick.x, pick.y);

        const fromRoom = cells.get(k);
        connectPair(fromRoom, pick.dir, room);

        placed = true;
        break;
      }

      if (!placed) {
        for (let y = 0; y < height && !placed; y++) {
          for (let x = 0; x < width && !placed; x++) {
            const k2 = keyOf(x, y);
            if (!cells.has(k2)) {
              placeRoom(room, x, y);

              const neighbors = occupiedNeighbors(x, y).filter(
                (nbr) => nbr.room.getConnection(OPPOSITE[nbr.dir]) === null,
              );
              if (neighbors.length) {
                const nbr = this.pickRandom(neighbors);
                connectPair(room, nbr.dir, nbr.room);
              }

              placed = true;
            }
          }
        }
      }
    }

    // Add some extra connections, but ONLY between adjacent occupied cells
    const extraConnections = Math.max(0, Math.floor(n / 2));
    const attempts = extraConnections * 8;

    for (let i = 0, made = 0; i < attempts && made < extraConnections; i++) {
      const fromRoom = this.pickRandom(rooms);
      const pos = posByRoom.get(fromRoom);
      if (!pos) continue;

      const adjacent = occupiedNeighbors(pos.x, pos.y);
      if (!adjacent.length) continue;

      const pick = this.pickRandom(adjacent);

      if (connectPair(fromRoom, pick.dir, pick.room)) made++;
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
