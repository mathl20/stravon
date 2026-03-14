'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const navbar = document.querySelector('.navbar') as HTMLElement | null;
      if (navbar) {
        navbar.style.padding = window.scrollY > 80 ? '10px 0' : '14px 0';
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="navbar">
      <div className="m-container">
        <Link href="/" className="nav-brand">
          <div className="nav-brand-icon">⚡</div>
          <div className="nav-brand-text">Stravon</div>
        </Link>

        <ul className="nav-links">
          <li><a href="#fonctionnalites">Fonctionnalités</a></li>
          <li><a href="#temoignages">Avis</a></li>
          <li><a href="#tarifs">Tarifs</a></li>
        </ul>

        <div className="nav-right">
          <Link href="/login" className="nav-login">Connexion</Link>
          <Link href="/register" className="btn-accent">Créer un compte</Link>
        </div>

        <button
          className="nav-burger"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <span className={`nav-burger-line ${open ? 'open' : ''}`} />
          <span className={`nav-burger-line ${open ? 'open' : ''}`} />
          <span className={`nav-burger-line ${open ? 'open' : ''}`} />
        </button>

        {open && (
          <>
            <div className="nav-mobile-overlay" onClick={() => setOpen(false)} />
            <div className="nav-mobile-menu">
              <a href="#fonctionnalites" onClick={() => setOpen(false)}>Fonctionnalités</a>
              <a href="#temoignages" onClick={() => setOpen(false)}>Avis</a>
              <a href="#tarifs" onClick={() => setOpen(false)}>Tarifs</a>
              <div className="nav-mobile-divider" />
              <Link href="/login" onClick={() => setOpen(false)}>Connexion</Link>
              <Link href="/register" className="nav-mobile-cta" onClick={() => setOpen(false)}>
                Créer un compte
              </Link>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
