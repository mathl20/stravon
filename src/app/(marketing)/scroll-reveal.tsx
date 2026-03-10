'use client';

import { useEffect } from 'react';

export function ScrollReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

    const tObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.3 });
    document.querySelectorAll('.time-card').forEach(el => tObs.observe(el));

    return () => { obs.disconnect(); tObs.disconnect(); };
  }, []);

  return null;
}
