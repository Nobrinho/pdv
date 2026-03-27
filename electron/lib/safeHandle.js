const { ipcMain } = require("electron");

/**
 * Wrapper que registra um IPC handler com try/catch padronizado.
 * Garante que todo erro seja logado no console e retornado ao renderer
 * no formato { success: false, error: "mensagem" }.
 *
 * @param {string} channel - Nome do canal IPC
 * @param {Function} handler - Função async (event, ...args) => resultado
 */
function safeHandle(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      console.error(`❌ [${channel}]`, error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { safeHandle };
