"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneCall, MessageCircle, Mail, Search, Filter, X, ChevronDown,
  Sparkles, AlertCircle, CheckCircle2, Clock, Heart, ShoppingBag,
  Stethoscope, Scissors, Tag, RefreshCw, Building2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "/misucursal-api";

// ============================================================================
// Types
// ============================================================================
type Outcome =
  | "compro_agendo" | "interesado" | "cambio_marca" | "pidio_llamar_luego"
  | "no_contesta"   | "numero_erroneo" | "no_interesa" | "deceso_mascota";

interface Cliente {
  id: number;
  sucursal_id: number;
  canonical_id?: string;
  dni?: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  cliente_email?: string;
  mascota?: string;
  especie?: string;
  tamano?: string;
  marca_habitual?: string;
  ultima_marca_alimento?: string;
  ultimo_producto?: string;
  ultima_compra?: string;
  dias_sin_comprar?: number;
  monto_ultima_compra?: string;
  motivo_contacto?: string;
  urgencia?: number;
  crm_segment_slugs: string[];
  expected_food_repurchase_date?: string;
  estado: string;
  tipo_servicio: string;
  fuente_lista?: string;
  intentos_contacto?: number;
  uses_food?: boolean;
  uses_accessory?: boolean;
  uses_vet?: boolean;
  uses_grooming?: boolean;
  service_count?: number;
  cantidad_contactos: number;
  ultimo_contacto_at?: string;
}

interface CommercialAction {
  id: number;
  slug: string;
  name: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  discount_pct?: number;
  free_gift?: string;
  whatsapp_template_slug?: string;
}

interface WhatsappTpl {
  slug: string;
  name: string;
  body: string;
  applies_to_motivos: string[];
}

interface Resumen {
  pendientes: number;
  contactados_total: number;
  contactados_hoy: number;
  contactados_semana: number;
  recuperados_total: number;
  recuperados_semana: number;
  decesos_mes: number;
  no_interesados_total: number;
}

