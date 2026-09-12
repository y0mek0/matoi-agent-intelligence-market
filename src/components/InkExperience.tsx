"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  DiscordLogo,
  EnvelopeSimple,
  HouseLine,
  XLogo,
} from "@phosphor-icons/react";
import { runDemoCycle } from "@/lib/cycle";

const glyphs = ["任", "信", "円", "証", "台", "評", "源", "買", "守", "知", "連", "監"];
const railWords = ["自律 AGENTS", "信号 SIGNALS", "円 ARC PAY", "証明 PROOF", "台帳 HEDERA", "知能 MARKET"];
const contactLinks = [
  { id: "x", label: "X", value: "https://x.com/NikiYomek", icon: XLogo },
  { id: "discord", label: "Discord", value: "yomek", icon: DiscordLogo },
  { id: "arc", label: "Arc House", value: "Niki Li ( yomek )", icon: HouseLine },
  { id: "email", label: "Email", value: "geraldwarren77@gmail.com", icon: EnvelopeSimple },
];

type TelegramSignal = {
  mode: "LIVE TELEGRAM" | "DEMO FIXTURE";
  confidence: number;
  sentiment: "bullish" | "bearish" | "neutral";
  intensity: number;
  sampleSize: number;
  summary: string;
  recent: Array<{ timestamp: string; sentiment: string; text: string; hash: string }>;
};

type AuditEvent = {
  id: string;
  type: string;
  providerId?: string;
  rail?: string;
  summary: string;
  hash: string;
  hcsStatus: string;
};

type CycleRunResult = {
  decision: string;
  signal: TelegramSignal;
  intelligence: SignalIntelligence;
  auditEvents: AuditEvent[];
};

type SignalIntelligence = {
  mode: "deterministic-fallback" | "openrouter";
  decisionBias: string;
  confidence: number;
  thesis: string;
  riskFlags: string[];
};

type NewsIntel = {
  source: "external" | "local-fallback" | "none";
  total: number;
  items: Array<{
    hash: string;
    score: number;
    importance: number;
    asset: string;
    impact: "bullish" | "bearish" | "neutral" | "mixed";
    timeHorizon: string;
    summary: string;
    actions: string[];
    analyzedAt: string | null;
  }>;
};

type MarketplaceStatus = {
  mission: { asset: string; budgetUsd: number; riskProfile: string; timeHorizon: string; objective: string };
  buyerAgent: { walletRole: string; spendPolicy: { maxPerSignalUsd: number; realTradesEnabled: false } };
  providerQuotes: Array<{ id: string; name: string; quotedUsd: number; fitScore: number; sells: string; tradeExecution: "disabled" }>;
  arcPlan: { allowed: boolean; actions: Array<{ kind: string; amountUsd: number; realTrade: false }> };
};

type SourceSnapshot = {
  mode: "live-snapshot" | "catalog-ready";
  agents: Array<{ id: string; name: string; sells: string; priceUsd: number }>;
  sellableCount: number;
};

type TradingDesk = {
  asset: string;
  agents: Array<{ id: string; name: string; intent: string; confidence: number; execution: "disabled" }>;
  consensus: { intent: string; execution: "disabled"; reason: string };
};

type MissionRun = {
  scenario: { id: string; title: string; objective: string; budgetUsd: number; preferredProviders: string[] };
  providerAnalyses: Array<{ providerId: string; localScore: number; gptScore: number; priceUsd: number; summary: string; impact: string }>;
  quotes: Array<{ providerId: string; tier: string; cappedUsd: number; rationale: string }>;
  inspector: { ok: boolean; contradictions: string[]; duplicates: string[]; overPricedFlag: boolean; note: string };
  liveCalls: Array<{ providerId: string; ok: boolean; usedFallback: boolean; durationMs: number }>;
  arc: { network: "ARC-TESTNET"; authorizedUsd: number; entries: Array<{ providerId: string; amountUsd: number; status: string }>; realUsdcTransfer: false };
  decision: { intent: string; execution: "disabled"; reason: string };
  summary: { thesis: string; confidence: number; selectedProviders: string[]; topRisks: string[] };
  a2aTranscript: Array<{ id: string; missionId: string; from: string; to: string; type: string; summary: string; rail?: string; providerId?: string; priceUsd?: number; status: string; whyThisMatters?: string; calls?: number; costPerCall?: number }>;
  auditEvents: AuditEvent[];
  nanopayments: { missionId: string; totalCalls: number; totalAccruedUsdc: number; meters: Array<{ providerId: string; calls: number; costPerCallUsdc: number; basePriceUsdc: number; accruedUsdc: number }> };
};

type ProviderReputation = {
  reputations: Array<{ providerId: string; score: number; ratingsCount: number; useful: number; wrong: number; duplicate: number; untrusted: number }>;
};

type X402HistoryEntry = { action: string; receiptId?: string; ok: boolean; note: string; at: string };

type X402State = {
  challenge: { nonce: string; priceUsd: number; rail: string; facilitatorUrl: string } | null;
  receipt: { receiptId: string; signature: string; paymentRef: string; priceUsd: number; facilitator: string; providerId: string } | null;
  history: X402HistoryEntry[];
};

type HcsProof = {
  ok: boolean;
  topicId?: string;
  transactionId?: string;
  status?: string;
  eventHash?: string;
  explorer?: string;
  error?: string;
};

