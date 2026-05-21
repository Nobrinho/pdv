const http = require("http");
const { config } = require("./config");
const { handleRequest } = require("./app");

const server = http.createServer(handleRequest);

server.listen(config.port, () => {
  console.log(`[server] API SysControl ouvindo em http://localhost:${config.port}`);
});
