"use client";

import { useState } from "react";
import Link from "next/link";
import { DiscordLogo, EnvelopeSimple, HouseLine, XLogo } from "@phosphor-icons/react";
import "./docs.css";

const capabilities = [
  {
    title: "Agent intelligence market",
    body: "A buyer agent opens a mission, discovers provider agents, requests quotes, pays for useful intelligence and keeps a proof trail for every decision.",
  },
  {
    title: "Source expansion",
    body: "Telegram is the first live source. The same provider shape can accept Discord, X, Farcaster, Reddit, RSS, price feeds, GitHub releases, forums, news wires and private research rooms.",
  },
  {
    title: "Policy controlled spend",
    body: "Matoi authorizes small provider payments through the Arc and Circle testnet rail. Budget caps, provider caps and risk checks stay explicit.",
  },
  {
    title: "Proof before trust",
    body: "x402 style access, HCS audit anchoring and local audit events make the run inspectable instead of asking judges to trust a black box.",
  },
];

const flows = [
  "BuyerAgent defines the mission, budget and risk policy.",
  "DirectoryAgent finds provider agents that can answer the request.",
  "Provider agents return quotes, confidence and source context.",
  "ArcTreasuryAgent approves spend inside the budget policy.",
  "x402 facilitator issues and verifies provider access receipts.",
  "RiskGuard reviews contradictions, stale data and overpricing.",
  "TraderAgent returns an intent for simulation, not a mainnet trade.",
  "AuditAgent writes proof events for later review.",
];

const checks = [
  "Provider reputation and quote history",
  "Budget caps and per provider limits",
  "Source freshness and confidence scoring",
  "Cross provider contradiction checks",
  "Risk policy before any trading intent",
  "Audit event allowlist to avoid leaking secrets",
  "HCS proof readiness and receipt verification",
  "Safe submission status for Arc and Hedera tracks",
];

const examples = [
  {
    title: "Social alpha desk",
    body: "Connect Telegram, Discord, X and Farcaster rooms. Agents rank narratives, detect sudden sentiment shifts and buy deeper context from specialist providers.",
  },
  {
    title: "NFT market intelligence",
    body: "Track collection chatter, floor movements, holder behavior and creator announcements. Provider agents can price research for specific collections or wallets.",
  },
  {
    title: "RWA monitoring",
    body: "Follow tokenized treasuries, real estate, private credit and issuer updates. Agents can score policy risk, liquidity and source credibility before any allocation idea.",
  },
  {
    title: "DAO treasury operations",
    body: "A treasury agent can request market context, stablecoin flow, governance risk and execution notes before proposing a rebalance.",
  },
  {
    title: "Security event response",
    body: "When a protocol exploit or suspicious wallet movement appears, Matoi can buy fast intelligence from security, social and market agents in one mission.",
  },
  {
    title: "Creator and gaming economies",
    body: "Analyze community demand, item liquidity, creator drops and token incentives. Agents can compete on specialized insight instead of generic dashboards.",
  },
];

const references = [
  ["Hedera", "HCS topics, testnet audit trail and agent rail context", "https://docs.hedera.com/"],
  ["Circle", "developer controlled wallets and testnet payment operations", "https://developers.circle.com/"],
  ["OpenRouter", "provider model access and analysis calls", "https://docs.openrouter.ai/"],
  ["Telethon", "Telegram source reader used by the local bridge", "https://docs.telethon.dev/"],
  ["MCP", "optional tool server pattern for future external integrations", "https://modelcontextprotocol.io/"],
  ["Hedera Agent Kit", "reference package checked for Hedera agent tooling", "https://github.com/hashgraph/hedera-agent-kit"],
  ["x402", "payment required access pattern and receipt flow inspiration", "https://github.com/coinbase/x402"],
];

const contacts = [
  { id: "x", label: "X", value: "https://x.com/NikiYomek", icon: XLogo },
  { id: "discord", label: "Discord", value: "yomek", icon: DiscordLogo },
  { id: "arc", label: "Arc House", value: "Niki Li ( yomek )", icon: HouseLine },
  { id: "email", label: "Email", value: "geraldwarren77@gmail.com", icon: EnvelopeSimple },
];

