import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info", // 'info', 'error', 'success', 'confirm'
    onConfirm: null,
    onCancel: null,
  });

  const confirmButtonRef = useRef(null);

  // Gerenciamento de foco: Joga o foco para o botão do modal quando abre
  useEffect(() => {
    if (alertState.isOpen && confirmButtonRef.current) {
      // Pequeno timeout para garantir que o DOM renderizou
      setTimeout(() => confirmButtonRef.current.focus(), 50);
    }
  }, [alertState.isOpen]);

  // Função para substituir o alert()
  const showAlert = (message, title = "Aviso", type = "info") => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        title,
        message,
        type,
        onConfirm: () => {
          closeAlert();
          resolve(true);
        },
      });
    });
  };

  // Função para substituir o confirm()
  // Uso: const aceitou = await showConfirm('Tem certeza?'); if (aceitou) { ... }
  const showConfirm = (message, title = "Confirmação") => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        title,
        message,
        type: "confirm",
        onConfirm: () => {
          closeAlert();
          resolve(true);
        },
        onCancel: () => {
          closeAlert();
          resolve(false);
        },
      });
    });
  };

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  // Cores baseadas no tipo
  const getTypeStyles = () => {
    switch (alertState.type) {
      case "error":
        return {
          icon: "fa-times",
          color: "text-red-500",
          bg: "bg-red-100",
          btn: "bg-red-600 hover:bg-red-700",
        };
      case "success":
        return {
          icon: "fa-check",
          color: "text-green-500",
          bg: "bg-green-100",
          btn: "bg-green-600 hover:bg-green-700",
        };
      case "confirm":
        return {
          icon: "fa-question",
          color: "text-blue-500",
          bg: "bg-blue-100",
          btn: "bg-blue-600 hover:bg-blue-700",
        };
      default:
        return {
          icon: "fa-info",
          color: "text-blue-500",
          bg: "bg-blue-100",
          btn: "bg-blue-600 hover:bg-blue-700",
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* O Modal Global */}
      {alertState.isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-[90%] transform transition-all scale-100 border border-gray-100"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center mb-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${styles.bg} ${styles.color}`}
              >
                <i className={`fas ${styles.icon} text-lg`}></i>
              </div>
              <h3 className="text-xl font-bold text-gray-800">
                {alertState.title}
              </h3>
            </div>

            <p className="text-gray-600 mb-6 text-base leading-relaxed">
              {alertState.message}
            </p>

            <div className="flex justify-end gap-3">
              {alertState.type === "confirm" && (
                <button
                  onClick={() => {
                    if (alertState.onCancel) alertState.onCancel();
                  }}
                  className="px-5 py-2 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition"
                >
                  Cancelar
                </button>
              )}
              <button
                ref={confirmButtonRef}
                onClick={() => {
                  if (alertState.onConfirm) alertState.onConfirm();
                }}
                className={`px-6 py-2 rounded-lg text-white font-bold shadow-md transition transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${styles.btn}`}
              >
                {alertState.type === "confirm" ? "Sim, Confirmar" : "Entendido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};
