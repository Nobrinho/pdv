import React, { useEffect, useState } from "react";
import { Icon } from "../ui/Icon";
import { api } from "../../services/api";
import Button from "../ui/Button";
import { Card } from "../ui/Card";
import ConfigCardHeader from "./ConfigCardHeader";

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
    <Card padding="lg">
      <ConfigCardHeader
        icon="link"
        title="Links de acesso"
        subtitle="Abre o login já com esta loja preenchida"
      />

      <Button variant="primary" fullWidth icon="fa-plus" loading={creating} onClick={generate} className="mb-4">
        {creating ? "Gerando..." : "Gerar novo link"}
      </Button>

      <div className="space-y-2">
        {loading && <p className="text-xs text-[var(--muted-foreground)]">Carregando...</p>}
        {!loading && invites.length === 0 && (
          <p className="text-xs text-[var(--muted-foreground)]">Nenhum link ativo. Gere o primeiro acima.</p>
        )}
        {invites.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center gap-2 bg-[var(--muted)] border border-[var(--border)] rounded-[var(--radius-md)] p-2 pl-3"
          >
            <code className="text-xs font-semibold text-[var(--foreground)] flex-1 truncate" style={{ fontFamily: "var(--font-mono)" }}>
              {inv.codigo}
            </code>
            <button
              onClick={() => copy(inv.codigo)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] px-3 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--hover-surface)] transition"
            >
              <Icon
                name={copied === inv.codigo ? "check" : "copy"}
                size={13}
                className={copied === inv.codigo ? "text-[var(--success)]" : ""}
              />
              {copied === inv.codigo ? "Copiado" : "Copiar"}
            </button>
            <button
              onClick={() => revoke(inv.id)}
              className="text-[var(--muted-foreground)] hover:text-[var(--danger)] px-2"
              title="Revogar"
            >
              <Icon name="trash-2" size={15} />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
};