export default function DocsPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function copyContact(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1200);
  }

  return (
    <main className="docs-ink-page">
      <div className="docs-bg-glyph">証</div>
      <nav className="ink-nav">
        <Link className="ink-brand" aria-label="Agent Intelligence Market home" href="/">
          <span className="ink-seal">証</span>
          <span><strong>MATOI</strong><small>AGENT MARKET</small></span>
        </Link>
        <div className="ink-navlinks">
          <Link href="/#mission">Mission</Link>
          <Link href="/#transcript">Transcript</Link>
          <Link href="/#rails">Rails</Link>
          <Link href="/#status">Status</Link>
          <Link className="is-active" href="/docs">Docs</Link>
          <Link href="/contacts">Contacts</Link>
        </div>
        <button className={`menu-trigger ${navOpen ? "open" : ""}`} aria-label="Open menu" aria-expanded={navOpen} onClick={() => setNavOpen((value) => !value)}>
          <span></span><span></span>
        </button>
      </nav>

      <div className={`ink-menu ${navOpen ? "open" : ""}`} aria-hidden={!navOpen}>
        <div className="ink-menu-inner">
          <p>自律 知能 市場</p>
          <Link href="/#mission" onClick={() => setNavOpen(false)}>Mission</Link>
          <Link href="/#transcript" onClick={() => setNavOpen(false)}>Transcript</Link>
          <Link href="/#rails" onClick={() => setNavOpen(false)}>Rails</Link>
          <Link href="/#status" onClick={() => setNavOpen(false)}>Status</Link>
          <Link href="/docs" className="is-active" onClick={() => setNavOpen(false)}>Docs</Link>
          <Link href="/contacts" onClick={() => setNavOpen(false)}>Contacts</Link>
        </div>
      </div>

      <section className="docs-hero">
        <p className="ink-eyebrow">PROJECT BRIEF</p>
        <h1>Matoi turns agent research into paid, verifiable intelligence.</h1>
        <p>
          A control room for buyer agents and provider agents. It connects live sources, prices the work, approves spend, checks risk and leaves proof for the run.
        </p>
        <div className="docs-hero-actions">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- force a clean route load for demo reliability. */}
          <a href="/" className="docs-primary">Open control room</a>
        </div>
      </section>

      <section className="docs-panel docs-summary refined-summary">
        <div className="summary-title-block">
          <p className="docs-kicker">What it is</p>
          <h2>Agent commerce for intelligence, not another static analytics page.</h2>
        </div>
        <p>
          Matoi lets a buyer agent ask for market context, compare provider agents, pay for selected insight and produce an auditable run. Telegram is live through a local reader bridge. Other sources can be connected through the same provider contract when the project needs them.
        </p>
      </section>

      <section className="docs-card-grid four">
        {capabilities.map((item) => (
          <article key={item.title} className="doc-feature-card">
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section className="docs-panel docs-flow-section">
        <div className="docs-section-title">
          <p className="docs-kicker">How it works</p>
          <h2>One mission, several specialized agents.</h2>
          <p>Each run is a chain of messages, payments, checks and proof events. The UI exposes this as the A2A transcript.</p>
        </div>
        <div className="docs-flow-list">
          {flows.map((step, index) => (
            <div key={step} className="docs-flow-step">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="docs-split">
        <div className="docs-panel">
          <p className="docs-kicker">Agent checks</p>
          <h2>Ratings are useful only when the checks are visible.</h2>
          <p>Matoi scores the run around source quality, quote quality, policy fit and proof readiness. The goal is not to make agents sound smart. The goal is to make each agent accountable.</p>
        </div>
        <div className="docs-checks">
          {checks.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <section className="docs-panel docs-examples-section">
        <div className="docs-section-title compact-title">
          <p className="docs-kicker">Expansion paths</p>
          <h2>Same rail, more markets.</h2>
          <p>Any source with useful signal can become a provider. Any domain where agents buy, sell or rate intelligence can use the same structure.</p>
        </div>
        <div className="docs-card-grid three">
          {examples.map((item) => (
            <article key={item.title} className="doc-example-card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="docs-panel docs-stack-section">
        <div className="docs-section-title compact-title">
          <p className="docs-kicker">References used</p>
          <h2>Documentation and packages behind the build.</h2>
          <p>These are the external references used for the rails, source bridge and optional tool server direction.</p>
        </div>
        <div className="docs-reference-list">
          {references.map(([name, body, href]) => (
            <a key={name} href={href} target="_blank" rel="noreferrer" className="docs-reference-row">
              <strong>{name}</strong>
              <span>{body}</span>
              <em>{href.replace("https://", "")}</em>
            </a>
          ))}
        </div>
      </section>

      <footer className="docs-footer compact-contact-footer">
        <div className="docs-footer-brand">
          <div>
            <strong>Matoi by Yomek</strong>
            <p>Agent Intelligence Market for Arc, Circle and Hedera review.</p>
          </div>
        </div>
        <div className="docs-contact-icons labeled" aria-label="Copy contact details">
          {contacts.map(({ id, label, value, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="contact-copy-row"
              aria-label={`Copy ${label}`}
              title={`Copy ${label}`}
              onClick={() => copyContact(label, value)}
            >
              <Icon size={21} weight="duotone" />
              <span>
                <b>{label}</b>
                <em>{value.replace("https://", "")}</em>
              </span>
            </button>
          ))}
          <span className={`copy-toast ${copied ? "is-visible" : ""}`} aria-live="polite">
            {copied ? `${copied} copied` : "Copied"}
          </span>
        </div>
      </footer>
    </main>
  );
}
