class Messages {
  #messages = [];

  addMessages(...messages) {
    if (!messages?.length) return;
    messages.forEach(message => this.#messages.push(message));
  }

  printMessagesAndClear() {
    for (const message of this.#messages) {
        console.log(message);
    }
    this.#messages = [];
  }

  clearMessages() {
    this.#messages = [];
  }
}

export const MessageBus = new Messages();