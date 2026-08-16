// Ponto de entrada do código compartilhado (@syscontrol/shared).
// Sem workspaces no repo: os consumidores importam por caminho relativo,
// ex.: require("../../../../packages/shared/domain/tenant").
module.exports = {
  ...require("./domain/tenant"),
  ...require("./domain/commission"),
  ...require("./domain/permissions"),
};
