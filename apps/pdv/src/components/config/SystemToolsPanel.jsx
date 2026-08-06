import React, { useEffect, useState } from "react";
import { api } from "../../services/api";

const AccessLinkCard = () => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(null);

  const buildLink = (codigo) => `${window.location.origin}${window.location.pathname}?c=${codigo}`;

  const load = async () => {
    setLoading(true);
    try {
      setInvites(await api.invites.list());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const generate = async () => {
    setCreating(true);
    try {
      const res = await api.invites.create({});
      if (res.success) await load();
      else window.alert(res.error || "Falha ao gerar link.");
    } catch (error) {
      window.alert(error.message);
    } finally {
      setCreating(false);
    }
  };

  const copy = async (codigo) => {
    try {
      await navigator.clipboard.writeText(buildLink(codigo));
      setCopied(codigo);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("Copie o link:", buildLink(codigo));
    }
  };

  const revoke = async (id) => {
    if (!window.confirm("Revogar este link? Quem usar o link antigo não conseguirá mais entrar por ele.")) return;
    try {
      await api.invites.revoke(id);
      await load();
    } catch (error) {
      window.alert(error.message);
    }
  };

  return (
    <div className="bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200">
      <h2 className="text-sm font-black mb-4 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
        <i className="fas fa-link text-indigo-600"></i> Links de acesso da loja
      </h2>
      <p className="text-xs text-surface-500 mb-4 leading-relaxed">
        Gere um link que já embute esta loja. Quem abrir o link cai na tela de login com a loja
        preenchida — só digita usuário e senha (sem precisar do ID da loja).
      </p>

      <button
        onClick={generate}
        disabled={creating}
        className="w-full mb-4 bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <i className={`fas ${creating ? "fa-circle-notch fa-spin" : "fa-plus"}`}></i>
        {creating ? "Gerando..." : "Gerar novo link"}
      </button>

      <div className="space-y-2">
        {loading && <p className="text-xs text-surface-400">Carregando...</p>}
        {!loading && invites.length === 0 && (
          <p className="text-xs text-surface-400">Nenhum link ativo. Gere o primeiro acima.</p>
        )}
        {invites.map((inv) => (
          <div key={inv.id} className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-xl p-2 pl-3">
            <code className="text-xs font-black text-surface-700 flex-1 truncate">{inv.codigo}</code>
            <button
              onClick={() => copy(inv.codigo)}
              className="text-[10px] font-black uppercase tracking-widest bg-surface-200 text-surface-700 px-3 py-1.5 rounded-lg hover:bg-surface-300 transition"
            >
              <i className={`fas ${copied === inv.codigo ? "fa-check text-green-600" : "fa-copy"} mr-1`}></i>
              {copied === inv.codigo ? "Copiado" : "Copiar link"}
            </button>
            <button
              onClick={() => revoke(inv.id)}
              className="text-surface-400 hover:text-red-500 px-2"
              title="Revogar"
            >
              <i className="fas fa-trash"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const MigrateLocalCard = () => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    const confirmed = window.confirm(
      "Isto vai enviar TODOS os dados desta instalacao local (produtos, clientes, vendas, etc.) para a loja online em que voce esta logado.\n\nUse apenas em uma loja online recem-criada e vazia. Continuar?",
    );
    if (!confirmed) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await api.migrateLocalToOnline();
      if (res.success) {
        const total = Object.values(res.summary || {}).reduce((a, b) => a + Number(b || 0), 0);
        setResult({ ok: true, msg: `Migracao concluida: ${total} registros importados.` });
      } else {
        setResult({ ok: false, msg: res.error || "Falha na migracao." });
      }
    } catch (error) {
      setResult({ ok: false, msg: error.message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200">
      <h2 className="text-sm font-black mb-4 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
        <i className="fas fa-cloud-arrow-up text-blue-600"></i> Migrar dados locais para a nuvem
      </h2>
      <p className="text-xs text-surface-500 mb-4 leading-relaxed">
        Envia os dados desta instalacao local para a loja online atual. Recomendado apenas em uma loja
        online nova e vazia.
      </p>
      {result && (
        <div
          className={`text-xs font-bold mb-3 p-3 rounded-xl ${
            result.ok ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-700"
          }`}
        >
          {result.msg}
        </div>
      )}
      <button
        onClick={run}
        disabled={running}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i className={`fas ${running ? "fa-circle-notch fa-spin" : "fa-cloud-arrow-up"}`}></i>
        {running ? "Migrando..." : "Migrar para a loja online"}
      </button>
    </div>
  );
};

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

      {api.isRemote && !api.isElectron && <AccessLinkCard />}
      {api.isElectron && api.isRemote && <MigrateLocalCard />}
    </div>
  );
};

export default SystemToolsPanel;
