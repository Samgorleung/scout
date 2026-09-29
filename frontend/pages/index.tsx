import React from 'react';
import Head from 'next/head';
import PortfolioDashboard from '@/components/PortfolioDashboard';

export default function Home() {
  return (
    <>
      <Head>
        <title>Portfolio Hub | IPA Scout Major Infrastructure Assurance</title>
        <meta
          name="description"
          content="Centralized infrastructure portfolio assurance hub summarizing active compliance reviews, recent progress metrics, risk distributions, and upcoming statutory deadlines across UK major projects."
        />
        <meta property="og:title" content="Portfolio Hub | IPA Scout Infrastructure Assurance" />
        <meta
          property="og:description"
          content="Centralized infrastructure portfolio assurance hub summarizing active compliance reviews, recent progress metrics, risk distributions, and upcoming statutory deadlines across UK major projects."
        />
      </Head>

      <PortfolioDashboard />
    </>
  );
}