// ============================================================================
// Utils
// ============================================================================
const SEGMENT_COLORS: Record<string, string> = {
  vip: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  at_risk: "bg-red-500/20 text-red-300 border-red-500/30",
  dormant: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  complete_client: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  three_of_four: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  food_only_strict: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  grooming_only: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  vet_only: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  retail_only: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  services_only: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  missing_food: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  missing_grooming: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  missing_vet: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  missing_accessory: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

function urgenciaDots(u: number | undefined) {
  const filled = u ?? 0;
  return Array.from({ length: 4 }, (_, i) => i < filled);
}

function fmtFecha(s?: string) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function getApiHeaders(): HeadersInit {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };
  const token = localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...getApiHeaders(), ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

// ============================================================================
// ServiceMixBadges — chips pequeños alimento/accesorios/vet/peluquería
// ============================================================================
function ServiceMixBadges({ c }: { c: Cliente }) {
  const items: { key: keyof Cliente; label: string; Icon: typeof ShoppingBag; color: string }[] = [
    { key: "uses_food",      label: "alimento",   Icon: ShoppingBag, color: "text-orange-300 bg-orange-500/15 border-orange-500/30" },
    { key: "uses_accessory", label: "accesorios", Icon: Tag,         color: "text-blue-300 bg-blue-500/15 border-blue-500/30" },
    { key: "uses_vet",       label: "vet",        Icon: Stethoscope, color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30" },
    { key: "uses_grooming",  label: "peluquería", Icon: Scissors,    color: "text-pink-300 bg-pink-500/15 border-pink-500/30" },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {items.map(({ key, label, Icon, color }) => {
        const active = c[key] === true;
        return (
          <span
            key={key}
            className={
              "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all " +
              (active
                ? color + " shadow-sm"
                : "border-white/5 bg-white/5 text-zinc-600 line-through decoration-1")
            }
            title={active ? `Cliente ${label}` : `Oportunidad cross-sell: NO compra ${label}`}
          >
            <Icon className="h-3 w-3" />
            <span>{label}</span>
          </span>
        );
      })}
    </div>
  );
}

// ============================================================================
// KPIBar
// ============================================================================
function KPIBar({ resumen }: { resumen?: Resumen }) {
  const items = [
    { label: "Pendientes",      value: resumen?.pendientes ?? 0,         hint: "para contactar hoy", color: "text-amber-300" },
    { label: "Contactados",     value: resumen?.contactados_hoy ?? 0,    hint: "hoy",                color: "text-blue-300" },
    { label: "Recuperados",     value: resumen?.recuperados_semana ?? 0, hint: "esta semana",        color: "text-emerald-300" },
    { label: "Decesos",         value: resumen?.decesos_mes ?? 0,        hint: "este mes",           color: "text-violet-300" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((k) => (
        <div key={k.label} className="rounded-2xl border border-white/5 bg-zinc-900/50 p-4 backdrop-blur-sm">
          <div className={"font-display text-3xl font-light tracking-tight " + k.color}>
            {k.value.toLocaleString("es-AR")}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-zinc-500">{k.label}</div>
          <div className="text-[10px] text-zinc-600">{k.hint}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// CommercialActionsBanner
// ============================================================================
function CommercialActionsBanner({ actions }: { actions: CommercialAction[] }) {
  if (!actions.length) return null;
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 to-zinc-900/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold tracking-wide text-amber-200">Acciones comerciales del mes</h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {actions.slice(0, 3).map((a) => (
          <div key={a.id} className="rounded-xl border border-amber-500/10 bg-zinc-900/60 p-3">
            <div className="text-sm font-semibold text-zinc-100">{a.name}</div>
            {a.description && <div className="mt-1 text-xs text-zinc-400 line-clamp-2">{a.description}</div>}
            <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
              {a.discount_pct && <span className="text-amber-300">{a.discount_pct}% off</span>}
              {a.free_gift && <span className="text-pink-300">+ {a.free_gift}</span>}
              <span className="ml-auto">vence {fmtFecha(a.ends_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ClientCard
// ============================================================================
function ClientCard({ c, onContact }: { c: Cliente; onContact: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const dots = urgenciaDots(c.urgencia);
  const principalSegment = c.crm_segment_slugs?.[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-sm transition-all hover:border-white/10 hover:bg-zinc-900/60"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="hidden flex-col items-center gap-1 pt-1 sm:flex">
          {dots.map((on, i) => (
            <div key={i} className={"h-1.5 w-1.5 rounded-full " + (on ? "bg-amber-400" : "bg-white/10")} />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-medium tracking-tight text-zinc-100">{c.cliente_nombre}</h3>
            {principalSegment && (
              <span className={"rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider " + (SEGMENT_COLORS[principalSegment] ?? "border-white/10 bg-white/5 text-zinc-400")}>
                {principalSegment.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400">
            {c.cliente_telefono && <span className="font-mono">{c.cliente_telefono}</span>}
            {c.mascota && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-pink-400" /> {c.mascota}
                {c.especie && <span className="text-zinc-600">· {c.especie}</span>}
              </span>
            )}
            {c.dias_sin_comprar !== undefined && c.dias_sin_comprar !== null && (
              <span className="text-zinc-500">{c.dias_sin_comprar}d sin comprar</span>
            )}
          </div>
          <div className="mt-3">
            <ServiceMixBadges c={c} />
          </div>
          {c.motivo_contacto && (
            <p className="mt-3 flex items-start gap-2 text-xs text-zinc-300">
              <span className="mt-[2px] inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>{c.motivo_contacto}</span>
            </p>
          )}
          {expanded && (
            <div className="mt-3 grid gap-2 rounded-xl bg-zinc-950/40 p-3 text-xs sm:grid-cols-2">
              <div><span className="text-zinc-500">Marca habitual</span><div className="text-zinc-200">{c.marca_habitual ?? c.ultima_marca_alimento ?? "—"}</div></div>
              <div><span className="text-zinc-500">Última compra</span><div className="text-zinc-200">{fmtFecha(c.ultima_compra)} {c.monto_ultima_compra && `· $${c.monto_ultima_compra}`}</div></div>
              <div><span className="text-zinc-500">Tamaño / especie</span><div className="text-zinc-200">{c.tamano ?? "—"} {c.especie && `· ${c.especie}`}</div></div>
              <div><span className="text-zinc-500">Email</span><div className="truncate text-zinc-200">{c.cliente_email ?? "—"}</div></div>
              <div className="sm:col-span-2"><span className="text-zinc-500">Segmentos</span><div className="mt-1 flex flex-wrap gap-1">
                {(c.crm_segment_slugs ?? []).map((s) => (
                  <span key={s} className={"rounded-md border px-1.5 py-0.5 text-[10px] " + (SEGMENT_COLORS[s] ?? "border-white/10 bg-white/5 text-zinc-400")}>
                    {s.replace(/_/g, " ")}
                  </span>
                ))}
                {!(c.crm_segment_slugs ?? []).length && <span className="text-zinc-600">sin segmentos asignados</span>}
              </div></div>
              {c.intentos_contacto !== undefined && c.intentos_contacto > 0 && (
                <div className="sm:col-span-2 text-zinc-500">{c.intentos_contacto} intento(s) previo(s)</div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-1.5">
          <button
            onClick={onContact}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/90 px-3 py-2 text-sm font-medium text-emerald-950 transition-colors hover:bg-emerald-400"
          >
            <PhoneCall className="h-4 w-4" /> Registrar contacto
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center gap-1 rounded-xl border border-white/10 px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-white/5"
          >
            <ChevronDown className={"h-3 w-3 transition-transform " + (expanded ? "rotate-180" : "")} />
            {expanded ? "Menos" : "Detalle"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// ContactModal
// ============================================================================
const OUTCOME_OPTIONS: { value: Outcome; label: string; emoji: string; color: string; descripcion?: string }[] = [
  { value: "compro_agendo",     label: "Compró / agendó",          emoji: "✅", color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" },
  { value: "interesado",        label: "Interesado",                emoji: "💬", color: "border-blue-500/30 bg-blue-500/10 text-blue-200" },
  { value: "cambio_marca",      label: "Cambió de marca",           emoji: "⚠️", color: "border-orange-500/30 bg-orange-500/10 text-orange-200", descripcion: "Indicar cuál" },
  { value: "pidio_llamar_luego", label: "Pidió que lo llamen luego",emoji: "⏰", color: "border-amber-500/30 bg-amber-500/10 text-amber-200", descripcion: "Programar recordatorio" },
  { value: "no_contesta",       label: "No contesta",               emoji: "📵", color: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300" },
  { value: "numero_erroneo",    label: "Número erróneo",            emoji: "❌", color: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300" },
  { value: "no_interesa",       label: "No le interesa",            emoji: "🚫", color: "border-red-500/30 bg-red-500/10 text-red-200", descripcion: "Indicar motivo" },
  { value: "deceso_mascota",    label: "Deceso de mascota",         emoji: "🕊", color: "border-violet-500/30 bg-violet-500/10 text-violet-200", descripcion: "Marca pet en Club" },
];

function ContactModal({
  cliente, onClose, onSaved,
}: { cliente: Cliente; onClose: () => void; onSaved: () => void }) {
  const [medio, setMedio] = useState<"telefono" | "whatsapp" | "email" | "presencial">("whatsapp");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notas, setNotas] = useState("");
  const [nuevaMarca, setNuevaMarca] = useState("");
  const [motivoNo, setMotivoNo] = useState("");
  const [recDias, setRecDias] = useState<number>(7);
  const [actionIds, setActionIds] = useState<number[]>([]);
  const [acciones, setAcciones] = useState<CommercialAction[]>([]);
  const [templates, setTemplates] = useState<WhatsappTpl[]>([]);
  const [tplSelected, setTplSelected] = useState<string>("");
  const [tplBody, setTplBody] = useState<string>("");
  const [tplLink, setTplLink] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    api<CommercialAction[]>(`/api/recontactos/v2/${cliente.id}/acciones-aplicables`)
      .then(setAcciones).catch(() => setAcciones([]));
    api<WhatsappTpl[]>(`/api/recontactos/v2/whatsapp-templates`)
      .then(setTemplates).catch(() => setTemplates([]));
  }, [cliente.id]);

  // Auto-elegir template basado en motivo
  useEffect(() => {
    if (!templates.length || tplSelected) return;
    const motivo = (cliente.motivo_contacto || "").toLowerCase();
    let match = templates.find((t) =>
      t.applies_to_motivos.some((m) => motivo.includes(m.replace(/_/g, " ")) || motivo.includes(m))
    );
    if (!match && motivo.includes("recompra")) match = templates.find((t) => t.slug === "recompra_alimento");
    if (!match && motivo.includes("at_risk")) match = templates.find((t) => t.slug === "at_risk_recovery");
    if (!match) match = templates[0];
    if (match) setTplSelected(match.slug);
  }, [templates, cliente.motivo_contacto, tplSelected]);

  // Render template cuando cambia
  useEffect(() => {
    if (!tplSelected) return;
    api<{ body: string; wa_link?: string }>(
      `/api/recontactos/v2/whatsapp-templates/${tplSelected}/render?cliente_id=${cliente.id}`,
      { method: "POST" }
    ).then((r) => { setTplBody(r.body); setTplLink(r.wa_link ?? ""); }).catch(() => {});
  }, [tplSelected, cliente.id]);

  function toggleAction(id: number) {
    setActionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSave() {
    if (!outcome) {
      setErrorMsg("Elegí un resultado");
      return;
    }
    if (outcome === "cambio_marca" && !nuevaMarca.trim()) {
      setErrorMsg("Indicá la nueva marca");
      return;
    }
    if (outcome === "no_interesa" && !motivoNo.trim()) {
      setErrorMsg("Indicá el motivo");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      await api(`/api/recontactos/v2/registrar-contacto`, {
        method: "POST",
        body: JSON.stringify({
          cliente_recontacto_id: cliente.id,
          medio,
          outcome,
          notas: notas || undefined,
          nueva_marca_alimento: outcome === "cambio_marca" ? nuevaMarca : undefined,
          motivo_no_interesado: outcome === "no_interesa" ? motivoNo : undefined,
          deceso_pet_id_club: outcome === "deceso_mascota" ? null : undefined,  // TODO: resolver
          whatsapp_template_used: medio === "whatsapp" ? tplSelected : undefined,
          actions_offered_ids: actionIds,
          recordatorio_dias: outcome === "pidio_llamar_luego" ? recDias : undefined,
        }),
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-zinc-950 p-5 sm:rounded-3xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-100">{cliente.cliente_nombre}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400">
              {cliente.cliente_telefono && <span className="font-mono">{cliente.cliente_telefono}</span>}
              {cliente.mascota && <span>· {cliente.mascota} {cliente.especie && `(${cliente.especie})`}</span>}
              {cliente.marca_habitual && <span>· {cliente.marca_habitual}</span>}
            </div>
            <div className="mt-2"><ServiceMixBadges c={cliente} /></div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Medio */}
        <section className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Medio</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: "whatsapp", Icon: MessageCircle, label: "WhatsApp" },
              { v: "telefono", Icon: PhoneCall, label: "Llamada" },
              { v: "email", Icon: Mail, label: "Email" },
              { v: "presencial", Icon: Building2, label: "Presencial" },
            ].map(({ v, Icon, label }) => (
              <button
                key={v}
                onClick={() => setMedio(v as any)}
                className={"flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-all " +
                  (medio === v
                    ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10")}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </section>

        {/* Template WhatsApp */}
        {medio === "whatsapp" && templates.length > 0 && (
          <section className="mb-4 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Mensaje sugerido</h3>
              <select
                value={tplSelected}
                onChange={(e) => setTplSelected(e.target.value)}
                className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:border-emerald-400 focus:outline-none"
              >
                {templates.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
              </select>
            </div>
            <textarea
              value={tplBody}
              onChange={(e) => { setTplBody(e.target.value); setTplLink(""); }}
              rows={3}
              className="w-full resize-none rounded-lg border border-white/5 bg-zinc-950 p-2 text-sm text-zinc-100 focus:border-emerald-400 focus:outline-none"
            />
            <div className="mt-2 flex justify-end">
              <a
                href={tplLink || (cliente.cliente_telefono ? `https://wa.me/${cliente.cliente_telefono.replace(/\D/g, "")}?text=${encodeURIComponent(tplBody)}` : "#")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-950 hover:bg-emerald-400"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Abrir WhatsApp
              </a>
            </div>
          </section>
        )}

        {/* Acciones del mes aplicables */}
        {acciones.length > 0 && (
          <section className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Acciones que podés ofrecer · marcá las que mencionaste
            </h3>
            <div className="space-y-1.5">
              {acciones.map((a) => (
                <button
                  key={a.id}
                  onClick={() => toggleAction(a.id)}
                  className={"flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all " +
                    (actionIds.includes(a.id)
                      ? "border-amber-400 bg-amber-500/15 text-amber-100"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10")}
                >
                  <div className={"mt-0.5 h-4 w-4 shrink-0 rounded-md border " + (actionIds.includes(a.id) ? "border-amber-400 bg-amber-400" : "border-white/20")}>
                    {actionIds.includes(a.id) && <CheckCircle2 className="h-4 w-4 text-amber-950" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium">{a.name}</div>
                    {a.description && <div className="mt-0.5 text-[11px] text-zinc-400">{a.description}</div>}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Outcome grid */}
        <section className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Resultado</h3>
          <div className="grid grid-cols-2 gap-2">
            {OUTCOME_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setOutcome(o.value)}
                className={"flex flex-col items-start rounded-xl border p-3 text-left text-sm transition-all " +
                  (outcome === o.value ? o.color + " ring-2 ring-offset-2 ring-offset-zinc-950 ring-current/50" : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10")}
              >
                <span className="text-lg">{o.emoji}</span>
                <span className="mt-1 font-medium">{o.label}</span>
                {o.descripcion && <span className="mt-0.5 text-[10px] text-zinc-500">{o.descripcion}</span>}
              </button>
            ))}
          </div>
        </section>

        {/* Conditional fields */}
        {outcome === "cambio_marca" && (
          <section className="mb-4">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-500">Nueva marca</label>
            <input
              value={nuevaMarca}
              onChange={(e) => setNuevaMarca(e.target.value)}
              placeholder="ej: Royal Canin Veterinary Diet"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-400 focus:outline-none"
            />
          </section>
        )}
        {outcome === "no_interesa" && (
          <section className="mb-4">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-500">Motivo</label>
            <select
              value={motivoNo}
              onChange={(e) => setMotivoNo(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-400 focus:outline-none"
            >
              <option value="">Elegir...</option>
              <option value="precio">Precio (compra en otro lado más barato)</option>
              <option value="se_mudo">Se mudó / cambió de zona</option>
              <option value="ya_compro">Ya compró en otro lado</option>
              <option value="cambio_responsable">Cambió responsable de la mascota</option>
              <option value="no_quiere">Simplemente no le interesa</option>
            </select>
          </section>
        )}
        {outcome === "pidio_llamar_luego" && (
          <section className="mb-4">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-500">Llamar en</label>
            <div className="flex gap-2">
              {[3, 7, 15, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setRecDias(d)}
                  className={"flex-1 rounded-xl border py-2 text-sm transition-all " +
                    (recDias === d
                      ? "border-amber-400 bg-amber-500/15 text-amber-200"
                      : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10")}
                >
                  {d}d
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Notas */}
        <section className="mb-4">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-500">Notas (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Detalles del contacto..."
            className="w-full resize-none rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-400 focus:outline-none"
          />
        </section>

        {errorMsg && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            <AlertCircle className="h-4 w-4" /> {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !outcome}
            className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar contacto"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Main page
// ============================================================================
export default function RecontactoClientesPage() {
  const [resumen, setResumen] = useState<Resumen>();
  const [acciones, setAcciones] = useState<CommercialAction[]>([]);
  const [strategy, setStrategy] = useState<"lista_dia" | "recompra_alimento" | "promo" | "cohort">("lista_dia");
  const [servicio, setServicio] = useState<string>("todos");
  const [marca, setMarca] = useState<string>("");
  const [segmento, setSegmento] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [estado, setEstado] = useState<string>("pendiente");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [marcas, setMarcas] = useState<{ marca: string; clientes: number }[]>([]);

  async function loadAll() {
    setLoading(true);
    try {
      const [r, a, ms] = await Promise.all([
        api<Resumen>(`/api/recontactos/v2/resumen`).catch(() => undefined),
        api<CommercialAction[]>(`/api/recontactos/v2/acciones-activas`).catch(() => []),
        api<{ marca: string; clientes: number }[]>(`/api/recontactos/v2/marcas?limit=30`).catch(() => []),
      ]);
      if (r) setResumen(r);
      setAcciones(a);
      setMarcas(ms);
    } finally {
      setLoading(false);
    }
  }

  async function loadList() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        strategy, estado, servicio, limit: "100",
      });
      if (marca) params.set("marca", marca);
      if (segmento) params.set("segmento", segmento);
      const list = await api<Cliente[]>(`/api/recontactos/v2/lista-del-dia?${params}`);
      setClientes(list);
    } catch (e) {
      setClientes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadList(); }, [strategy, servicio, marca, segmento, estado]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clientes;
    const q = search.toLowerCase();
    return clientes.filter((c) =>
      (c.cliente_nombre || "").toLowerCase().includes(q) ||
      (c.cliente_telefono || "").includes(search) ||
      (c.dni || "").includes(search) ||
      (c.mascota || "").toLowerCase().includes(q)
    );
  }, [clientes, search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 text-zinc-200">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <header>
          <h1 className="font-display text-3xl font-light tracking-tight text-zinc-100 sm:text-4xl">
            Recontacto
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Lista del día priorizada por CRM Cerebro · {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </header>

        <KPIBar resumen={resumen} />
        <CommercialActionsBanner actions={acciones} />

        {/* Strategy tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { v: "lista_dia",         label: "Lista del día" },
            { v: "recompra_alimento", label: "Recompra alimento" },
            { v: "promo",             label: "Promo activa" },
            { v: "cohort",            label: "Mi cohort" },
          ].map((s) => (
            <button
              key={s.v}
              onClick={() => setStrategy(s.v as any)}
              className={"rounded-full border px-4 py-1.5 text-sm font-medium transition-all " +
                (strategy === s.v
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10")}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/5 bg-zinc-900/40 p-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/5 bg-zinc-950/40 px-3 py-2">
            <Search className="h-4 w-4 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nombre, DNI, teléfono o mascota..."
              className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
            />
          </div>
          <select value={servicio} onChange={(e) => setServicio(e.target.value)} className="rounded-xl border border-white/5 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-400 focus:outline-none">
            <option value="todos">Servicio: todos</option>
            <option value="general">General (retail)</option>
            <option value="veterinaria">Veterinaria</option>
            <option value="peluqueria">Peluquería</option>
          </select>
          <select value={marca} onChange={(e) => setMarca(e.target.value)} className="rounded-xl border border-white/5 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-400 focus:outline-none">
            <option value="">Marca: todas</option>
            {marcas.map((m) => <option key={m.marca} value={m.marca}>{m.marca} ({m.clientes})</option>)}
          </select>
          <select value={segmento} onChange={(e) => setSegmento(e.target.value)} className="rounded-xl border border-white/5 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-400 focus:outline-none">
            <option value="">Segmento: todos</option>
            <option value="at_risk">En riesgo</option>
            <option value="dormant">Dormidos</option>
            <option value="missing_food">Sin alimento</option>
            <option value="missing_grooming">Sin peluquería</option>
            <option value="missing_vet">Sin veterinaria</option>
            <option value="missing_accessory">Sin accesorios</option>
            <option value="services_only">Solo servicios</option>
            <option value="grooming_only">Solo peluquería</option>
            <option value="retail_only">Solo retail</option>
            <option value="complete_client">Cliente 360°</option>
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-xl border border-white/5 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-400 focus:outline-none">
            <option value="pendiente">Pendientes</option>
            <option value="contactado">Contactados</option>
            <option value="recuperado">Recuperados</option>
            <option value="recordatorio">Recordatorios</option>
            <option value="no_interesado">No interesados</option>
          </select>
          <button onClick={loadList} className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10" disabled={loading}>
            <RefreshCw className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")} /> Actualizar
          </button>
        </div>

        {/* Lista */}
        <section>
          <h2 className="mb-3 flex items-baseline gap-2 font-display text-lg font-medium text-zinc-200">
            <span>Clientes</span>
            <span className="text-sm font-normal text-zinc-500">({filtered.length})</span>
          </h2>

          {loading && !clientes.length ? (
            <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-12 text-center text-sm text-zinc-500">
              <Clock className="mx-auto mb-2 h-6 w-6 animate-pulse" />
              Cargando lista del día...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/20 p-12 text-center text-sm text-zinc-500">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
              No hay clientes en esta vista. La próxima lista llega el 1° del mes.
            </div>
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence>
                {filtered.map((c) => (
                  <ClientCard key={c.id} c={c} onContact={() => setSelected(c)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>

      {selected && (
        <ContactModal
          cliente={selected}
          onClose={() => setSelected(null)}
          onSaved={() => { loadAll(); loadList(); }}
        />
      )}
    </div>
  );
}
