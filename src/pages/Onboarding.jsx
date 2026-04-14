import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertSystem";
import { useTenant } from "../context/TenantContext";
import FormField from "../components/ui/FormField";

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const { setOnboardingRequired, login } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const { tenant } = useTenant();
  const navigate = useNavigate();

  // Estados dos formulários (agora focado no setup local robusto)
  const [config, setConfig] = useState({
    // Passo 1: O setup físico (Idêntico ao do Recibo / Whitelabel)
    lojaNome: "",
    subtitulo: "",
    telefone: "",
    documento: "",
    endereco: "",
    cidade: "",
    lojaLogo: "",

    // Passo 2: Regras baseadas em lucros/repasse
    comissaoNovos: "30",
    comissaoUsados: "25",

    // Passo 3: Segurança central
    adminNome: "",
    adminUser: "",
    adminPass: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const prevStep = () => setStep((s) => s - 1);

  // Manipulador p/ avançar de passo com camada de inteligência e segurança (UX / Validação de Nuvem em rascunho)
  const nextStep = async () => {
    // Validação passo 1: Dados do Recibo
    if (step === 1) {
      const formVazio = !config.lojaNome.trim() || !config.endereco.trim() || !config.telefone.trim();
      
      if (formVazio) {
        const confirmar = await showConfirm(
          "Você não preencheu os campos cruciais da loja (Nome, Endereço, etc).\n\nSe prosseguir agora, os recibos de venda sairão EM BRANCO para o seu cliente.\n\nDeseja pular essa etapa mesmo assim?", 
          "Recibos Sairão em Branco",
        );
        if (!confirmar) return; // User resolveu ficar e preencher
      }
    }
    setStep((s) => s + 1);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validação básica do tamanho e tipo antes de subir base64 pro terminal local
      if (!file.type.startsWith("image/")) {
        return showAlert("Formato inválido. Use JPG/PNG.", "Erro", "error");
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig({ ...config, lojaLogo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinalize = async () => {
    if (!config.adminNome.trim() || !config.adminUser.trim() || !config.adminPass.trim()) {
      return showAlert("Preencha todos os dados exigidos do administrador.", "Segurança", "warning");
    }

    setIsLoading(true);
    try {
      // 1. Array de injeção massiva p/ persistência local e sync (se a cloud estiver ativa)
      const settingsToSave = [
        // Identidade fiscal / White Label
        { chave: "loja_nome", valor: config.lojaNome || "Minha Loja" },
        { chave: "subtitulo", valor: config.subtitulo || "Terminal de Vendas" },
        { chave: "telefone", valor: config.telefone },
        { chave: "documento", valor: config.documento },
        { chave: "endereco", valor: config.endereco },
        { chave: "cidade", valor: config.cidade },
        { chave: "loja_logo", valor: config.lojaLogo },
        
        // Taxas mercantis
        { chave: "comissao_padrao", valor: (parseFloat(config.comissaoNovos) / 100).toString() },
        { chave: "comissao_usados", valor: (parseFloat(config.comissaoUsados) / 100).toString() },
      ];

      for (const s of settingsToSave) {
        await window.api.saveConfig(null, s.chave, s.valor);
      }

      // 2. Registro do Super User Master
      const userRes = await window.api.registerUser({
        nome: config.adminNome,
        username: config.adminUser,
        password: config.adminPass,
        cargo: "admin"
      });

      if (userRes.success) {
        // 3. Login automático post-setup passando direto pro Dashboard/Vendas 
        const loginRes = await window.api.loginAttempt({
          username: config.adminUser,
          password: config.adminPass
        });
        
        if (loginRes.success) {
          login(loginRes.user);
          setOnboardingRequired(false);
          showAlert("Setup Enterprise finalizado! Bem-vindo ao Controle de Sistemas.", "Autorizado", "success");
          navigate("/");
        }
      } else {
        showAlert("Erro de integridade na criação do Master: " + userRes.error, "Falha", "error");
      }
    } catch (e) {
      console.error(e);
      showAlert("Ocorreu um erro no processamento do setup de infraestrutura.", "Tente Novamente", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const stepVariants = {
    enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
  };

  const bgStyle = tenant?.bgBase64
    ? {
        backgroundImage: `url(${tenant.bgBase64})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }
    : {};

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center p-4 overflow-hidden antialiased font-sans select-none ${
        !tenant?.bgBase64 ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950" : ""
      }`}
      style={bgStyle}
    >
      {/* Decoração de fundo quando não tem imagem customizada (padrão do Login) */}
      {!tenant?.bgBase64 && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-3xl" style={{ backgroundColor: tenant?.corPrimaria || '#3b82f6' }}></div>
          <div className="absolute bottom-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-10 blur-3xl" style={{ backgroundColor: tenant?.corSecundaria || '#6366f1' }}></div>
          <div className="absolute top-[40%] left-[50%] w-[200px] h-[200px] rounded-full opacity-5 blur-2xl" style={{ backgroundColor: tenant?.corPrimaria || '#3b82f6' }}></div>
        </>
      )}

      <div className="bg-surface-100 w-full max-w-2xl rounded-[2rem] shadow-2xl xl:shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden relative z-10 border border-surface-200/60 pb-4">
        {/* Header Progressional */}
        <div className="bg-surface-50 p-6 md:px-10 border-b border-surface-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-surface-800 text-surface-100 flex items-center justify-center rounded-xl shadow-md">
                <i className="fas fa-layer-group"></i>
             </div>
             <div>
                <h1 className="text-lg font-black text-surface-800 tracking-tight leading-none">
                  SysControl Enterprise
                </h1>
                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-widest mt-1">Configuração de Terminal</p>
             </div>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-2">
              Passo {step} de 3
            </span>
            <div className="w-24 h-1.5 bg-surface-200 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary-600"
                initial={{ width: "33%" }}
                animate={{ width: `${(step / 3) * 100}%` }}
                transition={{ duration: 0.6, ease: "circOut" }}
              />
            </div>
          </div>
        </div>

        {/* Viewport dos Forms */}
        <div className="p-6 md:p-10 min-h-[460px] flex flex-col pt-8 bg-surface-50 relative">
          <AnimatePresence mode="wait" custom={step}>
            <motion.div
              key={step}
              custom={step}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="flex-1 flex flex-col h-full"
            >
              {/* === PASSO 1: IDENTIDADE E RECIBO === */}
              {step === 1 && (
                <div className="flex flex-col h-full">
                  <div className="mb-6 flex gap-4">
                    <div className="w-12 h-12 bg-surface-200 border border-surface-300 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                      <i className="fas fa-store text-xl text-surface-800"></i>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-surface-800 tracking-tight">Identidade da Franquia</h2>
                      <p className="text-sm text-surface-500 mt-1 leading-relaxed">
                        Configure os espelhos de notas e visuais. <span className="font-bold text-surface-700">Estes dados sairão impressos no recibo dos clientes.</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <FormField 
                      label="Nome da Loja *" 
                      placeholder="Ex: Barba Stores"
                      value={config.lojaNome}
                      onChange={(v) => setConfig({...config, lojaNome: v})}
                      icon="fa-tag"
                    />
                    <FormField 
                      label="Subtítulo / Slogan" 
                      placeholder="Terminal Rápido"
                      value={config.subtitulo}
                      onChange={(v) => setConfig({...config, subtitulo: v})}
                      icon="fa-quote-right"
                    />
                    <FormField 
                      label="Telefone Comercial *" 
                      placeholder="(00) 00000-0000"
                      value={config.telefone}
                      onChange={(v) => setConfig({...config, telefone: v})}
                      icon="fa-phone"
                    />
                    <FormField 
                      label="CNPJ / Documento *" 
                      placeholder="00.000.000/0001-00"
                      value={config.documento}
                      onChange={(v) => setConfig({...config, documento: v})}
                      icon="fa-id-card"
                    />
                    <div className="md:col-span-2 grid grid-cols-[2fr_1fr] gap-4">
                      <FormField 
                        label="Logradouro / Endereço *" 
                        placeholder="Av Principal, N° 100"
                        value={config.endereco}
                        onChange={(v) => setConfig({...config, endereco: v})}
                        icon="fa-map-marker-alt"
                      />
                      <FormField 
                        label="Cidade / UF" 
                        placeholder="São Paulo - SP"
                        value={config.cidade}
                        onChange={(v) => setConfig({...config, cidade: v})}
                        icon="fa-map"
                      />
                    </div>
                  </div>

                  {/* Logo Upload area */}
                  <div className="mt-4 flex items-center gap-4 p-4 border border-surface-200 bg-surface-100 rounded-2xl">
                    <div className="w-16 h-16 bg-surface-50 shadow-sm border border-surface-300 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                      {config.lojaLogo ? (
                        <img src={config.lojaLogo} className="w-full h-full object-contain p-1 rounded-xl" alt="Preview" />
                      ) : (
                        <i className="fas fa-image text-surface-400 text-2xl"></i>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-surface-600 uppercase tracking-widest mb-1.5">Logo do Recibo (Térmica)</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="w-full text-xs text-surface-500 file:cursor-pointer file:flex file:items-center file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-surface-300 file:text-[10px] file:font-black file:uppercase file:bg-surface-200 file:text-surface-800 hover:file:bg-surface-300 file:transition cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* === PASSO 2: COMISSÕES E CORTE LÍQUIDO === */}
              {step === 2 && (
                <div className="flex flex-col h-full justify-center">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-surface-200 border border-surface-300 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm transform -rotate-3">
                      <i className="fas fa-percentage text-2xl text-surface-800"></i>
                    </div>
                    <h2 className="text-2xl font-black text-surface-800 tracking-tight">Cálculo de Liquidez</h2>
                    <p className="text-sm text-surface-500 mt-2 max-w-sm mx-auto">
                      Padronize o repasse estatístico da sua corporação.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto w-full">
                    <div className="p-6 bg-surface-100 rounded-3xl border border-surface-300 shadow-sm relative group hover:border-surface-400 transition cursor-default">
                      <div className="absolute top-4 right-4 text-surface-400 group-hover:text-surface-500 transition"><i className="fas fa-box-open"></i></div>
                      <label className="block text-[10px] font-black text-surface-600 uppercase mb-4 tracking-widest">Produto Novo</label>
                      <div className="flex items-end gap-1">
                         <input 
                          type="number"
                          className="w-full bg-transparent text-4xl font-black text-surface-900 outline-none p-0 focus:ring-0 text-center"
                          value={config.comissaoNovos}
                          onChange={(e) => setConfig({...config, comissaoNovos: e.target.value})}
                         />
                         <span className="text-xl font-bold text-surface-400 mb-1">%</span>
                      </div>
                      <p className="text-[9px] text-center text-surface-500 font-bold uppercase mt-4">Faturamento Bruto</p>
                    </div>

                    <div className="p-6 bg-surface-100 rounded-3xl border border-surface-300 shadow-sm relative group hover:border-surface-400 transition cursor-default">
                      <div className="absolute top-4 right-4 text-surface-400 group-hover:text-surface-500 transition"><i className="fas fa-recycle"></i></div>
                      <label className="block text-[10px] font-black text-surface-600 uppercase mb-4 tracking-widest">Produto Usado</label>
                      <div className="flex items-end gap-1">
                         <input 
                          type="number"
                          className="w-full bg-transparent text-4xl font-black text-surface-900 outline-none p-0 focus:ring-0 text-center"
                          value={config.comissaoUsados}
                          onChange={(e) => setConfig({...config, comissaoUsados: e.target.value})}
                         />
                         <span className="text-xl font-bold text-surface-400 mb-1">%</span>
                      </div>
                      <p className="text-[9px] text-center text-surface-500 font-bold uppercase mt-4">Apuração do Lucro Líquido</p>
                    </div>
                  </div>
                </div>
              )}

              {/* === PASSO 3: GÊNESE ADMIN === */}
              {step === 3 && (
                <div className="flex flex-col h-full">
                  <div className="mb-8 flex gap-4 items-center">
                    <div className="w-14 h-14 bg-surface-200 border border-surface-300 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                      <i className="fas fa-user-shield text-2xl text-surface-800"></i>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-surface-800 tracking-tight">Root Administrator</h2>
                      <p className="text-sm text-surface-500 mt-1 leading-relaxed">
                        Chave mestra do sistema operacional da loja.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-surface-100 border border-surface-300/60 p-6 rounded-[1.5rem] space-y-5 flex-1 relative overflow-hidden">
                    {/* Security Watermark */}
                    <i className="fas fa-shield-alt absolute -right-6 -bottom-6 text-[10rem] text-surface-300/30 pointer-events-none"></i>
                    
                    <div className="relative">
                      <FormField 
                        label="Nome Formal" 
                        placeholder="Sr. / Sra."
                        value={config.adminNome}
                        onChange={(v) => setConfig({...config, adminNome: v})}
                        icon="fa-user-tie"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-5 relative">
                      <FormField 
                        label="Login Privado" 
                        placeholder="admin"
                        value={config.adminUser}
                        onChange={(v) => setConfig({...config, adminUser: v})}
                        icon="fa-terminal"
                      />
                      <FormField 
                        label="Senha Hash" 
                        type="password"
                        placeholder="••••••"
                        value={config.adminPass}
                        onChange={(v) => setConfig({...config, adminPass: v})}
                        icon="fa-key"
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* === AÇÕES & BARRA INFERIOR === */}
          <div className="mt-8 flex gap-4 shrink-0 py-2">
            {step > 1 && (
              <button 
                onClick={prevStep}
                disabled={isLoading}
                className="w-14 shrink-0 flex items-center justify-center bg-surface-100 border border-surface-300 text-surface-800 rounded-xl hover:bg-surface-200 transition active:scale-95"
                title="Voltar etapa"
              >
                <i className="fas fa-chevron-left text-sm"></i>
              </button>
            )}
            
            {step < 3 ? (
              <button 
                onClick={nextStep}
                className="flex-[2] py-4 bg-primary-600 text-surface-100 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 transition shadow-lg shadow-primary-600/20 active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer group"
              >
                Prosseguir
                <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
              </button>
            ) : (
              <button 
                onClick={handleFinalize}
                disabled={isLoading}
                className="flex-[2] py-4 bg-primary-600 text-surface-100 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 transition shadow-lg shadow-primary-600/20 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <><i className="fas fa-circle-notch fa-spin"></i> AUTENTICANDO FIRMWARE...</>
                ) : (
                  <><i className="fas fa-hdd"></i> IMPLANTAR SISTEMA</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