const MigrateLocalCard = () => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null); // { jaMigrou, migradoEm, registros, temDados }
  const [forceText, setForceText] = useState("");

  const loadStatus = async () => {
    try {
      setStatus(await api.migrationStatus());
    } catch {
      setStatus(null);
    }
  };
  useEffect(() => {
    loadStatus();
  }, []);

  const blocked = !!status && (status.temDados || status.jaMigrou);
  const canForce = forceText.trim().toUpperCase() === "FORCAR";

  const doMigrate = async (force) => {
    const confirmed = window.confirm(
      force
        ? "FORÇAR SUBSTITUIÇÃO: isto vai APAGAR os dados da loja online atual e colocar os dados locais no lugar. Não pode ser desfeito. Continuar?"
        : "Isto vai enviar TODOS os dados desta instalação local (produtos, clientes, vendas, etc.) para a loja online logada.\n\nUse apenas em uma loja nova e vazia. Continuar?",
    );
    if (!confirmed) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await api.migrateLocalToOnline({ force });
      if (res.success) {
        const total = Object.values(res.summary || {}).reduce((a, b) => a + Number(b || 0), 0);
        setResult({ ok: true, msg: `Migração concluída: ${total} registros importados.` });
        setForceText("");
        loadStatus();
      } else {
        setResult({ ok: false, msg: res.error || "Falha na migração." });
      }
    } catch (error) {
      setResult({ ok: false, msg: error.message });
    } finally {
      setRunning(false);
    }
  };

  // Banner de estado da loja online.
  let stateBanner = null;
  if (status) {
    if (status.jaMigrou) {
      const quando = status.migradoEm ? new Date(status.migradoEm).toLocaleString("pt-BR") : "—";
      stateBanner = {
        cls: "bg-[var(--warning-soft)] text-[var(--warning-soft-foreground)]",
        icon: "history",
        msg: `Esta loja já recebeu uma migração em ${quando}${status.registros ? ` (${status.registros} registros)` : ""}.`,
      };
    } else if (status.temDados) {
      stateBanner = {
        cls: "bg-[var(--danger-soft)] text-[var(--danger-soft-foreground)]",
        icon: "alert-triangle",
        msg: "A loja online já possui produtos ou vendas.",
      };
    } else {
      stateBanner = {
        cls: "bg-[var(--success-soft)] text-[var(--success-soft-foreground)]",
        icon: "circle-check",
        msg: "Loja online vazia — pronta para migração.",
      };
    }
  }

  return (
    <Card padding="lg" className="border-[var(--danger-soft-border)]">
      <ConfigCardHeader
        icon="cloud-upload"
        title="Migrar dados locais para a nuvem"
        subtitle="Ação destrutiva — não pode ser desfeita"
      />
      <p className="text-xs text-[var(--muted-foreground)] mb-4 leading-relaxed">
        Envia os dados desta instalação local para a loja online atual. Recomendado apenas em uma loja
        online nova e vazia.
      </p>

      {stateBanner && (
        <div className={`text-xs font-semibold mb-3 p-3 rounded-[var(--radius-md)] flex items-center gap-2 ${stateBanner.cls}`}>
          <Icon name={stateBanner.icon} size={15} className="shrink-0" />
          <span>{stateBanner.msg}</span>
        </div>
      )}

      {result && (
        <div
          className={`text-xs font-semibold mb-3 p-3 rounded-[var(--radius-md)] ${
            result.ok
              ? "bg-[var(--success-soft)] text-[var(--success-soft-foreground)]"
              : "bg-[var(--danger-soft)] text-[var(--danger-soft-foreground)]"
          }`}
        >
          {result.msg}
        </div>
      )}

      {blocked ? (
        // Fluxo de forçar (substituir): exige digitar FORCAR.
        <div className="rounded-[var(--radius-md)] border border-[var(--danger-soft-border)] bg-[var(--danger-soft)]/40 p-3">
          <p className="text-[11px] font-semibold text-[var(--danger)] mb-2 leading-relaxed">
            Para substituir, os dados atuais da loja online serão <strong>apagados</strong> e trocados
            pelos locais. Digite <strong>FORCAR</strong> para liberar.
          </p>
          <input
            className="w-full mb-2 rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--card)] text-[var(--foreground)] h-9 px-3 text-sm outline-none focus:border-[var(--ring)] focus:ring-4 focus:ring-[var(--ring)]/20"
            placeholder="Digite FORCAR"
            value={forceText}
            onChange={(e) => setForceText(e.target.value)}
          />
          <Button
            variant="outline"
            fullWidth
            icon="alert-triangle"
            loading={running}
            disabled={!canForce}
            onClick={() => doMigrate(true)}
            className="!text-[var(--danger)] !border-[var(--danger-soft-border)] disabled:opacity-40"
          >
            {running ? "Substituindo..." : "Substituir dados e migrar"}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          fullWidth
          icon="cloud-upload"
          loading={running}
          onClick={() => doMigrate(false)}
          className="!text-[var(--danger)] !border-[var(--danger-soft-border)]"
        >
          {running ? "Migrando..." : "Migrar para a loja online"}
        </Button>
      )}
    </Card>
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
      <Card padding="lg">
        <ConfigCardHeader icon="printer" title="Impressão" subtitle="Dispositivo padrão dos recibos" />
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)] mb-1.5 block ml-0.5">
              Dispositivo padrão
            </label>
            <select
              className="w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--card)] text-[var(--foreground)] h-9 px-3 text-sm font-medium outline-none transition focus:border-[var(--ring)] focus:ring-4 focus:ring-[var(--ring)]/20"
              value={selectedPrinter}
              onChange={(e) => onSelectedPrinterChange(e.target.value)}
            >
              <option value="">Configuração do Windows</option>
              {printers.map((printer) => (
                <option key={printer.name} value={printer.name}>
                  {printer.name}
                </option>
              ))}
            </select>
          </div>
          <Button variant="primary" loading={isSavingPrinter} onClick={onSavePrinter}>
            Salvar
          </Button>
        </div>
      </Card>

      <Card padding="lg">
        <ConfigCardHeader icon="database" title="Manutenção local" subtitle="Backup e restauração dos dados" />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="success" size="lg" icon="fa-download" loading={isBackupRunning} onClick={onBackup} fullWidth>
            {isBackupRunning ? "Executando" : "Backup"}
          </Button>
          <Button variant="outline" size="lg" icon="fa-upload" loading={isRestoreRunning} onClick={onRestore} fullWidth>
            {isRestoreRunning ? "Restaurando" : "Restaurar"}
          </Button>
        </div>
      </Card>

      {api.isRemote && !api.isElectron && <AccessLinkCard />}
      {api.isElectron && api.isRemote && <MigrateLocalCard />}
    </div>
  );
};

export default SystemToolsPanel;
