import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ComplianceTracker from '@/components/ComplianceTracker';
import { fetchItems } from '@/utils/api';

export default function ComplianceTrackerPage() {
  const router = useRouter();
  const [project, setProject] = useState<any>(null);

  const initialView =
    router.query.view === 'activity'
      ? 'activity'
      : router.query.view === 'timeline'
      ? 'timeline'
      : 'checklist';
  const initialItemId = typeof router.query.item === 'string' ? router.query.item : undefined;

  useEffect(() => {
    let isMounted = true;
    const loadProject = async () => {
      try {
        const projectData = await fetchItems('project');
        if (isMounted && projectData && projectData.length > 0) {
          setProject(projectData[0]);
        }
      } catch (err) {
        console.warn('Notice while loading project details for compliance tracker:', err);
      }
    };
    loadProject();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <Head>
        <title>Compliance Requirements Tracker | IPA Scout</title>
        <meta
          name="description"
          content="Audit and check off project compliance requirements across IPA Gateway and HM Treasury standards."
        />
      </Head>

      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
        {/* Header Breadcrumb & Lead */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8125rem',
          color: '#64748b',
          marginBottom: '16px'
        }}>
          <Link href="/" prefetch={false} passHref legacyBehavior>
            <a style={{ color: '#64748b', textDecoration: 'none' }}>Overview</a>
          </Link>
          <span>/</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>Assurance Requirements Tracker</span>
          {initialView === 'timeline' && (
            <>
              <span>/</span>
              <span style={{ color: '#1d70b8', fontWeight: 600 }}>Transition Timeline</span>
            </>
          )}
          {initialView === 'activity' && (
            <>
              <span>/</span>
              <span style={{ color: '#1d70b8', fontWeight: 600 }}>Global Activity Feed</span>
            </>
          )}
        </div>

        <ComplianceTracker
          projectName={project?.name || 'Major Infrastructure Project Audit'}
          currentGate={project?.review_type || 'GATE_2'}
          initialView={initialView}
          initialItemId={initialItemId}
        />
      </div>
    </>
  );
}
