import React, { useState, useEffect, useCallback } from "react";
import { useAlert } from "../context/AlertSystem";
import { api } from "../services/api";

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

const BACKGROUNDS = [
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

const Login = ({ onLoginSuccess }) => {
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useAlert();
  const [appVersion, setAppVersion] = useState("");
  const [bgConfig, setBgConfig] = useState(null);

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

  useEffect(() => {
    const random = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    setBgConfig(random);
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      setLoading(true);
      const [hasUsers, ver] = await Promise.all([
        api.auth.checkExist(),
        api.config.getVersion()
      ]);
      setIsSetupMode(!hasUsers);
      setAppVersion(ver || "1.0.0");
    } catch (error) {
      console.error("Erro ao iniciar login:", error);
      showAlert("Falha na conexão com o banco de dados. Verifique o servidor.", "Erro Crítico", "error");
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username || !password) return showAlert("Informe usuário e senha.", "Atenção", "warning");

    try {
      const result = await api.auth.login(username, password);
      if (result.success) {
        onLoginSuccess(result.user);
      } else {
        showAlert(result.error || "Credenciais inválidas.", "Acesso Negado", "error");
      }
    } catch (error) {
      console.error(error);
      showAlert("Falha técnica no processo de login.", "Erro", "error");
    }
  };

  const handleSetup = async (e) => {
    if (e) e.preventDefault();
    if (setupData.password !== setupData.confirmPassword)
      return showAlert("As senhas digitadas não coincidem.", "Divergência", "warning");
    if (setupData.password.length < 4)
      return showAlert("A senha deve possuir ao menos 4 dígitos.", "Senha Curta", "warning");

    try {
      const result = await api.auth.register({
        nome: setupData.nome,
        username: setupData.username,
        password: setupData.password,
        cargo: "admin",
      });

      if (result.success) {
        showAlert("Administrador criado com sucesso! Use suas credenciais para acessar.", "Bem-vindo", "success");
        setIsSetupMode(false);
        setUsername(setupData.username);
        setPassword("");
      } else {
        showAlert("Erro no cadastro: " + result.error, "Falha", "error");
      }
    } catch (error) {
      showAlert("Erro ao realizar configuração inicial.", "Erro", "error");
    }
  };

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <i className="fas fa-cubes text-blue-500 text-xl"></i>
          </div>
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-widest text-gray-500 animate-pulse">Iniciando Terminal...</p>
      </div>
    );

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans select-none"
      style={{
        backgroundImage: `url(${bgConfig?.src})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: bgConfig?.position || "center",
      }}
    >
      {/* Overlay de Vidro (Glassmorphism) para o Card */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden w-full max-w-[420px] flex flex-col border border-white/40">
        
        {/* Banner de Topo com Glass Effect */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 py-10 px-8 text-center relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl mb-4 shadow-xl border border-white/30 transform rotate-12">
               <i className="fas fa-cubes text-white text-4xl -rotate-12"></i>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-1">SysControl</h1>
            <div className="flex items-center justify-center gap-2">
               <div className="h-px bg-white/30 w-8"></div>
               <p className="text-[10px] font-black uppercase tracking-widest text-blue-100/70">
                 {isSetupMode ? "Setup Inicial" : "Terminal de Vendas"}
               </p>
               <div className="h-px bg-white/30 w-8"></div>
            </div>
          </div>
        </div>

        <div className="p-10">
          {isSetupMode ? (
            <form onSubmit={handleSetup} className="space-y-5 animate-slide-up">
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-6 flex gap-4">
                 <i className="fas fa-magic text-blue-600 mt-1"></i>
                 <p className="text-[11px] leading-relaxed text-blue-700 font-bold">
                   Este é o primeiro acesso. Defina as credenciais do <strong>Administrador Geral</strong> para desbloquear o sistema.
                 </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input
                  className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition"
                  value={setupData.nome}
                  onChange={(e) => setSetupData({ ...setupData, nome: e.target.value })}
                  required
                  placeholder="Seu nome"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Usuário / Login</label>
                <input
                  className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition"
                  value={setupData.username}
                  onChange={(e) => setSetupData({ ...setupData, username: e.target.value })}
                  required
                  placeholder="Ex: admin"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha</label>
                  <input
                    type="password"
                    className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition"
                    value={setupData.password}
                    onChange={(e) => setSetupData({ ...setupData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmação</label>
                  <input
                    type="password"
                    className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition"
                    value={setupData.confirmPassword}
                    onChange={(e) => setSetupData({ ...setupData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition shadow-xl shadow-gray-200 mt-4 active:scale-95"
              >
                Ativar Sistema
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
              <div className="space-y-1 group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition">Usuário</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-blue-500 transition">
                    <i className="fas fa-user-circle text-lg"></i>
                  </div>
                  <input
                    className="w-full bg-gray-50 border border-gray-100 pl-12 p-4 rounded-2xl text-sm font-black focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition"
                    placeholder="ID do usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1 group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition">Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-blue-500 transition">
                    <i className="fas fa-shield-alt text-lg"></i>
                  </div>
                  <input
                    type="password"
                    className="w-full bg-gray-50 border border-gray-100 pl-12 p-4 rounded-2xl text-sm font-black focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-4.5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition shadow-2xl shadow-blue-500/30 transform active:scale-[0.98] flex justify-center items-center gap-3"
              >
                ENTRAR <i className="fas fa-arrow-right text-[10px]"></i>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100/50 p-6 text-center border-t border-gray-100">
           <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">
             v{appVersion} • build production
           </div>
           <div className="text-[10px] text-gray-500 font-bold">
             &copy; 2025 SysControl. <a href="https://www.instagram.com/eminobre/" className="text-blue-500 hover:text-blue-700" target="_blank" rel="noopener noreferrer">@eminobre</a>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
