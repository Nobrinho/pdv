const http = require("http");
const { config, validateConfig } = require("./config");
const { handleRequest } = require("./app");
const logger = require("./logger");

try {
  validateConfig();
} catch (error) {
  logger.error("config_invalid", { message: error.message });
  console.error(error.message);
  process.exit(1);
}

const server = http.createServer(handleRequest);

server.listen(config.port, () => {
  logger.info("server_started", {
    port: config.port,
    env: config.nodeEnv,
    docs: config.enableDocs,
    corsMode: config.corsOrigins.length ? "allowlist" : "*",
  });
});
