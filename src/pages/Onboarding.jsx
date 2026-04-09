import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertSystem";
import FormField from "../components/ui/FormField";

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const { setOnboardingRequired, login } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();

  // Estados dos formulários
  const [config, setConfig] = useState({
    // Passo 1: Nuvem
    tursoUrl: "",
    tursoToken: "",
    // Passo 2: Loja
    lojaNome: "",
    lojaLogo: "",
    // Passo 3: Comissões
    comissaoNovos: "30",
    comissaoUsados: "25",
    // Passo 4: Admin
    adminNome: "",
    adminUser: "",
    adminPass: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isCloudTesting, setIsCloudTesting] = useState(false);

  // Manipuladores
  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleTestCloud = async () => {
    if (!config.tursoUrl || !config.tursoToken) {
      return showAlert("Preencha a URL e o Token para testar.", "Aviso", "warning");
    }
    setIsCloudTesting(true);
    try {
      const result = await window.api.saveCloudConfig({
        url: config.tursoUrl,
        authToken: config.tursoToken
      });
      if (result.success) {
        showAlert("Conexão com a nuvem estabelecida com sucesso!", "Sucesso", "success");
      } else {
        showAlert("Erro na conexão: " + result.error, "Falha", "error");
      }
    } catch (e) {
      showAlert("Erro ao testar nuvem.", "Erro", "error");
    } finally {
      setIsCloudTesting(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig({ ...config, lojaLogo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinalize = async () => {
    if (!config.adminNome || !config.adminUser || !config.adminPass) {
      return showAlert("Preencha todos os dados do administrador.", "Aviso", "warning");
    }

    setIsLoading(true);
    try {
      // 1. Salvar Configurações da Loja e Comissões
      const settings = [
        { chave: "loja_nome", valor: config.lojaNome || "Minha Loja" },
        { chave: "loja_logo", valor: config.lojaLogo },
        { chave: "comissao_padrao", valor: (parseFloat(config.comissaoNovos) / 100).toString() },
        { chave: "comissao_usados", valor: (parseFloat(config.comissaoUsados) / 100).toString() },
      ];

      for (const s of settings) {
        await window.api.saveConfig(null, s.chave, s.valor);
      }

      // 2. Criar Usuário Admin
      const userRes = await window.api.registerUser({
        nome: config.adminNome,
        username: config.adminUser,
        password: config.adminPass,
        cargo: "admin"
      });

      if (userRes.success) {
        // 3. Fazer Login automático
        const loginRes = await window.api.loginAttempt({
          username: config.adminUser,
          password: config.adminPass
        });
        
        if (loginRes.success) {
          login(loginRes.user);
          setOnboardingRequired(false);
          showAlert("Configuração concluída! Bem-vindo ao sistema.", "Sucesso", "success");
          navigate("/");
        }
      } else {
        showAlert("Erro ao criar administrador: " + userRes.error, "Erro", "error");
      }
    } catch (e) {
      console.error(e);
      showAlert("Erro ao finalizar configuração.", "Erro", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const stepVariants = {
    enter: (direction) => ({ x: direction > 0 ? 500 : -500, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction < 0 ? 500 : -500, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 bg-surface-950 flex items-center justify-center p-4 overflow-hidden">
      {/* Glow de fundo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/10 blur-[120px] rounded-full"></div>

      <div className="bg-surface-100 border border-surface-200 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden relative z-10">
        {/* Header de Progresso */}
        <div className="bg-surface-50 p-6 border-b border-surface-200">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-lg font-black text-surface-800 uppercase tracking-widest">
              Setup Inicial
            </h1>
            <span className="text-xs font-bold text-primary-600 bg-primary-600/10 px-3 py-1 rounded-full uppercase">
              Passo {step} de 4
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary-600"
              initial={{ width: "25%" }}
              animate={{ width: `${step * 25}%` }}
              transition={{ duration: 0.5 }}
            ></motion.div>
          </div>
        </div>

        {/* Conteúdo com Framer Motion */}
        <div className="p-8 min-h-[400px] flex flex-col">
          <AnimatePresence mode="wait" custom={step}>
            <motion.div
              key={step}
              custom={step}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-1 flex flex-col"
            >
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-cloud text-3xl text-blue-600"></i>
                    </div>
                    <h2 className="text-xl font-bold text-surface-800">Conectar Nuvem (Opcional)</h2>
                    <p className="text-sm text-surface-500 mt-2">
                      Sincronize seus dados em tempo real com o Turso Cloud. Se preferir usar apenas local, clique em pular.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <FormField 
                      label="URL da Nuvem" 
                      placeholder="libsql://...turso.io"
                      value={config.tursoUrl}
                      onChange={(v) => setConfig({...config, tursoUrl: v})}
                      icon="fa-globe"
                    />
                    <FormField 
                      label="Token de Autenticação" 
                      type="password"
                      placeholder="token aqui..."
                      value={config.tursoToken}
                      onChange={(v) => setConfig({...config, tursoToken: v})}
                      icon="fa-key"
                    />
                    <button 
                      onClick={handleTestCloud}
                      disabled={isCloudTesting}
                      className="w-full py-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:bg-blue-50 rounded-lg transition"
                    >
                      {isCloudTesting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-vial mr-2"></i>}
                      Testar Conexão
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-store text-3xl text-purple-600"></i>
                    </div>
                    <h2 className="text-xl font-bold text-surface-800">Identidade da Loja</h2>
                    <p className="text-sm text-surface-500 mt-2">
                      Personalize o sistema com o nome e logo da sua empresa.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <FormField 
                      label="Nome da Loja" 
                      placeholder="Ex: Minha Loja Store"
                      value={config.lojaNome}
                      onChange={(v) => setConfig({...config, lojaNome: v})}
                      icon="fa-building"
                    />
                    <div className="flex items-center gap-4 p-4 bg-surface-50 rounded-xl border border-dashed border-surface-300">
                      <div className="w-20 h-20 bg-white rounded-lg border flex items-center justify-center overflow-hidden">
                        {config.lojaLogo ? (
                          <img src={config.lojaLogo} className="w-full h-full object-contain" alt="Logo preview" />
                        ) : (
                          <i className="fas fa-image text-surface-300 text-2xl"></i>
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-surface-600 uppercase mb-2">Logo (Opcional)</label>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="text-[10px] text-surface-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-hand-holding-usd text-3xl text-green-600"></i>
                    </div>
                    <h2 className="text-xl font-bold text-surface-800">Regras de Comissão</h2>
                    <p className="text-sm text-surface-500 mt-2">
                      Defina as porcentagens padrão que seus vendedores receberão.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <label className="block text-[10px] font-black text-blue-600 uppercase mb-3 tracking-widest">Itens Novos (%)</label>
                      <div className="flex items-center gap-2">
                         <input 
                          type="number"
                          className="w-full bg-transparent text-2xl font-black text-blue-700 outline-none"
                          value={config.comissaoNovos}
                          onChange={(e) => setConfig({...config, comissaoNovos: e.target.value})}
                         />
                         <span className="text-xl font-black text-blue-300">%</span>
                      </div>
                      <p className="text-[10px] text-blue-400 mt-2">Sobre o faturamento bruto</p>
                    </div>
                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                      <label className="block text-[10px] font-black text-emerald-600 uppercase mb-3 tracking-widest">Itens Usados (%)</label>
                      <div className="flex items-center gap-2">
                         <input 
                          type="number"
                          className="w-full bg-transparent text-2xl font-black text-emerald-700 outline-none"
                          value={config.comissaoUsados}
                          onChange={(e) => setConfig({...config, comissaoUsados: e.target.value})}
                         />
                         <span className="text-xl font-black text-emerald-300">%</span>
                      </div>
                      <p className="text-[10px] text-emerald-400 mt-2">Sobre o lucro líquido</p>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-user-shield text-3xl text-red-600"></i>
                    </div>
                    <h2 className="text-xl font-bold text-surface-800">Conta Administrador</h2>
                    <p className="text-sm text-surface-500 mt-2">
                      Crie o primeiro usuário para gerenciar todo o sistema.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <FormField 
                      label="Nome Completo" 
                      placeholder="Ex: Emerson Nobre"
                      value={config.adminNome}
                      onChange={(v) => setConfig({...config, adminNome: v})}
                      icon="fa-user"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField 
                        label="Usuário" 
                        placeholder="admin"
                        value={config.adminUser}
                        onChange={(v) => setConfig({...config, adminUser: v})}
                        icon="fa-at"
                      />
                      <FormField 
                        label="Senha Master" 
                        type="password"
                        placeholder="••••••"
                        value={config.adminPass}
                        onChange={(v) => setConfig({...config, adminPass: v})}
                        icon="fa-lock"
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Botões de Navegação */}
          <div className="mt-auto pt-8 flex gap-3">
            {step > 1 && (
              <button 
                onClick={prevStep}
                disabled={isLoading}
                className="flex-1 py-4 bg-surface-200 text-surface-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-300 transition"
              >
                Voltar
              </button>
            )}
            
            {step < 4 ? (
              <button 
                onClick={nextStep}
                className="flex-[2] py-4 bg-primary-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-700 transition shadow-lg shadow-primary-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                PRÓXIMO PASSO
                <i className="fas fa-arrow-right"></i>
              </button>
            ) : (
              <button 
                onClick={handleFinalize}
                disabled={isLoading}
                className="flex-[2] py-4 bg-surface-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-900 transition shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                {isLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check-double"></i>}
                FINALIZAR CONFIGURAÇÃO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
