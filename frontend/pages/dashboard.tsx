import React from 'react';
import Head from 'next/head';
import PortfolioDashboard from '@/components/PortfolioDashboard';

export default function DashboardPage() {
  return (
    <>
      <Head>
        <title>Portfolio Dashboard | IPA Scout Infrastructure Assurance</title>
        <meta
          name="description"
          content="Centralized infrastructure project dashboard summarizing active compliance reviews, recent progress metrics, and upcoming statutory deadlines across UK major projects."
        />
      </Head>

      <PortfolioDashboard />
    </>
  );
}
