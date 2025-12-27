// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useAlert } from '../context/AlertSystem';

const Updater = () => {
  // Estados: idle, checking, available, starting, downloading, ready, error
  const [status, setStatus] = useState("idle");
  const [version, setVersion] = useState("");
  const [progress, setProgress] = useState(0);
  const { showAlert } = useAlert();


  useEffect(() => {
    if (window.api && window.api.checkForUpdates) {
      window.api.checkForUpdates();
    }

    // Listeners
    window.api.onUpdateAvailable((ver) => {
      setVersion(ver);
      setStatus("available");
    });

    window.api.onUpdateProgress((percent) => {
      // Só muda para downloading se já não estiver (evita flickering)
      setStatus("downloading");
      setProgress(Math.round(percent));
    });

    window.api.onUpdateDownloaded(() => {
      setStatus("ready");
    });

    window.api.onUpdateError((err) => {
      console.error("Erro update:", err);
      // Opcional: mostrar erro se desejar, ou apenas resetar para idle
      // setStatus('error');
    });
  }, []);

  const startDownload = async () => {
    // 1. Feedback imediato
    setStatus("starting");

    // 2. Chama o backend
    const result = await window.api.downloadUpdate();

    // 3. Se falhar no início (antes de começar o progresso)
    if (!result || !result.success) {
      showAlert(
        "Não foi possível iniciar o download: " +
          (result?.error || "Erro desconhecido")
      );
      setStatus("available"); // Volta para permitir tentar de novo
    }
  };

  const installNow = () => {
    window.api.quitAndInstall();
  };

  if (status === "idle" || status === "checking" || status === "error")
    return null;

  return (
    <div className="fixed bottom-5 right-5 bg-white p-5 rounded-xl shadow-2xl border border-blue-100 w-80 animate-fade-in z-[9999]">
      {/* 1. Nova Versão Encontrada */}
      {status === "available" && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
              <i className="fas fa-gift"></i>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">
                Nova Versão {version}
              </h4>
              <p className="text-xs text-gray-500">Melhorias disponíveis.</p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setStatus("idle")}
              className="flex-1 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition"
            >
              Depois
            </button>
            <button
              onClick={startDownload}
              className="flex-1 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
            >
              Baixar Agora
            </button>
          </div>
        </div>
      )}

      {/* 2. Iniciando (Novo Estado) */}
      {status === "starting" && (
        <div className="text-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-xs text-gray-500 font-medium">
            Iniciando download...
          </p>
        </div>
      )}

      {/* 3. Baixando... */}
      {status === "downloading" && (
        <div>
          <div className="flex justify-between items-end mb-2">
            <h4 className="font-bold text-gray-800 text-sm">A Baixar...</h4>
            <span className="text-xs font-mono text-blue-600 font-bold">
              {progress}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 4. Pronto para Instalar */}
      {status === "ready" && (
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3 text-xl">
            <i className="fas fa-check"></i>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Atualização Pronta!</h4>
          <p className="text-xs text-gray-500 mb-4">
            O sistema precisa reiniciar para aplicar.
          </p>
          <button
            onClick={installNow}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 transition shadow-md text-sm"
          >
            REINICIAR E INSTALAR
          </button>
        </div>
      )}
    </div>
  );
};

export default Updater;
