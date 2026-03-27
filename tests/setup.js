import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock da window.api (Electron IPC)
global.window.api = {
  getProducts: vi.fn(),
  searchProducts: vi.fn(),
  getSales: vi.fn(),
  getSaleItems: vi.fn(),
  createSale: vi.fn(),
  getClients: vi.fn(),
  getPeople: vi.fn(),
  getConfig: vi.fn(),
  printSilent: vi.fn(),
};

// Mock do Contexto de Alerta
vi.mock("../src/context/AlertSystem", () => ({
  useAlert: () => ({
    showAlert: vi.fn(),
  }),
}));
