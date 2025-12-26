// @ts-nocheck
import React, { useEffect, useState } from "react";

const Updater = () => {
  const [status, setStatus] = useState("idle"); // idle, checking, available, downloading, ready, error
  const [version, setVersion] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 1. Verificar atualizações assim que o componente carrega
    if (window.api && window.api.checkForUpdates) {
      window.api.checkForUpdates();
    }

    // 2. Configurar os ouvintes (listeners)

    // Atualização disponível
    const removeAvailable = window.api.onUpdateAvailable((ver) => {
      console.log("Atualização disponível:", ver);
      setVersion(ver);
      setStatus("available");
    });

    // Progresso do download
    const removeProgress = window.api.onUpdateProgress((percent) => {
      setStatus("downloading");
      setProgress(Math.round(percent));
    });

    // Download concluído
    const removeDownloaded = window.api.onUpdateDownloaded(() => {
      setStatus("ready");
    });

    // Erro
    const removeError = window.api.onUpdateError((err) => {
      console.error("Erro no update:", err);
      // Opcional: setStatus('error'); para mostrar erro na tela
    });

    // Limpeza ao desmontar (boa prática)
    return () => {
      // Se a sua ponte preload suportar removeListener, use aqui.
      // Como simplificamos a ponte, apenas garantimos que não duplique lógica.
    };
  }, []);

  const startDownload = () => {
    window.api.downloadUpdate();
  };

  const installNow = () => {
    window.api.quitAndInstall();
  };

  // Se não estiver a acontecer nada, não mostra nada na tela
  if (status === "idle" || status === "checking" || status === "error")
    return null;

  return (
    <div className="fixed bottom-5 right-5 bg-white p-5 rounded-xl shadow-2xl border border-blue-100 w-80 animate-fade-in z-[9999]">
      {/* 1. Nova Encontrada */}
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

      {/* 2. Baixando... */}
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

      {/* 3. Pronto para Instalar */}
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
