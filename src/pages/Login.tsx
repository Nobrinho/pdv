import React, { useState, useEffect } from "react";
import { useAlert } from "../context/AlertSystem";
import { User } from "../types";
import Logo from "../components/shared/Logo";

// Importações de background
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

interface BackgroundConfig {
  src: string;
  position: string;
}

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useAlert();
  const [appVersion, setAppVersion] = useState("");

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

  const BACKGROUNDS: BackgroundConfig[] = [
    { src: bg1, position: "left top" },
    { src: bg2, position: "right top" },
    { src: bg3, position: "left top" },
    { src: bg4, position: "left top" },
    { src: bg5, position: "left top" },
    { src: bg6, position: "left top" },
    { src: bg7, position: "right top" },
    { src: bg8, position: "right top" },
    { src: bg9, position: "left top" },
    { src: bg10, position: "right top" },
  ];

  const [bgConfig, setBgConfig] = useState<BackgroundConfig | null>(null);

  useEffect(() => {
    const loadBg = async () => {
      try {
        const savedBg = await window.api.getConfig("login_background");
        if (savedBg) {
          if (savedBg.startsWith("data:image")) {
            setBgConfig({ src: savedBg, position: "center" });
          } else {
            // Busca exata ou que contenha o nome do arquivo para maior robustez
            const bg = BACKGROUNDS.find(b => b.src.toLowerCase().includes(savedBg.toLowerCase())) || BACKGROUNDS[0];
            setBgConfig(bg);
          }
        } else {
          const random = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
          setBgConfig(random);
        }
      } catch (error) {
        const random = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
        setBgConfig(random);
      }
    };
    loadBg();
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
      const hasUsers = await window.api.checkUsersExist();
      setIsSetupMode(!hasUsers);
    } catch (error) {
      console.error("Erro de conexão:", error);
      showAlert("Erro ao conectar com o banco de dados. Reinicie o sistema.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
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

  const handleSetup = async (e: React.FormEvent) => {
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
        <p className="font-medium tracking-wide">Iniciando SysControl...</p>
      </div>
    );

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden font-sans">
      {/* Coluna de Branding (Esquerda - 40%) */}
      <div className="lg:w-[40%] bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 flex flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Elementos Decorativos de Fundo */}
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-sm w-full relative z-10">
          <Logo size="xl" variant="glass" showText={true} className="mb-10" />
          
          <div className="space-y-6">
            <p className="text-xl text-blue-100/90 font-medium leading-relaxed">
              {isSetupMode 
                ? "Prepare seu negócio para o próximo nível. Comece configurando o acesso mestre." 
                : "A plataforma inteligente para gestão de estoque, vendas e controle financeiro."}
            </p>
            
            <div className="flex flex-col gap-4 pt-4">
              <div className="flex items-center gap-4 text-blue-100/60 transition-colors hover:text-white">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <i className="fas fa-check text-sm"></i>
                </div>
                <span className="font-semibold tracking-wide">Interface Intuitiva</span>
              </div>
              <div className="flex items-center gap-4 text-blue-100/60 transition-colors hover:text-white">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <i className="fas fa-shield-alt text-sm"></i>
                </div>
                <span className="font-semibold tracking-wide">Dados Protegidos</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-12 flex flex-col gap-1">
          <p className="text-blue-200/40 text-sm font-bold tracking-widest uppercase">
            Sistema de Gestão v{appVersion}
          </p>
          <p className="text-blue-200/20 text-xs">
            &copy; 2025 SysControl. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Coluna de Login (Direita - 60%) */}
      <div 
        className="flex-1 relative flex items-center justify-center p-6 lg:p-12"
        style={{
          backgroundImage: bgConfig ? `url(${bgConfig.src})` : "none",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: bgConfig?.position || "center",
        }}
      >
        {/* Overlay suave para legibilidade */}
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"></div>

        <div className="w-full max-w-md relative z-10 transform transition-all duration-700">
          <div className="bg-white/85 backdrop-blur-2xl p-10 lg:p-12 rounded-[3.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] border border-white/40 ring-1 ring-black/5">
            
            <div className="mb-10">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
                {isSetupMode ? "Configurar" : "Entrar"}
              </h2>
              <div className="h-1.5 w-16 bg-blue-600 rounded-full mb-4"></div>
              <p className="text-slate-600 font-medium">
                {isSetupMode ? "Crie sua conta de administrador" : "Por favor, identifique-se para continuar"}
              </p>
            </div>

            {isSetupMode ? (
              // --- FORMULÁRIO DE SETUP ---
              <form onSubmit={handleSetup} className="space-y-5">
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-xl flex gap-3">
                  <i className="fas fa-info-circle text-amber-500 mt-0.5"></i>
                  <p className="text-sm text-amber-800 font-medium leading-tight">
                    Primeiro acesso detectado. Crie o perfil do <strong>Administrador Principal</strong>.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="group">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600">
                      Nome Completo
                    </label>
                    <input
                      className="w-full bg-slate-100/50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl outline-none transition-all duration-300 font-medium text-slate-800 placeholder:text-slate-400"
                      value={setupData.nome}
                      onChange={(e) => setSetupData({ ...setupData, nome: e.target.value })}
                      required
                      placeholder="Ex: João da Silva"
                    />
                  </div>
                  <div className="group">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600">
                      Usuário de Acesso
                    </label>
                    <input
                      className="w-full bg-slate-100/50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl outline-none transition-all duration-300 font-medium text-slate-800 placeholder:text-slate-400"
                      value={setupData.username}
                      onChange={(e) => setSetupData({ ...setupData, username: e.target.value })}
                      required
                      placeholder="admin"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="group">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600">
                        Senha
                      </label>
                      <input
                        type="password"
                        className="w-full bg-slate-100/50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl outline-none transition-all duration-300 font-medium text-slate-800"
                        value={setupData.password}
                        onChange={(e) => setSetupData({ ...setupData, password: e.target.value })}
                        required
                        placeholder="••••••"
                      />
                    </div>
                    <div className="group">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600">
                        Confirmar
                      </label>
                      <input
                        type="password"
                        className="w-full bg-slate-100/50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl outline-none transition-all duration-300 font-medium text-slate-800"
                        value={setupData.confirmPassword}
                        onChange={(e) => setSetupData({ ...setupData, confirmPassword: e.target.value })}
                        required
                        placeholder="••••••"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-5 rounded-[1.5rem] font-black text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-[0_15px_30px_-5px_rgba(16,185,129,0.4)] transform active:scale-95 mt-4 tracking-tight uppercase"
                >
                  Confirmar Configuração
                </button>
              </form>
            ) : (
              // --- FORMULÁRIO DE LOGIN ---
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-5">
                  <div className="group">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-blue-600">
                      Login do Usuário
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <i className="fas fa-user-circle text-xl"></i>
                      </span>
                      <input
                        className="w-full bg-slate-100/70 border-2 border-transparent focus:border-blue-500 focus:bg-white pl-14 p-5 rounded-[1.5rem] outline-none transition-all duration-300 font-bold text-slate-800 placeholder:text-slate-400"
                        placeholder="Digite seu usuário"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-blue-600">
                      Senha Secreta
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <i className="fas fa-lock text-xl"></i>
                      </span>
                      <input
                        type="password"
                        className="w-full bg-slate-100/70 border-2 border-transparent focus:border-blue-500 focus:bg-white pl-14 p-5 rounded-[1.5rem] outline-none transition-all duration-300 font-bold text-slate-800 placeholder:text-slate-400"
                        placeholder="Sua senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-bold text-slate-500 group-hover:text-slate-700 transition-colors">Lembrar-me</span>
                  </label>
                  <button type="button" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    Esqueceu a senha?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-5 rounded-[1.5rem] font-black text-lg hover:from-blue-700 hover:to-indigo-800 transition-all shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5)] transform active:scale-95 mt-4 tracking-tight uppercase"
                >
                  Entrar Agora
                </button>
              </form>
            )}
          </div>

          <div className="mt-8 text-center">
            <p className="text-white/60 font-medium text-sm">
              Desenvolvido com excelência por <a href="https://www.instagram.com/eminobre/" className="text-white font-black hover:underline underline-offset-4 decoration-2">@eminobre</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
