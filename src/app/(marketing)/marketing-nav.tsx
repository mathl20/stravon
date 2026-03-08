'use client';

import { useState } from 'react';
import Link from 'next/link';

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="marketing-navbar">
      <Link href="/" className="marketing-logo">
        <div className="marketing-logo-icon">⚡</div>
        <span className="marketing-logo-text">STRAVON</span>
      </Link>

      <ul className="marketing-nav-links">
        <li><a href="#fonctionnalites">Fonctionnalités</a></li>
        <li><a href="#tarifs">Tarifs</a></li>
      </ul>

      <div className="marketing-nav-actions">
        <Link href="/login" className="marketing-nav-login">Connexion</Link>
        <Link href="/register" className="marketing-nav-register">Créer un compte</Link>
      </div>

      {/* Burger button (mobile only) */}
      <button
        className="marketing-burger"
        onClick={() => setOpen(!open)}
        aria-label="Menu"
      >
        <span className={`marketing-burger-line ${open ? 'open' : ''}`} />
        <span className={`marketing-burger-line ${open ? 'open' : ''}`} />
        <span className={`marketing-burger-line ${open ? 'open' : ''}`} />
      </button>

      {/* Mobile menu */}
      {open && (
        <>
          <div className="marketing-mobile-overlay" onClick={() => setOpen(false)} />
          <div className="marketing-mobile-menu">
            <a href="#fonctionnalites" onClick={() => setOpen(false)}>Fonctionnalités</a>
            <a href="#tarifs" onClick={() => setOpen(false)}>Tarifs</a>
            <div className="marketing-mobile-divider" />
            <Link href="/login" onClick={() => setOpen(false)}>Connexion</Link>
            <Link href="/register" className="marketing-mobile-cta" onClick={() => setOpen(false)}>
              Créer un compte
            </Link>
          </div>
        </>
      )}
    </nav>
  );
}
