import {
  GameMap,
  Character,
  Action,
  MessageBus,
  pickRandom,
  pickRandomWeapon,
  GameLoop,
  Item,
  context,
  enemyActivation,
  enemyLoop,
  handleAttack,
  handleCast,
  handleDrop,
  handleTake,
  handleRest,
  handleRename,
  handleSearch,
  handleMove,
  Spell
} from "./game/index.js";
import spellTemplates from "./data/spells.json" with { type: "json" };
import itemTemplates from "./data/items.json" with { type: "json" };

context.messages = MessageBus;
context.quitRequested = false;
context.quit = () => { context.quitRequested = true; };

// Setup player
function reset() {
    context.map = new GameMap();
    context.player = new Character("Galahad", 30, 10, { typeid: "player" });
    const startingWeapon = new Item(pickRandomWeapon());
    const startingItem = new Item(pickRandom(itemTemplates.filter(item => item.type != 'Weapon')));
    const startingSpell = new Spell(pickRandom(spellTemplates));
    context.player.acquireItem(startingWeapon)
    context.player.acquireItem(startingItem);
    context.player.equipItem(startingWeapon);

    context.player.addSpell(startingSpell);
    context.activatedEnemies = [];
    context.messages.clearMessages();
    context.map.look();
    context.messages.addMessages('');
    context.player.printCharacter();
}
reset();

const registry = new GameLoop(context);

registry
  .addPreCommandHook(() => enemyActivation())
  .addPostCommandHook(() => enemyLoop())
  .register("help", () => { MessageBus.addMessages(...registry.getHelp()); }, ["?"], "Show this menu")
  .register("quit", () => context.quit(), ["exit"], "Exit game")
  .register("look", () => context.map.look(), ["l"], "Look around")
  .register("attack", (_, args) => handleAttack(args), ["a", "hit"], "Attack target")
  .register("cast", (_, args) => handleCast(args), ["c"], "Cast spell: cast <name> [target]")
  .register("take", (_, args) => handleTake(args), [], "Pick up item")
  .register("equip", (_, args) => Action.useItem(context.player, args.join(" ")), [], "Equip an item")
  .register("consume", (_, args) => Action.useItem(context.player, args.join(" ")), ["use"], "Use a potion/item")
  .register("search", (_, args) => handleSearch(args), [], "Loot a dead enemy")
  .register("directions", () => context.map.printCurrentDirections(), ["dir"], "Show exits")
  .register("map", () => context.map.printMap(), [], "Print current position on map")
  .register("me", () => context.player.printCharacter(), ["stat"], "Show status")
  .register("drop", (_, args) => handleDrop(args), ["d"], "Drop an item")
  .register("rest", () => handleRest(), [], "Rest to recover some health and mana")
  .register("go", (_, args) => handleMove(args[0]), [], "Move: go <direction>")
  .register("north", () => handleMove("north"), ["n"], "Go North")
  .register("south", () => handleMove("south"), ["s"], "Go South")
  .register("east", () => handleMove("east"), ["e"], "Go East")
  .register("west", () => handleMove("west"), ["w"], "Go West")
  .register("reset", () => reset(), [], "Reset game")
  .register("rename", (_, args) => handleRename(args), [], "Rename yourself: rename <new name>");

// --- Start Game ---

MessageBus.clearMessages();
MessageBus.addMessages("Welcome to the Refactored Adventure!", "");
MessageBus.addMessages(...registry.getHelp(), "");
context.map.look();
MessageBus.addMessages("");
context.player.printCharacter();
MessageBus.printMessagesAndClear();

registry.start();

console.log("Goodbye.");