type ArcStatus = {
  network: string | null;
  allReady: boolean;
  balanceMode: "not-queried";
  roles: Array<{ role: "Trader" | "ArcResearch" | "Risk"; ready: boolean; address: string | null }>;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function InkCursor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const cursor = cursorRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !cursor) return;

    let width = 0;
    let height = 0;
    let mx = -120;
    let my = -120;
    let cxp = -120;
    let cyp = -120;
    let frame = 0;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; r: number; a: number; life: number; glyph?: string }> = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (event: PointerEvent) => {
      mx = event.clientX;
      my = event.clientY;
      cursor.style.transform = `translate3d(${mx - 8}px, ${my - 8}px, 0)`;
      const target = event.target as HTMLElement | null;
      cursor.classList.toggle("is-hover", Boolean(target?.closest("a,button")));
      for (let i = 0; i < 2; i += 1) {
        particles.push({
          x: mx + (Math.random() - 0.5) * 12,
          y: my + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          r: 2 + Math.random() * 7,
          a: 0.45,
          life: 28 + Math.random() * 14,
          glyph: Math.random() < 0.1 ? glyphs[Math.floor(Math.random() * glyphs.length)] : undefined,
        });
      }
    };

    const onDown = (event: PointerEvent) => {
      for (let i = 0; i < 14; i += 1) {
        particles.push({
          x: event.clientX,
          y: event.clientY,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          r: 4 + Math.random() * 14,
          a: 0.7,
          life: 38,
          glyph: i % 5 === 0 ? glyphs[i % glyphs.length] : undefined,
        });
      }
    };

    const draw = () => {
      cxp += (mx - cxp) * 0.18;
      cyp += (my - cyp) * 0.18;
      ctx.clearRect(0, 0, width, height);
      if (mx > -50) {
        ctx.beginPath();
        ctx.arc(cxp, cyp, 15, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(176, 125, 255, .25)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      particles = particles.filter((p) => p.life-- > 0 && p.a > 0.01);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.025;
        p.a *= 0.955;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.4);
        g.addColorStop(0, `rgba(177, 133, 255, ${p.a})`);
        g.addColorStop(0.45, `rgba(107, 56, 255, ${p.a * 0.45})`);
        g.addColorStop(1, "rgba(107, 56, 255, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2);
        ctx.fill();
        if (p.glyph) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(((p.life % 20) - 10) * 0.02);
          ctx.font = `900 ${Math.max(14, p.r * 3)}px serif`;
          ctx.fillStyle = `rgba(245,240,255,${p.a * 0.75})`;
          ctx.fillText(p.glyph, 0, 0);
          ctx.restore();
        }
      }
      frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    frame = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="ink-trail" aria-hidden="true" />
      <div ref={cursorRef} className="ink-cursor" aria-hidden="true" />
    </>
  );
}

function KanjiRain({ density = 11 }: { density?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: density }, (_, index) => ({
        glyph: glyphs[index % glyphs.length],
        x: `${5 + ((index * 13) % 90)}%`,
        size: `${22 + ((index * 7) % 42)}px`,
        duration: `${16 + ((index * 3) % 12)}s`,
        delay: `${-1 * ((index * 1.7) % 18)}s`,
      })),
    [density],
  );

  return (
    <div className="kanji-rain" aria-hidden="true">
      {items.map((item, index) => (
        <span
          key={`${item.glyph}-${index}`}
          style={{ left: item.x, fontSize: item.size, animationDuration: item.duration, animationDelay: item.delay }}
        >
          {item.glyph}
        </span>
      ))}
    </div>
  );
}

