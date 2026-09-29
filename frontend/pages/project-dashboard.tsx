import React from 'react';
import Head from 'next/head';
import { ProjectDashboard } from '@/components/ProjectDashboard';

export default function ProjectDashboardPage() {
  return (
    <>
      <Head>
        <title>Project Dashboard | IPA Scout Infrastructure Assurance</title>
        <meta
          name="description"
          content="Interactive project-level dashboard summarizing infrastructure review status, key risk metrics, Green Book 5-case assurance profile, and recent audit activity velocity using Recharts."
        />
        <meta property="og:title" content="Project Dashboard | IPA Scout Infrastructure Assurance" />
        <meta
          property="og:description"
          content="Interactive project-level dashboard summarizing infrastructure review status, key risk metrics, Green Book 5-case assurance profile, and recent audit activity velocity using Recharts."
        />
      </Head>

      <ProjectDashboard />
    </>
  );
}
