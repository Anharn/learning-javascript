import { randomUUID } from "node:crypto";

export class Room {
  id;
  typeid;
  description;
  enemies;
  items;
  connections;

  constructor(description, typeid = null) {
    this.id = randomUUID();
    this.typeid = typeid;
    this.description = description;
    this.enemies = [];
    this.items = [];
    this.connections = new Map([
      ["north", null],
      ["south", null],
      ["east", null],
      ["west", null],
      ["up", null],
      ["down", null]
    ]);
  }

  addEnemy(enemy, messages) {
    this.enemies.push(enemy);
    messages?.push(`${enemy?.name ?? enemy} added to the room.`);
    return this;
  }

  addItem(item, messages) {
    this.items.push(item);
    messages?.push(`${item?.name ?? item} added to the room.`);
    return this;
  }

  connect(direction, room, messages, overwrite = false) {
    if (!this.connections.has(direction)) {
      throw new Error(`Unknown direction: ${direction}`);
    }

    if (!overwrite && this.getConnection(direction)) {
      messages?.push(`A passage ${direction} already exists.`);
      return this;
    }

    this.connections.set(direction, room);

    const oppositeDirections = new Map([
      ["north", "south"],
      ["south", "north"],
      ["east", "west"],
      ["west", "east"],
      ["up", "down"],
      ["down", "up"]
    ]);

    const opposite = oppositeDirections.get(direction);
    if (opposite && room?.connections?.has(opposite)) {
      const oppositeAlreadySet = room.getConnection(opposite);
      if (overwrite || !oppositeAlreadySet) {
        room.connections.set(opposite, this);
      }
    }

    messages?.push(`Connected ${this.id ?? "room"} ${direction} to ${room?.id ?? "room"}.`);
    return this;
  }

  getConnection(direction) {
    return this.connections.get(direction) ?? null;
  }

  getDirections() {
    const directions = [];
    this.connections.forEach((nextRoom, direction) => {
      if (nextRoom) directions.push(direction);
    });

    if (!directions.length) return ["There are no visible exits."];

    return [`Available directions: ${directions.join(", ")}`];
  }

  getEnemies() {
    return [...this.enemies];
  }

  getItems() {
    return [...this.items];
  }

  getRoomDescription() {
    const messages = [];
    messages.push(this.description);

    if (this.enemies.length > 0) {
      messages.push("Enemies here:");
      for (const enemy of this.enemies) {
        messages.push(`- ${enemy.name ?? enemy}`);
      }
    }

    if (this.items.length > 0) {
      messages.push("Items here:");
      for (const item of this.items) {
        messages.push(`- ${item.name ?? item}`);
      }
    }

    messages.push(...this.getDirections());

    return messages;
  }

  removeEnemy(enemy, messages) {
    const enemyName = enemy?.name ?? enemy;
    const beforeCount = this.enemies.length;
    this.enemies = this.enemies.filter(candidate => candidate.id !== enemy.id);

    if (this.enemies.length !== beforeCount) {
       messages?.push(`${enemyName} removed from the room.`);
    } else {
       messages?.push(`${enemyName} was not in the room.`);
    }

    return this;
  }

  removeItem(item, messages) {
    const itemName = item?.name ?? item;
    const beforeCount = this.items.length;
    this.items = this.items.filter(candidate => candidate.id !== item.id);

    if (this.items.length !== beforeCount) {
       messages?.push(`${itemName} removed from the room.`);
    } else {
       messages?.push(`${itemName} was not in the room.`);
    }

    return this;
  }
}
