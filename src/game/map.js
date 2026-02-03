import { Room } from "./room.js";
import { Item } from "./item.js";

export function Map() {
  const entry = new Room("You are at the entrance of a quiet dungeon.");
  const hall = new Room("A long hallway with damp stone walls.");
  const armory = new Room("An old armory. Rusted racks line the walls.");

  entry.connect("north", hall);
  hall.connect("south", entry);

  hall.connect("east", armory);
  armory.connect("west", hall);

  armory.addItem(new Item({ name: "Rusty Sword", type: "weapon", damage: 1 }));

  return { start: entry };
}
