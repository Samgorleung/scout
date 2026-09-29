import React from 'react';
import Head from 'next/head';
import { ProjectDashboard } from '@/components/ProjectDashboard';

export default function ComplianceTrackerPage() {
  return (
    <>
      <Head>
        <title>Compliance Requirements Checklist | IPA Scout Infrastructure Assurance</title>
        <meta
          name="description"
          content="Audit and check off project compliance requirements across IPA Gateway and HM Treasury standards."
        />
        <meta property="og:title" content="Compliance Requirements Checklist | IPA Scout" />
        <meta
          property="og:description"
          content="Audit and check off project compliance requirements across IPA Gateway and HM Treasury standards."
        />
      </Head>

      <ProjectDashboard defaultTab="checklist" />
    </>
  );
}
