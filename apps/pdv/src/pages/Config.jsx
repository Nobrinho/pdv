import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAlert } from "../context/AlertSystem";
import { useTenant } from "../context/TenantContext";
import { processLogoForWeb } from "../context/TenantContext";
import { api } from "../services/api";
import CommissionSettings from "../components/config/CommissionSettings";
import RoleManager from "../components/config/RoleManager";
import StoreIdentitySettings from "../components/config/StoreIdentitySettings";
import SystemToolsPanel from "../components/config/SystemToolsPanel";
import UserManager from "../components/config/UserManager";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

const INITIAL_USER_FORM = {
  nome: "",
  username: "",
  password: "",
  cargo: "vendedor",
};

// Marca fixa SysControl (sem white-label): a identidade guarda só os dados que
// saem impressos no recibo — nome, contato, documento e a logo. Cores/tema não
// são mais configuráveis por loja (ver docs/DESIGN_SYSTEM.md).
const INITIAL_IDENTITY = {
  nome: "",
  subtitulo: "",
  endereco: "",
  cidade: "",
  telefone: "",
  documento: "",
  devNome: "",
  devLink: "",
};

const Config = () => {
  const { showAlert, showConfirm } = useAlert();
  const { tenant, saveTenantBatch } = useTenant();

  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState("");
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");

  const [defaultCommission, setDefaultCommission] = useState("");
  const [usedCommission, setUsedCommission] = useState("");

  const [systemUsers, setSystemUsers] = useState([]);
  const [newUser, setNewUser] = useState(INITIAL_USER_FORM);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [dataLoadError, setDataLoadError] = useState("");
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState(null);
  const [isSavingPrinter, setIsSavingPrinter] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [isRestoreRunning, setIsRestoreRunning] = useState(false);

  // --- Identidade da loja (dados do recibo) ---
  const [identity, setIdentity] = useState(INITIAL_IDENTITY);
  const [logoPreview, setLogoPreview] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);
  const logoInputRef = useRef(null);

  // Sincronizar estado local com tenant carregado
  useEffect(() => {
    if (tenant) {
      setIdentity({
        ...INITIAL_IDENTITY,
        nome: tenant.nome || "",
        subtitulo: tenant.subtitulo || "",
        endereco: tenant.endereco || "",
        cidade: tenant.cidade || "",
        telefone: tenant.telefone || "",
        documento: tenant.documento || "",
        devNome: tenant.devNome || "",
        devLink: tenant.devLink || "",
      });
      setLogoPreview(tenant.logoBase64 || "");
    }
  }, [tenant]);

  const updateIdentityField = useCallback((field, value) => {
    setIdentity((currentIdentity) => ({
      ...currentIdentity,
      [field]: value,
    }));
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      setDataLoadError("");
      const [
        rolesData,
        configData,
        configUsados,
        printerConfig,
        printersData,
        usersData,
      ] = await Promise.all([
        api.auth.getRoles(),
        api.config.get("comissao_padrao"),
        api.config.get("comissao_usados"),
        api.config.get("impressora_padrao"),
        api.print.printers(),
        api.auth.listUsers(),
      ]);

      setRoles(rolesData);
      setPrinters(printersData);
      setSystemUsers(usersData);

      if (configData) setDefaultCommission((parseFloat(configData) * 100).toString());
      if (configUsados) setUsedCommission((parseFloat(configUsados) * 100).toString());
      else setUsedCommission("25");

      if (printerConfig) setSelectedPrinter(printerConfig);
    } catch (error) {
      console.error(error);
      setDataLoadError("Nao foi possivel carregar todas as configuracoes do painel.");
      showAlert("Erro ao carregar configurações.", "Erro", "error");
    } finally {
      setLoadingData(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveCommission = async () => {
    setIsLoading(true);
    try {
      const valueToSave = parseFloat(defaultCommission) / 100;
      const valueUsadosToSave = parseFloat(usedCommission) / 100;

      await Promise.all([
        api.config.save("comissao_padrao", valueToSave),
        api.config.save("comissao_usados", valueUsadosToSave),
      ]);

      showAlert("Taxas de comissão atualizadas com sucesso!", "Sucesso", "success");
    } catch (error) {
      showAlert("Erro ao salvar taxas.", "Erro", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRole = async (e) => {
    if (e) e.preventDefault();
    if (isAddingRole) return;
    if (!newRole.trim()) return;

    try {
      setIsAddingRole(true);
      const result = await api.auth.saveRole(newRole.trim());
      if (result.success) {
        setNewRole("");
        loadData();
        showAlert("Cargo adicionado!", "Sucesso", "success");
      } else {
        showAlert("Erro ao criar cargo: " + result.error, "Erro", "error");
      }
    } finally {
      setIsAddingRole(false);
    }
  };

  const handleDeleteRole = async (id) => {
    const confirmed = await showConfirm("Tem a certeza que deseja excluir este cargo?");
    if (confirmed) {
      try {
        setDeletingRoleId(id);
        const result = await api.auth.deleteRole(id);
        if (result.success) {
          loadData();
          showAlert("Cargo excluido.", "Sucesso", "success");
        } else {
          showAlert("Erro: " + result.error, "Erro", "error");
        }
      } finally {
        setDeletingRoleId(null);
      }
    }
  };

  const handleBackup = async () => {
    if (isBackupRunning) return;
    try {
      setIsBackupRunning(true);
      const result = await api.config.backup();
      if (result.success) {
        showAlert("Backup realizado com sucesso!", "Dados Seguros", "success");
      } else if (result.message && result.message !== "Backup cancelado.") {
        showAlert("Erro: " + result.error, "Falha no Backup", "error");
      }
    } catch (error) {
      showAlert("Erro ao tentar realizar backup.", "Erro", "error");
    } finally {
      setIsBackupRunning(false);
    }
  };

  const handleRestore = async () => {
    if (isRestoreRunning) return;
    try {
      setIsRestoreRunning(true);
      const result = await api.config.restore();
      if (result?.success) {
        showAlert("Backup restaurado com sucesso!", "Dados Restaurados", "success");
        await loadData();
      } else if (result?.error) {
        showAlert("Erro: " + result.error, "Falha na Restauracao", "error");
      }
    } catch (error) {
      showAlert("Erro ao tentar restaurar backup.", "Erro", "error");
    } finally {
      setIsRestoreRunning(false);
    }
  };

  const handleSavePrinter = async () => {
    if (isSavingPrinter) return;
    try {
      setIsSavingPrinter(true);
      const result = await api.config.save("impressora_padrao", selectedPrinter);
      if (result.success) {
        showAlert("Impressora padrao salva com sucesso!", "Configuracao", "success");
      } else {
        showAlert("Erro ao salvar impressora.", "Erro", "error");
      }
    } catch (error) {
      showAlert("Erro tecnico ao salvar impressora.", "Erro", "error");
    } finally {
      setIsSavingPrinter(false);
    }
  };

  const handleAddUser = async (e) => {
    if (e) e.preventDefault();
    if (isAddingUser) return;
    if (!newUser.nome || !newUser.username || !newUser.password) {
      return showAlert("Preencha todos os campos.", "Atencao", "warning");
    }
    if (newUser.password.length < 4) {
      return showAlert("A senha deve ter pelo menos 4 caracteres.", "Senha Fraca", "warning");
    }

    try {
      setIsAddingUser(true);
      const result = await api.auth.register(newUser);
      if (result.success) {
        showAlert("Usuario criado com sucesso!", "Sucesso", "success");
        setNewUser(INITIAL_USER_FORM);
        loadData();
      } else {
        showAlert("Erro ao criar usuario: " + result.error, "Erro", "error");
      }
    } catch (error) {
      showAlert("Erro tecnico ao registrar usuario.", "Erro", "error");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleDeleteUser = async (id) => {
    const confirmed = await showConfirm("Tem a certeza que deseja excluir este usuario?");
    if (confirmed) {
      try {
        setDeletingUserId(id);
        const result = await api.auth.deleteUser(id);
        if (result.success) {
          loadData();
          showAlert("Usuario removido.", "Sucesso", "success");
        } else {
          showAlert("Erro: " + result.error, "Erro", "error");
        }
      } catch (error) {
        showAlert("Erro ao tentar remover usuario.", "Erro", "error");
      } finally {
        setDeletingUserId(null);
      }
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return showAlert("Selecione um arquivo de imagem válido.", "Formato Inválido", "error");
    }

    if (file.size > 5 * 1024 * 1024) {
      return showAlert("A imagem deve ter no máximo 5MB.", "Arquivo Grande", "error");
    }

    try {
      const processed = await processLogoForWeb(file);
      setLogoPreview(processed);
      showAlert(
        "Logo enviada (colorida). Na impressão do recibo ela sai em P&B automaticamente.",
        "Pré-visualização",
        "success",
      );
    } catch (err) {
      showAlert("Erro ao processar logo: " + err.message, "Erro", "error");
    }
  };

  const handleSaveIdentity = async () => {
    if (!identity.nome.trim()) {
      return showAlert("O nome da loja é obrigatório.", "Atenção", "warning");
    }

    setSavingIdentity(true);
    try {
      await saveTenantBatch({
        ...identity,
        logoBase64: logoPreview,
      });
      showAlert(
        "Identidade da loja atualizada com sucesso! As mudanças já estão visíveis.",
        "Sucesso",
        "success",
      );
    } catch (error) {
      showAlert("Erro ao salvar identidade: " + error.message, "Erro", "error");
    } finally {
      setSavingIdentity(false);
    }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-y-auto bg-surface-50 custom-scrollbar">
      <div className="mb-6">
        <h1
          className="text-lg md:text-xl font-semibold text-[var(--foreground)] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Configurações
        </h1>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          Ajuste as taxas, gerencie a equipe e os dados que saem no recibo.
        </p>
      </div>

      {dataLoadError && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--danger-soft-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-soft-foreground)]">
          {dataLoadError}
        </div>
      )}

      <div className="flex flex-col gap-6">
        <StoreIdentitySettings
          identity={identity}
          onIdentityChange={updateIdentityField}
          logoPreview={logoPreview}
          logoInputRef={logoInputRef}
          onLogoUpload={handleLogoUpload}
          onClearLogo={() => setLogoPreview("")}
          onSave={handleSaveIdentity}
          isSaving={savingIdentity}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="flex flex-col gap-6">
            <CommissionSettings
              defaultCommission={defaultCommission}
              usedCommission={usedCommission}
              onDefaultCommissionChange={setDefaultCommission}
              onUsedCommissionChange={setUsedCommission}
              onSave={handleSaveCommission}
              isSaving={isLoading}
            />

            <RoleManager
              roles={roles}
              newRole={newRole}
              onNewRoleChange={setNewRole}
              onAddRole={handleAddRole}
              onDeleteRole={handleDeleteRole}
              deletingRoleId={deletingRoleId}
            />
          </div>

          <SystemToolsPanel
            printers={printers}
            selectedPrinter={selectedPrinter}
            onSelectedPrinterChange={setSelectedPrinter}
            onSavePrinter={handleSavePrinter}
            isSavingPrinter={isSavingPrinter}
            onBackup={handleBackup}
            onRestore={handleRestore}
            isBackupRunning={isBackupRunning}
            isRestoreRunning={isRestoreRunning}
          />
        </div>

        <UserManager
          users={systemUsers}
          loading={loadingData}
          newUser={newUser}
          onNewUserChange={setNewUser}
          onAddUser={handleAddUser}
          onDeleteUser={handleDeleteUser}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
          deletingUserId={deletingUserId}
        />
      </div>
    </div>
  );
};

export default Config;
