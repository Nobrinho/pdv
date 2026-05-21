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
  createBudget: vi.fn(),
  updateBudget: vi.fn(),
  getBudgets: vi.fn(),
  getBudgetById: vi.fn(),
  getBudgetItems: vi.fn(),
  cancelBudget: vi.fn(),
  duplicateBudget: vi.fn(),
  convertBudgetToSale: vi.fn(),
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
  saveGeneratedFile: vi.fn(),
};

// Mock do Contexto de Alerta
vi.mock("../apps/pdv/src/context/AlertSystem", () => ({
  useAlert: () => ({
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
  }),
}));
