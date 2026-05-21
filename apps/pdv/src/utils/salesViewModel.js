export const getSalesPeopleByRole = (people = []) => ({
  sellers: people.filter((person) => person.cargo_nome === "Vendedor"),
  mechanics: people.filter((person) => person.cargo_nome === "Trocador"),
});

export const findSelectedClient = (clients = [], selectedClient) =>
  clients.find((client) => client.id == selectedClient);

export const findSavedClient = (clients = [], resultId, documento = "") =>
  clients.find(
    (client) => client.id === resultId || (documento && client.documento === documento),
  );
