import React, { useState, useEffect } from "react";
import { useAlert } from "../context/AlertSystem";
import bg1 from "../assets/bgs/bg1.png";
import bg2 from "../assets/bgs/bg2.png";
import bg3 from "../assets/bgs/bg3.png";
import bg4 from "../assets/bgs/bg4.png";
import bg5 from "../assets/bgs/bg5.png";
import bg6 from "../assets/bgs/bg6.png";
import bg7 from "../assets/bgs/bg7.png";
import bg8 from "../assets/bgs/bg8.png";
import bg9 from "../assets/bgs/bg9.png";
import bg10 from "../assets/bgs/bg10.png";

const Login = ({ onLoginSuccess }) => {
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useAlert();
  const [appVersion, setAppVersion] = useState("");
  const [background, setBackground] = useState("");

  // Login State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Setup State
  const [setupData, setSetupData] = useState({
    nome: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const BACKGROUNDS = [
    {
      src: bg1,
      position: "left top", // logo canto superior esquerdo
    },
    {
      src: bg2,
      position: "right top", // logo canto superior direito
    },
    {
      src: bg3,
      position: "left top", // sem logo ou central
    },
    {
      src: bg4,
      position: "left top", // logo meio esquerdo
    },
    {
      src: bg5,
      position: "left top", // logo meio direito
    },
    {
      src: bg6,
      position: "left top", // logo canto inferior esquerdo
    },
    {
      src: bg7,
      position: "right top", // logo canto inferior direito
    },
    {
      src: bg8,
      position: "right top", // logo central
    },
    {
      src: bg9,
      position: "left top", // logo meio esquerdo
    },
    {
      src: bg10,
      position: "right top", // logo meio direito
    },
  ];

  const [bgConfig, setBgConfig] = useState(null);

  useEffect(() => {
    const random = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    setBgConfig(random);
  }, []);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const ver = await window.api.getAppVersion();
        setAppVersion(ver);
      } catch (error) {
        console.error("Erro ao obter versão", error);
        setAppVersion("Dev");
      }
    };
    fetchVersion();
  }, []);

  const checkSystemStatus = async () => {
    try {
      // Tenta conectar ao backend
      const hasUsers = await window.api.checkUsersExist();
      setIsSetupMode(!hasUsers);
    } catch (error) {
      console.error("Erro de conexão:", error);
      showAlert("Erro ao conectar com o banco de dados. Reinicie o sistema.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return showAlert("Preencha todos os campos.");

    try {
      const result = await window.api.loginAttempt({ username, password });

      if (result.success) {
        onLoginSuccess(result.user);
      } else {
        showAlert(result.error || "Erro desconhecido no login.");
      }
    } catch (error) {
      console.error(error);
      showAlert(
        "Erro técnico ao tentar logar. Verifique se o Backend foi reiniciado.",
      );
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    if (setupData.password !== setupData.confirmPassword)
      return showAlert("As senhas não coincidem.");
    if (setupData.password.length < 4)
      return showAlert("A senha deve ter pelo menos 4 caracteres.");

    try {
      const result = await window.api.registerUser({
        nome: setupData.nome,
        username: setupData.username,
        password: setupData.password,
        cargo: "admin",
      });

      if (result.success) {
        showAlert("Administrador criado com sucesso! Faça login.");
        setIsSetupMode(false);
        setUsername(setupData.username);
        setPassword("");
      } else {
        showAlert("Erro: " + result.error);
      }
    } catch (error) {
      showAlert("Erro ao criar usuário. Tente novamente.");
    }
  };

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p>Carregando sistema...</p>
      </div>
    );

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${bgConfig?.src})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: bgConfig?.position || "center",
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-md flex flex-col">
        {/* Cabeçalho */}
        <div className="bg-blue-600 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-3 rounded-full text-blue-600">
              <i className="fas fa-cubes text-3xl"></i>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SysControl</h1>
          <p className="text-blue-100 opacity-80 font-medium">
            {isSetupMode ? "Configuração Inicial" : "Acesso Restrito"}
          </p>
        </div>

        {/* Formulário */}
        <div className="p-8">
          {isSetupMode ? (
            // --- FORMULÁRIO DE SETUP (PRIMEIRO ACESSO) ---
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded-r">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <i className="fas fa-exclamation-triangle text-yellow-400"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Bem-vindo! Crie a conta do <strong>Administrador</strong>{" "}
                      para começar.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome Completo
                </label>
                <input
                  className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={setupData.nome}
                  onChange={(e) =>
                    setSetupData({ ...setupData, nome: e.target.value })
                  }
                  required
                  placeholder="Ex: João Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Usuário (Login)
                </label>
                <input
                  className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={setupData.username}
                  onChange={(e) =>
                    setSetupData({ ...setupData, username: e.target.value })
                  }
                  required
                  placeholder="Ex: admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <input
                  type="password"
                  className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={setupData.password}
                  onChange={(e) =>
                    setSetupData({ ...setupData, password: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={setupData.confirmPassword}
                  onChange={(e) =>
                    setSetupData({
                      ...setupData,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition shadow-lg mt-2"
              >
                CRIAR ACESSO
              </button>
            </form>
          ) : (
            // --- FORMULÁRIO DE LOGIN PADRÃO ---
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
                  Usuário
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <i className="fas fa-user"></i>
                  </span>
                  <input
                    className="w-full border border-gray-300 pl-10 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder="Digite seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
                  Senha
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <i className="fas fa-lock"></i>
                  </span>
                  <input
                    type="password"
                    className="w-full border border-gray-300 pl-10 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg transform active:scale-95 flex justify-center items-center"
              >
                ENTRAR NO SISTEMA
              </button>
            </form>
          )}
        </div>
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t">
          SysControl v{appVersion} &copy; 2025 - Desenvolvido por{" "}
          <a
            href="https://www.instagram.com/eminobre/"
            className="text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            @eminobre
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
