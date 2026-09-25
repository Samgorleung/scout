import type { AppProps } from 'next/app';
import React from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { SearchProvider } from '@/context/SearchContext';
import { GlobalHeaderSearch } from '@/components/GlobalHeaderSearch';
import '../public/styles/index.css';
import '../public/styles/App.css';
import '../public/styles/FileViewer.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  const isActive = (pathname: string) => {
    if (pathname === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(pathname);
  };

  return (
    <SearchProvider>
      <Head>
        <title>IPA Scout | Project Assurance & Compliance Intelligence</title>
        <meta
          name="description"
          content="Enterprise assurance and compliance intelligence platform for UK major infrastructure projects and HM Treasury Gateway Reviews."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="App">
        {/* Modern Executive Top Navigation Bar */}
        <header className="App-header">
          <div className="header-content">
            {/* Zone 1: Brand Wordmark */}
            <Link href="/" prefetch={false} passHref legacyBehavior>
              <a className="header-brand" aria-label="IPA Scout Home">
                <div className="header-brand-logo">
                  <span>IPA</span>
                </div>
                <div className="header-brand-title">
                  <h1>IPA Scout</h1>
                  <span>Gateway Assurance Console</span>
                </div>
              </a>
            </Link>

            {/* Zone 2: Navigation Links */}
            <nav className="header-nav">
              <Link href="/dashboard" prefetch={false} passHref legacyBehavior>
                <a className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
                  Portfolio Dashboard
                </a>
              </Link>
              <Link href="/" prefetch={false} passHref legacyBehavior>
                <a className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                  Overview
                </a>
              </Link>
              <Link href="/compliance-tracker" prefetch={false} passHref legacyBehavior>
                <a className={`nav-link ${isActive('/compliance-tracker') ? 'active' : ''}`}>
                  Compliance Tracker
                </a>
              </Link>
              <Link href="/results" prefetch={false} passHref legacyBehavior>
                <a className={`nav-link ${isActive('/results') ? 'active' : ''}`}>
                  Review Findings
                </a>
              </Link>
              <Link href="/file-viewer" prefetch={false} passHref legacyBehavior>
                <a className={`nav-link ${isActive('/file-viewer') ? 'active' : ''}`}>
                  Document Dossier
                </a>
              </Link>
            </nav>

            {/* Persistent Global Search Bar in Header */}
            <GlobalHeaderSearch />

            {/* Zone 3: Executive Session & Context */}
            <div className="header-actions">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                color: '#e2e8f0',
                letterSpacing: '0.01em'
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 6px #10b981'
                }} />
                <span style={{ fontWeight: 600, color: '#ffffff' }}>Gate 2: Delivery Strategy</span>
                <span style={{ color: '#64748b' }}>•</span>
                <span style={{ color: '#94a3b8' }}>Active Auditor</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="main-content">
          <Component {...pageProps} />
        </main>

        {/* Modern Corporate Footer */}
        <footer className="App-footer">
          <div className="footer-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>IPA Scout</span>
              <span style={{ color: '#cbd5e1' }}>—</span>
              <span>HM Treasury & Infrastructure and Projects Authority Assurance Platform</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Link href="/compliance-tracker" prefetch={false} passHref legacyBehavior>
                <a>Tracker</a>
              </Link>
              <span className="footer-separator">·</span>
              <Link href="/results" prefetch={false} passHref legacyBehavior>
                <a>Findings</a>
              </Link>
              <span className="footer-separator">·</span>
              <Link href="/privacy-policy" prefetch={false} passHref legacyBehavior>
                <a>Privacy & GDPR</a>
              </Link>
              <span className="footer-separator">·</span>
              <a href="mailto:i-dot-ai-enquiries@cabinetoffice.gov.uk">Official Support</a>
            </div>
          </div>
        </footer>
      </div>
    </SearchProvider>
  );
}
