export class Room {
  id;
  description;
  enemies;
  items;
  connections;

  constructor(description, id = null) {
    this.id = id;
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

  connect(direction, room) {
    if (!this.connections.has(direction)) {
      throw new Error(`Unknown direction: ${direction}`);
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
      room.connections.set(opposite, this);
    }
  }

  getConnection(direction) {
    return this.connections.get(direction) ?? null;
  }

  addEnemy(enemy) {
    this.enemies.push(enemy);
  }

  addItem(item) {
    this.items.push(item);
  }

  printRoom() {
    console.log(this.description);

    if (this.enemies.length > 0) {
      console.log("Enemies here:");
      for (const enemy of this.enemies) {
        console.log(`- ${enemy.name ?? enemy}`);
      }
    }

    if (this.items.length > 0) {
      console.log("Items here:");
      for (const item of this.items) {
        console.log(`- ${item.name ?? item}`);
      }
    }

    const passages = [];
    this.connections.forEach((nextRoom, direction) => {
      if (nextRoom) passages.push(direction);
    });

    if (passages.length > 0) {
      console.log(`Passages: ${passages.join(", ")}`);
    }
  }

  printDirections() {
    const directions = [];
    this.connections.forEach((nextRoom, direction) => {
      if (nextRoom) directions.push(direction);
    });
    console.log(`Available directions: ${directions.join(", ")}`);
  }
}
