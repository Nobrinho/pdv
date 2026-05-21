import React from "react";

const SystemToolsPanel = ({
  printers = [],
  selectedPrinter = "",
  onSelectedPrinterChange,
  onSavePrinter,
  isSavingPrinter = false,
  onBackup,
  onRestore,
  isBackupRunning = false,
  isRestoreRunning = false,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200">
        <h2 className="text-sm font-black mb-4 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
          <i className="fas fa-print text-surface-600"></i> Impressao
        </h2>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 block ml-1">
              Dispositivo Padrao
            </label>
            <select
              className="w-full border border-surface-300 rounded-xl p-2.5 bg-surface-100 outline-none focus:ring-2 focus:ring-primary-100 transition text-sm font-medium"
              value={selectedPrinter}
              onChange={(e) => onSelectedPrinterChange(e.target.value)}
            >
              <option value="">Configuracao do Windows</option>
              {printers.map((printer) => (
                <option key={printer.name} value={printer.name}>
                  {printer.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={onSavePrinter}
            disabled={isSavingPrinter}
            className="bg-primary px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-primary-700 text-white transition shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            OK
          </button>
        </div>
      </div>

      <div className="bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200 grow">
        <h2 className="text-sm font-black mb-4 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
          <i className="fas fa-database text-green-600"></i> Manutencao Local
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onBackup}
            className="bg-green-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition shadow-md active:scale-95 flex flex-col items-center gap-2"
          >
            <i
              className={`fas fa-lg ${
                isBackupRunning ? "fa-circle-notch fa-spin" : "fa-download"
              }`}
            ></i>{" "}
            {isBackupRunning ? "Executando" : "Backup"}
          </button>
          <button
            onClick={onRestore}
            className="bg-orange-500/10 text-orange-600 border border-orange-500/20 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500/20 transition active:scale-95 flex flex-col items-center gap-2"
          >
            <i
              className={`fas fa-lg ${
                isRestoreRunning ? "fa-circle-notch fa-spin" : "fa-upload"
              }`}
            ></i>{" "}
            {isRestoreRunning ? "Restaurando" : "Restaurar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemToolsPanel;