function MagneticButton({ children, primary = false, onClick, disabled = false }: { children: React.ReactNode; primary?: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className={cx("ink-btn group", primary && "primary", disabled && "is-disabled")} onClick={onClick} disabled={disabled}>
      <span>{children}</span>
      {primary && (
        <span className="ink-btn-icon">
          <ArrowRight size={15} weight="bold" />
        </span>
      )}
    </button>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  const links = [
    ["Mission", "#mission"],
    ["Transcript", "#transcript"],
    ["Rails", "#rails"],
    ["Status", "#status"],
    ["Docs", "/docs"],
    ["Contacts", "/contacts"],
  ];

  return (
    <>
      <nav className="ink-nav">
        <Link href="#top" className="ink-brand" aria-label="Agent Intelligence Market home">
          <span className="ink-seal">証</span>
          <span>
            <strong>MATOI</strong>
            <small>AGENT MARKET</small>
          </span>
        </Link>
        <div className="ink-navlinks">
          {links.map(([label, href]) => (
            <Link key={label} href={href} className={label === "Mission" ? "is-active" : undefined}>
              {label}
            </Link>
          ))}
        </div>
        <button className={cx("menu-trigger", open && "open")} onClick={() => setOpen((value) => !value)} aria-label="Open menu" aria-expanded={open}>
          <span />
          <span />
        </button>
      </nav>

      <div className={cx("ink-menu", open && "open")} aria-hidden={!open}>
        <div className="ink-menu-inner">
          <p>自律 知能 市場</p>
          {links.map(([label, href], index) => (
            <Link key={label} href={href} style={{ transitionDelay: open ? `${120 + index * 70}ms` : "0ms" }} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

function StatusChip({ children, tone = "violet" }: { children: React.ReactNode; tone?: "violet" | "hot" | "paper" }) {
  return <span className={cx("status-chip", `tone-${tone}`)}>{children}</span>;
}

function ProofConsole({ missionRun }: { missionRun: MissionRun | null }) {
  const [open, setOpen] = useState(false);
  const lastAudit = missionRun?.auditEvents?.[missionRun.auditEvents.length - 1];
  const arcTx = missionRun?.arc?.network === "ARC-TESTNET" ? "ARC-TESTNET rail ok" : "ARC not engaged";
  return (
    <aside className={cx("proof-console", open && "is-open")} aria-label="proof console">
      <button type="button" className="proof-console-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="proof-console-glyph">証</span>
        <span>PROOF CONSOLE</span>
        <span className="proof-console-arrow">{open ? "▾" : "▴"}</span>
      </button>
      {open ? (
        <div className="proof-console-body">
          <div className="proof-console-line">
            <b>mission</b>
            <span>{missionRun ? `${missionRun.scenario?.id ?? "?"} · ${missionRun.decision?.intent?.replace("_SIMULATED", "") ?? "?"}` : "no run yet"}</span>
          </div>
          <div className="proof-console-line">
            <b>a2a transcript</b>
            <span>{missionRun?.a2aTranscript?.length ?? 0} messages</span>
          </div>
          <div className="proof-console-line">
            <b>arc spend</b>
            <span>{arcTx}{missionRun?.arc?.authorizedUsd ? ` · $${missionRun.arc.authorizedUsd.toFixed(2)} authorized` : ""}</span>
          </div>
          <div className="proof-console-line">
            <b>x402</b>
            <span>{missionRun?.auditEvents?.some((e) => e.type === "x402_settle_anchored") ? "settled + anchored" : "challenge/settle/verify available"}</span>
          </div>
          <div className="proof-console-line">
            <b>audit</b>
            <span>{missionRun?.auditEvents?.length ?? 0} events{lastAudit ? ` · last: ${lastAudit.type}` : ""}</span>
          </div>
          <div className="proof-console-links">
            <a href="/api/system/status" target="_blank" rel="noreferrer">/api/system/status</a>
            <a href="/api/arc/status" target="_blank" rel="noreferrer">/api/arc/status</a>
            <a href="/api/audit" target="_blank" rel="noreferrer">/api/audit</a>
            <a href="/api/submission/tracks" target="_blank" rel="noreferrer">/api/submission/tracks</a>
            <a href="/api/mission/run" target="_blank" rel="noreferrer">/api/mission/run</a>
            <a href="/api/x402/facilitator" target="_blank" rel="noreferrer">/api/x402/facilitator</a>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

export function InkExperience() {
  const cycle = runDemoCycle();
  const [activeStep, setActiveStep] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const [telegramSignal, setTelegramSignal] = useState<TelegramSignal | null>(null);
  const [, setSignalIntelligence] = useState<SignalIntelligence | null>(null);
  const [, setAuditEvents] = useState<AuditEvent[]>([]);
  const [, setNewsIntel] = useState<NewsIntel | null>(null);
  const [, setMarketplace] = useState<MarketplaceStatus | null>(null);
  const [sourceSnapshot, setSourceSnapshot] = useState<SourceSnapshot | null>(null);
  const [, setTradingDesk] = useState<TradingDesk | null>(null);
  const [missionRun, setMissionRun] = useState<MissionRun | null>(null);
  const [activeScenario, setActiveScenario] = useState("fast-eth-risk-check");
  const [isRunningMission, setIsRunningMission] = useState(false);
  const [, setReputations] = useState<ProviderReputation["reputations"]>([]);
  const [x402, setX402] = useState<X402State>({ challenge: null, receipt: null, history: [] });
  const [, setIsX402Busy] = useState(false);
  const [hcsProof, setHcsProof] = useState<HcsProof | null>(null);
  const [arcStatus, setArcStatus] = useState<ArcStatus | null>(null);
  const [, setIsPublishingHcs] = useState(false);
  const [footerCopied, setFooterCopied] = useState<string | null>(null);
  const [useBlocky402, setUseBlocky402] = useState(false);
  const [blocky402Status, setBlocky402Status] = useState<{ enabled: boolean; error?: string } | null>(null);
  const timersRef = useRef<number[]>([]);

  async function copyFooterContact(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setFooterCopied(label);
    window.setTimeout(() => setFooterCopied(null), 1200);
  }

  useEffect(() => {
    let alive = true;
    const loadReputations = async () => {
      try {
        const response = await fetch("/api/agents/reputation", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as ProviderReputation;
          if (alive) setReputations(data.reputations ?? []);
        }
      } catch {
        // ignore
      }
    };
    const loadSignal = async () => {
      try {
        const response = await fetch("/api/providers/telegram-pulse?proof=demo-paid:telegram-pulse", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as TelegramSignal;
        if (alive) setTelegramSignal(data);
        const auditResponse = await fetch("/api/audit", { cache: "no-store" });
        if (auditResponse.ok && alive) {
          const auditData = (await auditResponse.json()) as { events: AuditEvent[] };
          setAuditEvents(auditData.events.slice(0, 4));
        }
        const arcResponse = await fetch("/api/arc/status", { cache: "no-store" });
        if (arcResponse.ok && alive) setArcStatus((await arcResponse.json()) as ArcStatus);
        const newsResponse = await fetch("/api/intel/news", { cache: "no-store" });
        if (newsResponse.ok && alive) setNewsIntel((await newsResponse.json()) as NewsIntel);
        const marketplaceResponse = await fetch("/api/agents/marketplace", { cache: "no-store" });
        if (marketplaceResponse.ok && alive) setMarketplace((await marketplaceResponse.json()) as MarketplaceStatus);
        const sourceResponse = await fetch("/api/intel/sources", { cache: "no-store" });
        if (sourceResponse.ok && alive) setSourceSnapshot((await sourceResponse.json()) as SourceSnapshot);
        const tradingResponse = await fetch("/api/agents/trading", { cache: "no-store" });
        if (tradingResponse.ok && alive) setTradingDesk((await tradingResponse.json()) as TradingDesk);
        if (alive) await loadReputations();
      } catch {
        if (alive) setTelegramSignal(null);
      }
    };
    loadSignal();
    const interval = window.setInterval(loadSignal, 7000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/x402/blocky402/pay", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then((data: { enabled: boolean }) => {
        if (!cancelled) setBlocky402Status({ enabled: Boolean(data.enabled) });
      })
      .catch((error: unknown) => {
        if (!cancelled) setBlocky402Status({ enabled: false, error: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshAudit = async () => {
    const auditResponse = await fetch("/api/audit", { cache: "no-store" });
    if (auditResponse.ok) {
      const auditData = (await auditResponse.json()) as { events: AuditEvent[] };
      setAuditEvents(auditData.events.slice(0, 4));
    }
  };

  const publishHcsProof = async () => {
    setIsPublishingHcs(true);
    try {
      const response = await fetch("/api/audit/hcs", { method: "POST", cache: "no-store" });
      const result = (await response.json()) as HcsProof;
      setHcsProof(result);
    } catch {
      setHcsProof({ ok: false, error: "publish_failed" });
    } finally {
      setIsPublishingHcs(false);
    }
  };
  // Reserved helper for the legacy x402 panel; keep reachable for future restoration.
  void publishHcsProof;

  const refreshReputations = async () => {
    try {
      const response = await fetch("/api/agents/reputation", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as ProviderReputation;
        setReputations(data.reputations ?? []);
      }
    } catch {
      // ignore
    }
  };

  const runFullMission = async (scenarioId = activeScenario) => {
    setActiveScenario(scenarioId);
    setIsRunningMission(true);
    try {
      const response = await fetch("/api/mission/run", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId, x402Mode: useBlocky402 ? "blocky402" : "hmac" }),
      });
      if (response.ok) {
        const result = (await response.json()) as MissionRun;
        setMissionRun(result);
        setAuditEvents(result.auditEvents.slice().reverse().slice(0, 4));
        await refreshReputations();
      }
    } finally {
      setIsRunningMission(false);
    }
  };

  const requestX402Challenge = async () => {
    setIsX402Busy(true);
    try {
      const response = await fetch("/api/x402/facilitator", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "challenge", providerId: "telegram-pulse", priceUsd: 0.01 }),
      });
      const data = await response.json();
      if (data?.nonce) {
        setX402((prev) => ({ ...prev, challenge: { nonce: data.nonce, priceUsd: data.priceUsd, rail: data.rail, facilitatorUrl: data.facilitatorUrl }, history: [{ action: "challenge", ok: true, note: `Issued nonce ${data.nonce}`, at: new Date().toISOString() }, ...prev.history].slice(0, 6) }));
      } else {
        setX402((prev) => ({ ...prev, history: [{ action: "challenge", ok: false, note: "No nonce returned.", at: new Date().toISOString() }, ...prev.history].slice(0, 6) }));
      }
    } catch {
      setX402((prev) => ({ ...prev, history: [{ action: "challenge", ok: false, note: "Network error", at: new Date().toISOString() }, ...prev.history].slice(0, 6) }));
    } finally {
      setIsX402Busy(false);
    }
  };
  // Reserved helper for the legacy x402 panel; keep reachable for future restoration.
  void requestX402Challenge;

  const settleX402Receipt = async () => {
    if (!x402.challenge) return;
    setIsX402Busy(true);
    try {
      const paymentRef = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const response = await fetch("/api/x402/facilitator", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "settle", providerId: "telegram-pulse", buyer: "ui-buyer", priceUsd: 0.01, paymentRef, nonce: x402.challenge.nonce }),
      });
      const data = await response.json();
      if (data?.ok && data.receipt) {
        setX402((prev) => ({
          ...prev,
          receipt: { receiptId: data.receipt.receiptId, signature: data.receipt.signature, paymentRef: data.receipt.paymentRef, priceUsd: data.receipt.priceUsd, facilitator: data.receipt.facilitator, providerId: data.receipt.providerId },
          history: [{ action: "settle", receiptId: data.receipt.receiptId, ok: true, note: `Settled ${data.receipt.receiptId}`, at: new Date().toISOString() }, ...prev.history].slice(0, 6),
        }));
      } else {
        setX402((prev) => ({ ...prev, history: [{ action: "settle", ok: false, note: data?.message ?? "Settlement failed", at: new Date().toISOString() }, ...prev.history].slice(0, 6) }));
      }
    } catch {
      setX402((prev) => ({ ...prev, history: [{ action: "settle", ok: false, note: "Network error", at: new Date().toISOString() }, ...prev.history].slice(0, 6) }));
    } finally {
      setIsX402Busy(false);
    }
  };
  void settleX402Receipt;

  const verifyX402Receipt = async () => {
    if (!x402.receipt) return;
    setIsX402Busy(true);
    try {
      const response = await fetch("/api/x402/facilitator", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "verify", receipt: x402.receipt }),
      });
      const data = await response.json();
      setX402((prev) => ({ ...prev, history: [{ action: "verify", receiptId: prev.receipt?.receiptId, ok: Boolean(data?.valid), note: data?.valid ? "HMAC verified" : "signature rejected", at: new Date().toISOString() }, ...prev.history].slice(0, 6) }));
    } catch {
      setX402((prev) => ({ ...prev, history: [{ action: "verify", ok: false, note: "Network error", at: new Date().toISOString() }, ...prev.history].slice(0, 6) }));
    } finally {
      setIsX402Busy(false);
    }
  };
  void verifyX402Receipt;

  const anchorX402Receipt = async () => {
    if (!x402.receipt) return;
    setIsPublishingHcs(true);
    try {
      const response = await fetch("/api/x402/anchor", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ receipt: x402.receipt }),
      });
      const data = await response.json();
      setHcsProof({
        ok: Boolean(data?.ok),
        topicId: data?.topicId,
        transactionId: data?.transactionId,
        status: data?.status,
        eventHash: data?.eventHash,
        explorer: data?.explorer,
        error: data?.ok ? undefined : (data?.error ?? "anchor_failed"),
      });
      setX402((prev) => ({ ...prev, history: [{ action: "release", receiptId: prev.receipt?.receiptId, ok: Boolean(data?.ok), note: data?.ok ? `Anchored ${data.transactionId}` : (data?.error ?? "anchor failed"), at: new Date().toISOString() }, ...prev.history].slice(0, 6) }));
    } catch {
      setHcsProof({ ok: false, error: "anchor_network_error" });
    } finally {
      setIsPublishingHcs(false);
    }
  };
  void anchorX402Receipt;

  const startCycle = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setIsRunning(true);
    setActiveStep(0);
    setRunCount((count) => count + 1);
    document.getElementById("cycle")?.scrollIntoView({ behavior: "smooth", block: "start" });
    void fetch("/api/cycle/run", { method: "POST", cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<CycleRunResult> : null)
      .then((result) => {
        if (!result) return;
        setTelegramSignal(result.signal);
        setSignalIntelligence(result.intelligence);
        setAuditEvents(result.auditEvents.slice().reverse().slice(0, 4));
      })
      .catch(() => undefined);
    cycle.steps.forEach((_, index) => {
      timersRef.current.push(window.setTimeout(() => setActiveStep(index), index * 820));
    });
    timersRef.current.push(window.setTimeout(() => {
      setIsRunning(false);
      void refreshAudit();
    }, cycle.steps.length * 820 + 520));
  };

  const scrollToMission = () => {
    document.getElementById("mission")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!missionRun && !isRunningMission) {
      void runFullMission(activeScenario);
    }
  };

  const _currentStep = activeStep >= 0 ? cycle.steps[activeStep] : null;
  void _currentStep;
  const _visualStateForStep = (index: number, state: string) => {
    if (state === "soon") return "soon";
    if (isRunning && activeStep === index) return "running";
    if ((isRunning && activeStep > index) || (!isRunning && runCount > 0)) return "done";
    return state;
  };
  void _visualStateForStep;
  const scenarioButtons = [
    ["fast-eth-risk-check", "Fast ETH Risk"],
    ["dao-treasury-rebalance", "DAO Treasury"],
    ["security-event-shock", "Security Shock"],
    ["market-narrative-scout", "Narrative Scout"],
    ["provider-marketplace-demo", "Provider Market"],
  ];

  return (
    <main id="top" className="ink-page">
      <InkCursor />
      <Nav />

      <section className="ink-hero">
        <KanjiRain density={16} />
        <div className="hero-vertical">自律型知能市場</div>
        <div className="hero-chain">自律 AGENT MARKET · ARC 円 · HEDERA 台帳</div>
        <div className="hero-orb one" />
        <div className="hero-orb two" />
        <div className="hero-inner reveal-on-load">
          <div className="ink-eyebrow">MATOI CONTROL ROOM</div>
          <h1 className="ink-title">
            <span>AGENT</span>
            <span>MARKET</span>
          </h1>
          <p className="ink-subtitle">
            Matoi coordinates buyer and provider agents, turns live sources into paid intelligence, settles testnet rails and records proof for every decision.
          </p>
          <div className="hero-stats" aria-label="what you get after running a mission">
            <div><small>AGENTS</small><strong>5 BUYER TASKS</strong></div>
            <div><small>RAILS</small><strong>ARC · HEDERA X402</strong></div>
            <div><small>PROOF</small><strong>HCS ANCHOR</strong></div>
            <div><small>TRADE</small><strong>POLICY GATED</strong></div>
          </div>
          <div className="hero-actions">
            <MagneticButton primary onClick={scrollToMission} disabled={isRunningMission}>{isRunningMission ? "RUNNING" : "RUN AGENT MARKET"}</MagneticButton>
            <button type="button" className="ink-btn group" onClick={() => document.getElementById("rails")?.scrollIntoView({ behavior: "smooth", block: "start" })}>SEE PAYMENT PROOF</button>
          </div>
        </div>
        <div className="ink-marquee">
          <div>{railWords.concat(railWords).map((word, index) => <span key={`${word}-${index}`}>✦ {word}</span>)}</div>
        </div>
      </section>

      <section id="mission" className="paper-section">
        <KanjiRain density={9} />
        <div className="ink-container mission-grid">
          <div className="mission-runner-panel">
            <div>
              <p className="section-mark">任 MISSION</p>
              <h2>Agent market mission</h2>
              <p className="copy">Pick a buyer scenario. Matoi discovers providers, scores quotes, authorizes Arc spend, settles x402 receipts and writes a HCS-ready audit trail.</p>
            </div>
            <StatusChip tone={missionRun ? "hot" : "paper"}>{missionRun ? "ARC SPEND AUTHORIZED" : "5 BUYER TASKS"}</StatusChip>
            <div className="scenario-chip-row">
              {scenarioButtons.map(([id, label]) => (
                <button key={id} type="button" className={cx("scenario-chip", activeScenario === id && "active")} onClick={() => setActiveScenario(id)} disabled={isRunningMission}>
                  {label}
                </button>
              ))}
            </div>
            <div className="blocky402-toggle-row">
              <button
                type="button"
                className={cx("blocky402-toggle", useBlocky402 && "active")}
                onClick={() => setUseBlocky402((value) => !value)}
                disabled={isRunningMission}
                aria-pressed={useBlocky402}
                title="Blocky402 mode routes paid requests through the app's Blocky402-compatible /settle facilitator on Hedera testnet. Local HMAC is the default; this toggle adds Blocky402 messages to the A2A transcript."
              >
                <span className="blocky402-toggle-dot" aria-hidden="true" />
                Blocky402 {useBlocky402 ? "ON" : "OFF"}
              </button>
              <small className="blocky402-toggle-note">
                {blocky402Status === null
                  ? "checking…"
                  : blocky402Status.error
                  ? `error: ${blocky402Status.error}`
                  : blocky402Status.enabled
                  ? "Blocky402-compatible facilitator ready on hedera:testnet"
                  : "Blocky402-compatible facilitator requires HEDERA_PAYER_ACCOUNT_ID + HEDERA_PAYER_KEY in .env.local"}
              </small>
            </div>
            <button
              type="button"
              className={cx("hcs-proof-btn", isRunningMission && "is-loading")}
              onClick={() => runFullMission(activeScenario)}
              disabled={isRunningMission}
              aria-busy={isRunningMission}
            >
              <span className="hcs-proof-btn-label">
                {isRunningMission ? (
                  <>
                    <span className="hcs-proof-btn-spinner" aria-hidden="true" />
                    RUNNING FULL MISSION
                  </>
                ) : (
                  "RUN FULL MISSION"
                )}
              </span>
            </button>
            <small>{missionRun ? `${missionRun.providerAnalyses.length} providers | Arc $${missionRun.arc.authorizedUsd.toFixed(2)} | ${missionRun.decision.intent.replace("_SIMULATED", "")}` : "LOAD SCENARIO → RANK PROVIDERS → AUTHORIZE ARC SPEND → RUN ANALYSIS"}</small>
            {missionRun?.quotes && missionRun.quotes.length > 0 ? (
              <p className="run-mini-list">
                <b>Provider quotes:</b>{" "}
                {missionRun.quotes.map((quote) => `${quote.providerId} ($${quote.cappedUsd.toFixed(3)}, ${quote.tier})`).join(" · ")}
              </p>
            ) : null}
            {missionRun?.inspector ? (
              <p className="run-mini-list">
                <b>Inspector:</b> {missionRun.inspector.ok ? "ok" : "flagged"} · {missionRun.inspector.note}
                {missionRun.inspector.contradictions.length ? ` · contradictions=${missionRun.inspector.contradictions.length}` : ""}
                {missionRun.inspector.duplicates.length ? ` · duplicates=${missionRun.inspector.duplicates.length}` : ""}
                {missionRun.inspector.overPricedFlag ? " · overpriced" : ""}
              </p>
            ) : null}
            {missionRun?.liveCalls && missionRun.liveCalls.length > 0 ? (
              <p className="run-mini-list">
                <b>OpenRouter:</b>{" "}
                {missionRun.liveCalls.map((call) => `${call.providerId}=${call.usedFallback ? "fallback" : call.ok ? "ok" : "fail"} (${call.durationMs}ms)`).join(" · ")}
              </p>
            ) : null}
            <div className="mission-summary-cards">
              {missionRun ? (
                <>
                  <article className="summary-card">
                    <small>PROVIDER QUOTES</small>
                    <strong>{missionRun.quotes.length}</strong>
                    <em>${missionRun.quotes.reduce((acc, q) => acc + q.cappedUsd, 0).toFixed(3)} capped</em>
                  </article>
                  <article className="summary-card">
                    <small>ARC SPEND</small>
                    <strong>${missionRun.arc.authorizedUsd.toFixed(2)}</strong>
                    <em>{missionRun.arc.network}</em>
                  </article>
                  <article className="summary-card">
                    <small>DECISION</small>
                    <strong>{missionRun.decision.intent.replace("_SIMULATED", "")}</strong>
                    <em>{missionRun.decision.execution === "disabled" ? "policy gate" : missionRun.decision.execution}</em>
                  </article>
                  <article className="summary-card">
                    <small>AUDIT EVENTS</small>
                    <strong>{missionRun.auditEvents.length}</strong>
                    <em>HCS ready</em>
                  </article>
                  <article className="summary-card">
                    <small>NANOPAYMENTS</small>
                    <strong>{missionRun.nanopayments.totalCalls} calls</strong>
                    <em>${missionRun.nanopayments.totalAccruedUsdc.toFixed(6)} accrued</em>
                  </article>
                  <article className="summary-card">
                    <small>BLOCKY402 / X402</small>
                    <strong>{missionRun.a2aTranscript.some((m) => m.type === "BLOCKY402_RECEIPT_VERIFIED") ? "verified" : "ready"}</strong>
                    <em>hedera:testnet paid service</em>
                  </article>
                </>
              ) : (
                <article className="summary-card placeholder">
                  <small>MISSION</small>
                  <strong>READY</strong>
                  <em>Run the buyer scenario to populate quotes, Arc spend and proof.</em>
                </article>
              )}
            </div>
          </div>
          <div id="transcript" className="transcript-panel">
            <div>
              <p className="section-mark">対 TRANSCRIPT</p>
              <h3>A2A transcript</h3>
              <p className="copy">BuyerAgent negotiates with provider agents, Arc treasury, Blocky402-compatible x402 facilitator and HCS audit. Each line is an actual mission step.</p>
            </div>
            {missionRun?.a2aTranscript && missionRun.a2aTranscript.length > 0 ? (
              <div className="a2a-transcript-block">
                <ol>
                  {missionRun.a2aTranscript.map((message) => (
                    <li key={message.id}>
                      <span className="a2a-step">{message.from} → {message.to}</span>
                      <strong>{message.type.replaceAll("_", " ")}</strong>
                      <em>{message.priceUsd ? `$${message.priceUsd.toFixed(3)} · ` : ""}{message.rail ?? message.status}</em>
                      {message.whyThisMatters ? <p className="a2a-why">{message.whyThisMatters}</p> : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="a2a-transcript-block empty">
                <ol>
                  <li><span className="a2a-step">BuyerAgent → DirectoryAgent</span><strong>DISCOVER PROVIDERS</strong><em>catalog ready</em></li>
                  <li><span className="a2a-step">ProviderAgent → BuyerAgent</span><strong>QUOTE OFFERED</strong><em>awaiting scenario</em></li>
                  <li><span className="a2a-step">BuyerAgent → ArcTreasuryAgent</span><strong>SPEND AUTHORIZED</strong><em>awaiting scenario</em></li>
                  <li><span className="a2a-step">BuyerAgent → X402FacilitatorAgent</span><strong>X402 CHALLENGE</strong><em>awaiting scenario</em></li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="rails" className="dark-section">
        <KanjiRain density={10} />
        <div className="ink-container">
          <div className="section-head">
            <p className="section-mark">連 RAILS</p>
            <h2>BuyerAgent moves through providers, payment rails and proof.</h2>
          </div>
          <ol className="flow-diagram">
            <li><span className="jp">買</span><strong>BuyerAgent</strong><em>issues mission with budget and risk policy</em></li>
            <li><span className="jp">源</span><strong>Provider agents</strong><em>telegram-pulse · arc-research · coingecko · defillama · rss · github</em></li>
            <li><span className="jp">引</span><strong>Quotes ranked</strong><em>inspector cross-checks contradictions and overpricing</em></li>
            <li><span className="jp">円</span><strong>Arc / Circle DCW spend</strong><em>testnet USDC authorized against per-provider cap</em></li>
            <li><span className="jp">鍵</span><strong>Blocky402 x402 service</strong><em>challenge → payment submitted → receipt verified</em></li>
            <li><span className="jp">知</span><strong>Intelligence delivered</strong><em>provider-specific thesis feeds decision</em></li>
            <li><span className="jp">守</span><strong>Risk review</strong><em>risk guard signs off before any intent is allowed</em></li>
            <li><span className="jp">台</span><strong>HCS audit proof</strong><em>public ledger anchor for the whole mission</em></li>
          </ol>
          <div className="proof-cards">
            <article className="proof-card">
              <small>ARC / CIRCLE</small>
              <strong>Circle DCW + USDC</strong>
              <em>{arcStatus?.allReady ? "COMPLETE on ARC-TESTNET" : "PENDING"}</em>
              <p>Trader, ArcResearch and Risk wallets authorize testnet USDC spend for provider agents.</p>
            </article>
            <article className="proof-card">
              <small>BLOCKY402 / X402</small>
              <strong>Receipt verified</strong>
              <em>{x402.receipt ? "RECEIPT SETTLED" : "HEDERA TESTNET"}</em>
              <p>Blocky402-compatible /settle route verifies x402 paid requests for the Hedera testnet service.</p>
            </article>
            <article className="proof-card">
              <small>HEDERA</small>
              <strong>HCS audit topic</strong>
              <em>{hcsProof?.ok ? `${hcsProof.topicId ?? "READY"}` : "LIVE"}</em>
              <p>Each mission emits an allowlisted audit payload anchored to HCS.</p>
            </article>
            <article className="proof-card">
              <small>DIRECTORY</small>
              <strong>Agent directory</strong>
              <em>LIVE</em>
              <p>Sellable provider agents are discoverable through the marketplace surface.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="paper-section compact">
        <div className="ink-container">
          <div className="section-head">
            <p className="section-mark">源 PROVIDERS</p>
            <h2>Provider agents behind the market.</h2>
            <p className="copy">Each provider is a real endpoint, ranked per scenario. Disabled ones stay visible but receive no buy.</p>
          </div>
          <div className="provider-agents-grid">
            <article className="provider-agent-card">
              <span className="jp">信</span>
              <h3>TelegramPulse</h3>
              <p>Live Telegram source through local reader bridge; demo falls back only when no fresh live items are available.</p>
              <StatusChip tone="hot">LIVE SOURCE</StatusChip>
            </article>
            <article className="provider-agent-card">
              <span className="jp">円</span>
              <h3>ArcResearch</h3>
              <p>Liquidity and stablecoin flow context through the Arc wallet rail; paid provider, capped per mission.</p>
              <StatusChip tone={arcStatus?.allReady ? "hot" : "paper"}>{arcStatus?.allReady ? "PAID" : "PENDING"}</StatusChip>
            </article>
            <article className="provider-agent-card">
              <span className="jp">守</span>
              <h3>RiskGuard</h3>
              <p>Risk review of every decision before intent is signed; flags overpriced and contradicting signals.</p>
              <StatusChip tone="violet">REVIEW</StatusChip>
            </article>
            <article className="provider-agent-card">
              <span className="jp">群</span>
              <h3>Source agents</h3>
              <p>RSS, prices, TVL and GitHub releases as background context providers for any buyer scenario.</p>
              <StatusChip tone="violet">{sourceSnapshot?.agents.length ?? 4} PROVIDERS</StatusChip>
            </article>
          </div>
        </div>
      </section>

      <section id="cycle" className="paper-section compact">
        <div className="ink-container">
          <div className="section-head">
            <p className="section-mark">信 SIGNALS</p>
            <h2>Recent signals Matoi just heard</h2>
            <p className="copy">
              Live preview from the Telegram source bridge. Each entry is one TelegramPulse hit that Matoi can turn into a buyer mission.
              The same shape works for the other catalog source agents (telegram-news, rss-news, coingecko-price, defillama-tvl, github-releases) — drop one into the bridge and it appears here automatically.
            </p>
          </div>
          <div className="signals-feed">
            <article className="signal-card" data-source="telegram-pulse" data-sentiment={telegramSignal?.sentiment ?? "bullish"}>
              <div className="signal-head">
                <span className="signal-source">TelegramPulse · ETH</span>
                <StatusChip tone={telegramSignal?.mode === "LIVE TELEGRAM" ? "hot" : "paper"}>{telegramSignal?.mode ?? "DEMO FIXTURE"}</StatusChip>
              </div>
              <p className="signal-summary">{telegramSignal?.summary ?? "ETH discussion intensity is rising in the demo group."}</p>
              <div className="signal-meta">
                <span>sentiment <b>{telegramSignal?.sentiment ?? "bullish"}</b></span>
                <span>confidence <b>{((telegramSignal?.confidence ?? 0.74) * 100).toFixed(0)}%</b></span>
                <span>samples <b>{telegramSignal?.sampleSize ?? 4}</b></span>
              </div>
              <button type="button" className="ink-btn group signal-refresh" onClick={startCycle} disabled={isRunning}>
                {isRunning ? "REFRESHING" : "REFRESH"}
              </button>
            </article>
            <article className="signal-card" data-source="telegram-pulse" data-sentiment="bearish">
              <div className="signal-head">
                <span className="signal-source">TelegramPulse · ETH</span>
                <StatusChip tone="paper">DEMO FIXTURE</StatusChip>
              </div>
              <p className="signal-summary">Whale wallet moved 1.8k ETH to a CEX; price chatter is cooling off in the watch channel.</p>
              <div className="signal-meta">
                <span>sentiment <b>bearish</b></span>
                <span>confidence <b>62%</b></span>
                <span>samples <b>3</b></span>
              </div>
            </article>
            <article className="signal-card" data-source="placeholder">
              <div className="signal-head">
                <span className="signal-source">More source agents ready to plug</span>
                <StatusChip tone="paper">CATALOG READY</StatusChip>
              </div>
              <p className="signal-summary">telegram-news, rss-news, coingecko-price, defillama-tvl, github-releases — all wired into the marketplace. Each one drops into this feed the same way TelegramPulse does, no shape change needed.</p>
              <div className="signal-meta">
                <span>sources <b>5 ready</b></span>
                <span>shape <b>telegram-pulse compatible</b></span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="status" className="dark-section roadmap-section">
        <KanjiRain density={8} />
        <div className="ink-container roadmap-grid">
          <div>
            <p className="section-mark">証 STATUS</p>
            <h2>Built rails are live.</h2>
            <p className="copy">Only the core agent commerce is shown here. Stretch protocol layers stay honest, not faked.</p>
          </div>
          <div className="roadmap-list">
            {[
              ["A2A mission transcript", "LIVE", "hot"],
              ["Arc/Circle testnet transfer", "COMPLETE", "hot"],
              ["x402 facilitator", "LIVE", "hot"],
              ["HCS audit topic", "LIVE", "hot"],
              ["Agent directory", "LIVE", "hot"],
              ["Local 24/7 scheduler", "READY", "hot"],
            ].map(([item, status, tone], index) => (
              <div key={item} className="roadmap-item">
                <span className="jp">{glyphs[index]}</span>
                <strong>{item}</strong>
                <StatusChip tone={tone as "hot" | "paper"}>{status}</StatusChip>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="ink-footer">
        <div className="footer-brand-block">
          <div>
            <strong>Matoi by Yomek</strong>
            <p>Agent Intelligence Market for paid provider intelligence, Arc/Circle settlement and Hedera proof.</p>
          </div>
        </div>
        <div className="footer-contact-grid" aria-label="Copy founder and community links">
          {contactLinks.map(({ id, label, value, icon: Icon }) => (
            <button key={id} type="button" className="footer-contact-row" onClick={() => copyFooterContact(label, value)}>
              <Icon size={21} weight="duotone" />
              <span>
                <b>{label}</b>
                <em>{value.replace("https://", "")}</em>
              </span>
            </button>
          ))}
          <span className={cx("footer-copy-toast", footerCopied && "is-visible")} aria-live="polite">
            {footerCopied ? `${footerCopied} copied` : "Copied"}
          </span>
        </div>
      </footer>
      <ProofConsole missionRun={missionRun} />
    </main>
  );
}
