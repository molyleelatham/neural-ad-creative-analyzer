"use client";

import Link from 'next/link';
import { V3Wordmark } from './V3Wordmark';

interface V3NavProps {
  currentPage?: string;
}

const NAV_ITEMS = [
  { id: 'home',      label: 'Home',      href: '/' },
  { id: 'analyze',   label: 'Analyze',   href: '/analyze' },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { id: 'docs',      label: 'Docs',      href: '/docs' },
];

export function V3Nav({ currentPage = 'home' }: V3NavProps) {
  return (
    <header style={{
      padding: '20px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'oklch(0.98 0.005 90 / 0.82)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid oklch(0.93 0.005 90 / 0.7)',
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <V3Wordmark />
      </Link>

      {/* Pill nav */}
      <nav style={{
        display: 'flex',
        gap: 4,
        background: 'oklch(0.96 0.005 90 / 0.7)',
        padding: 4,
        borderRadius: 999,
        border: '1px solid oklch(0.92 0.005 90)',
      }}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            style={{
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: 999,
              transition: 'all 0.18s',
              color: currentPage === item.id ? 'var(--v3-ink)' : 'var(--v3-ink-3)',
              background: currentPage === item.id ? 'white' : 'transparent',
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link
          href="https://github.com/molyleelatham/arcanalytics"
          target="_blank"
          rel="noopener noreferrer"
          className="v3-btn v3-btn-primary"
          style={{ fontSize: 13, padding: '10px 18px' }}
        >
          GitHub
        </Link>
      </div>
    </header>
  );
}
