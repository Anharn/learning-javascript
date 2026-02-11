import { Room, context, d10, MessageBus, populateRooms } from "./index.js";
import roomTemplates from "../data/rooms.json" with { type: "json" };

export class GameMap {
  rooms;
  currentRoom;

  constructor() {
    this.rooms = this.buildRooms(roomTemplates);
    this.currentRoom = this.rooms.get("0,0,0");
    this.currentRoom.visited = true;
  }

  buildRooms(roomTemplates) {
    const rooms = roomTemplates.map((t) => new Room(t.description, t.typeid));
    this.shuffleInPlace(rooms);
    return this.connectRooms(populateRooms(rooms));
  }

  connectRooms(shuffledRooms) {
    const DIRECTIONS = ["north", "south", "east", "west", "up", "down"];
    const DELTAS = {
      north: { x: 0, y: 1, z: 0 },
      south: { x: 0, y: -1, z: 0 },
      east: { x: 1, y: 0, z: 0 },
      west: { x: -1, y: 0, z: 0 },
      up: { x: 0, y: 0, z: 1 },
      down: { x: 0, y: 0, z: -1 },
    };
    const OPPOSITE = {
      north: "south",
      south: "north",
      east: "west",
      west: "east",
      up: "down",
      down: "up",
    };

    const roomMap = new Map();
    const coords = new Map();
    const getKey = (p) => `${p.x},${p.y},${p.z}`;

    const first = shuffledRooms.shift();
    const origin = { x: 0, y: 0, z: 0 };
    roomMap.set(getKey(origin), first);
    coords.set(first, origin);

    const queue = [first];

    while (queue.length > 0 && shuffledRooms.length > 0) {
      const current = queue.shift();
      const pos = coords.get(current);
      const randomDirs = [...DIRECTIONS];
      this.shuffleInPlace(randomDirs);

      for (const dir of randomDirs) {
        if (shuffledRooms.length === 0) break;
        if (current.getConnection(dir)) continue;

        const delta = DELTAS[dir];
        const nextPos = {
          x: pos.x + delta.x,
          y: pos.y + delta.y,
          z: pos.z + delta.z,
        };
        const key = getKey(nextPos);

        let neighbor = roomMap.get(key);
        if (!neighbor) {
          neighbor = shuffledRooms.shift();
          roomMap.set(key, neighbor);
          coords.set(neighbor, nextPos);
          queue.push(neighbor);
        }

        if (!neighbor.getConnection(OPPOSITE[dir])) {
          current.connect(dir, neighbor);
          neighbor.connect(OPPOSITE[dir], current);
        }
      }
    }
    return roomMap;
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
    this.currentRoom.visited = true;
    return true;
  }

  moveEnemies(fromRoom, toRoom) {
    if (!fromRoom?.enemies?.length) return [];
    context.activatedEnemies = context.activatedEnemies.filter(
      (a) => a.room !== fromRoom,
    );

    const movedEnemyNames = [];
    const remainingEnemies = [];

    fromRoom.enemies.forEach((enemy) => {
      if (!enemy.isDead() && d10() <= 7) {
        toRoom.addEnemy(enemy);
        movedEnemyNames.push(enemy.name);
      } else {
        remainingEnemies.push(enemy);
      }
    });

    fromRoom.enemies = remainingEnemies;
    return movedEnemyNames;
  }

  printCurrentDirections() {
    const directions = this.currentRoom.getDirections();
    MessageBus.addMessages(...directions);
    return directions;
  }

  getAvailableDirections() {
    return Array.from(this.currentRoom.connections.keys()).filter((dir) =>
      this.currentRoom.getConnection(dir),
    );
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  randomIntInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  shuffleInPlace(list) {
    for (let index = list.length - 1; index > 0; index--) {
      const swapIndex = this.randomIntInclusive(0, index);
      [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
    }
  }

  printMap() {
    let playerPos = { x: 0, y: 0, z: 0 };
    for (const [key, room] of this.rooms.entries()) {
      if (room === this.currentRoom) {
        const [x, y, z] = key.split(",").map(Number);
        playerPos = { x, y, z };
        break;
      }
    }

    let minX = playerPos.x,
      maxX = playerPos.x,
      minY = playerPos.y,
      maxY = playerPos.y;
    for (const [key, room] of this.rooms.entries()) {
      const [x, y, z] = key.split(",").map(Number);
      if (z === playerPos.z && room.visited) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }

    const mapOutput = [`--- Level ${playerPos.z} ---`];

    for (let y = maxY; y >= minY; y--) {
      let topRow = "",
        midRow = "",
        botRow = "";

      for (let x = minX; x <= maxX; x++) {
        const room = this.rooms.get(`${x},${y},${playerPos.z}`);
        if (!room || !room.visited) {
          topRow += "   ";
          midRow += "   ";
          botRow += "   ";
          continue;
        }

        const hasN = !!room.getConnection("north");
        const hasS = !!room.getConnection("south");
        const hasE = !!room.getConnection("east");
        const hasW = !!room.getConnection("west");
        const hasUp = !!room.getConnection("up");
        const hasDown = !!room.getConnection("down");
        const hasEnemies = room.enemies?.some((e) => !e.isDead());
        const isPlayer = x === playerPos.x && y === playerPos.y;

        topRow += `┌${hasN ? " " : "─"}┐`;

        let centerChar = " ";
        if (isPlayer) {
          centerChar = "◎";
        } else if (hasEnemies) {
          centerChar = "E";
        } else if (hasUp && hasDown) {
          centerChar = "⇵";
        } else if (hasUp) {
          centerChar = "↑";
        } else if (hasDown) {
          centerChar = "↓";
        }

        midRow += `${hasW ? " " : "│"}${centerChar}${hasE ? " " : "│"}`;
        botRow += `└${hasS ? " " : "─"}┘`;
      }
      mapOutput.push(topRow, midRow, botRow);
    }

    MessageBus.addMessages(...mapOutput);
  }
}
