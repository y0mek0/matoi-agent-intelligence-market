"use client";

import { useState } from "react";
import Link from "next/link";
import { DiscordLogo, EnvelopeSimple, HouseLine, XLogo } from "@phosphor-icons/react";
import "../docs/docs.css";
import "./contacts.css";

const contacts = [
  {
    id: "x",
    label: "X / Twitter",
    value: "https://x.com/NikiYomek",
    note: "Public project and founder profile.",
    icon: XLogo,
  },
  {
    id: "discord",
    label: "Discord",
    value: "yomek",
    note: "Fast contact for hackathon coordination.",
    icon: DiscordLogo,
  },
  {
    id: "arc-house",
    label: "Arc House community",
    value: "Niki Li ( yomek )",
    note: "Community identity for Arc House review.",
    icon: HouseLine,
  },
  {
    id: "email",
    label: "Email",
    value: "geraldwarren77@gmail.com",
    note: "Direct contact for judging, follow up and project questions.",
    icon: EnvelopeSimple,
  },
];

export default function ContactsPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function copyContact(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1200);
  }

  return (
    <main className="docs-ink-page contacts-page">
      <div className="docs-bg-glyph">連</div>
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
          <Link href="/docs">Docs</Link>
          <Link className="is-active" href="/contacts">Contacts</Link>
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
          <Link href="/docs" onClick={() => setNavOpen(false)}>Docs</Link>
          <Link href="/contacts" className="is-active" onClick={() => setNavOpen(false)}>Contacts</Link>
        </div>
      </div>

      <section className="docs-hero contacts-hero">
        <p className="ink-eyebrow">CONTACT</p>
        <h1>Niki Li ( yomek )</h1>
        <p>
          Founder contact details for the Matoi Agent Intelligence Market submission. Click any row to copy the contact value.
        </p>
      </section>

      <section className="contacts-shell">
        <div className="contacts-list" aria-label="Copy contact details">
          {contacts.map(({ id, label, value, note, icon: Icon }) => (
            <button key={id} type="button" className="contacts-row" onClick={() => copyContact(label, value)}>
              <span className="contacts-icon"><Icon size={24} weight="duotone" /></span>
              <span className="contacts-text">
                <b>{label}</b>
                <em>{value.replace("https://", "")}</em>
                <small>{note}</small>
              </span>
            </button>
          ))}
        </div>

        <span className={`contacts-toast ${copied ? "is-visible" : ""}`} aria-live="polite">
          {copied ? `${copied} copied` : "Copied"}
        </span>
      </section>

      <footer className="docs-footer compact-contact-footer contacts-footer">
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
        </div>
      </footer>
    </main>
  );
}
