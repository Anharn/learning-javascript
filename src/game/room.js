export class Room {
  description;
  enemies;
  items;
  connections;

  constructor(description) {
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
    this.connections.set(direction, room);

    const oppositeDirections = {
      north: "south",
      south: "north",
      east: "west",
      west: "east",
      up: "down",
      down: "up"
    };

    const opposite = oppositeDirections[direction];
    if (opposite) {
      room.connections.set(opposite, this);
    }
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
    this.connections.forEach((room, direction) => {
      if (room) passages.push(direction);
    });

    if (passages.length > 0) {
      console.log(`Passages: ${passages.join(", ")}`);
    }
  }
}
