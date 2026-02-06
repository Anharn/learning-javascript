import promptSync from "prompt-sync";
import { MessageBus } from "./messages.js";

export class GameLoop {
  commands;
  preCommandHooks = [];
  postCommandHooks = [];
  context;
  messages = MessageBus;

  constructor(context) {
    this.commands = new Map();
    this.context = context;
  }

  register(name, handler, aliases = [], description = "") {
    const key = name.toLowerCase();
    this.commands.set(key, { name: key, handler, aliases, description });

    for (const alias of aliases) {
      this.commands.set(alias.toLowerCase(), { name: key, handler });
    }

    return this;
  }

  getHelp() {
    const lines = ["Commands:"];
    const seen = new Set();

    for (const [key, entry] of this.commands) {
      if (seen.has(entry.name)) continue;
      seen.add(entry.name);

      const aliasText = entry.aliases.length > 0 ? ` (${entry.aliases.join(", ")})` : "";
      const descText = entry.description ? ` - ${entry.description}` : "";
      lines.push(`  ${entry.name}${aliasText}${descText}`);
    }

    return lines;
  }

  addPostCommandHook(hook) {
    this.postCommandHooks.push(hook);
    return this;
  }

  addPreCommandHook(hook) {
    this.preCommandHooks.push(hook);
    return this;
  }

  start() {
    const { map, player } = this.context;
    const prompt = promptSync({ sigint: true });

    const parseInput = (raw) => {
      const trimmed = raw.trim();
      if (!trimmed) return null;

      const parts = trimmed.split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      return { command, args, raw: trimmed };
    };

    while (!this.context.quitRequested) {
      const raw = prompt("> ");
      const parsed = parseInput(raw);
      if (!parsed) continue;

      if (parsed.command === "quit" || parsed.command === "exit") break;

      const entry = this.commands.get(parsed.command);
      if (!entry) {
        console.log("Unknown command. Type 'help'.");
        continue;
      }
      for (const hook of this.preCommandHooks) {
        hook(this.context, parsed.args, parsed.raw);
      }
      entry.handler(this.context, parsed.args, parsed.raw);
      for (const hook of this.postCommandHooks) {
        hook(this.context, parsed.args, parsed.raw);
      }
      this.messages.printMessagesAndClear();
    }
  }
}
