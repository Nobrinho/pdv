export function createIpcHarness() {
  const handlers = new Map();
  const safeHandle = (channel, handler) => {
    handlers.set(channel, async (event, ...args) => {
      try {
        return await handler(event, ...args);
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  };

  const invoke = (channel, event, ...args) => {
    const handler = handlers.get(channel);
    if (!handler) throw new Error(`Handler nao registrado: ${channel}`);
    return handler(event, ...args);
  };

  return { safeHandle, invoke };
}

export const eventFor = (id = 1) => ({ sender: { id } });
