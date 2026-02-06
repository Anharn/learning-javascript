import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GameLoop } from "../game/game-loop.js";
import { MessageBus } from "../game/messages.js";
import promptSync from "prompt-sync";

// 1. Mock the module
vi.mock("prompt-sync", () => {
  const mockPrompt = vi.fn();
  return {
    // This handles the 'import promptSync from "prompt-sync"' syntax
    default: vi.fn(() => mockPrompt) 
  };
});

describe("GameLoop Class", () => {
  let loop;
  let context;
  let consoleSpy;
  let mockPrompt;

  beforeEach(() => {
    MessageBus.clearMessages();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    context = { quitRequested: false };
    loop = new GameLoop(context);
    
    // 2. Get the actual mock function that start() calls
    // Since promptSync() returns the internal prompt function:
    mockPrompt = vi.fn();
    vi.mocked(promptSync).mockReturnValue(mockPrompt);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Command Registration", () => {
    it("should register a command and its aliases", () => {
      const handler = vi.fn();
      loop.register("look", handler, ["l", "examine"]);
      
      expect(loop.commands.has("look")).toBe(true);
      expect(loop.commands.has("l")).toBe(true);
      expect(loop.commands.has("examine")).toBe(true);
    });
  });

  describe("Execution Flow", () => {
    it("should execute pre-hooks, handlers, and post-hooks in order", () => {
      const order = [];
      
      loop.addPreCommandHook(() => order.push("pre"));
      loop.register("test", () => order.push("handler"));
      loop.addPostCommandHook(() => order.push("post"));

      mockPrompt
        .mockReturnValueOnce("test")
        .mockReturnValueOnce("quit");

      loop.start({ player: {}, map: {} });

      expect(order).toEqual(["pre", "handler", "post"]);
    });

    it("should pass context and arguments to handlers", () => {
      let capturedArgs = null;
      loop.register("attack", (ctx, args) => {
        capturedArgs = args;
      });

      mockPrompt
        .mockReturnValueOnce("attack goblin head")
        .mockReturnValueOnce("quit");

      loop.start({ player: "hero" });

      expect(capturedArgs).toEqual(["goblin", "head"]);
    });

    it("should handle unknown commands and log to console", () => {
      mockPrompt
        .mockReturnValueOnce("invalid_command")
        .mockReturnValueOnce("quit");

      loop.start({});

      expect(consoleSpy).toHaveBeenCalledWith("Unknown command. Type 'help'.");
    });
  });

  describe("Loop Control", () => {
    it("should exit immediately when 'exit' is typed", () => {
      const handler = vi.fn();
      loop.register("move", handler);

      mockPrompt.mockReturnValueOnce("exit");

      loop.start({});

      expect(handler).not.toHaveBeenCalled();
    });

    it("should flush MessageBus at the end of each valid command cycle", () => {
      loop.register("shout", () => {
        MessageBus.addMessages("HELLO WORLD");
      });

      mockPrompt
        .mockReturnValueOnce("shout")
        .mockReturnValueOnce("quit");

      loop.start({});

      expect(consoleSpy).toHaveBeenCalledWith("HELLO WORLD");
    });
  });
});