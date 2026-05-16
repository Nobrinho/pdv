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
  saveConfig: vi.fn(),
  checkOnboardingStatus: vi.fn(),
  registerUser: vi.fn(),
  loginAttempt: vi.fn(),
  verifyAdmin: vi.fn(),
  logoutSession: vi.fn(),
  getAppVersion: vi.fn(),
  logEvent: vi.fn(),
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  quitAndInstall: vi.fn(),
  onUpdateAvailable: vi.fn(),
  onUpdateProgress: vi.fn(),
  onUpdateDownloaded: vi.fn(),
  onUpdateError: vi.fn(),
  printSilent: vi.fn(),
};

// Mock do Contexto de Alerta
vi.mock("../src/context/AlertSystem", () => ({
  useAlert: () => ({
    showAlert: vi.fn(),
  }),
}));
