import React from 'react';
import { NextPageContext } from 'next';
import Link from 'next/link';
import Head from 'next/head';

interface ErrorProps {
  statusCode?: number;
  message?: string;
}

function ErrorPage({ statusCode, message }: ErrorProps) {
  return (
    <>
      <Head>
        <title>{statusCode ? `${statusCode} Error` : 'Error'} | IPA Scout</title>
      </Head>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
          {statusCode ? `Error ${statusCode}` : 'An Error Occurred'}
        </h1>
        <p style={{ color: '#4b5563', maxWidth: '480px', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          {message || (statusCode === 404
            ? 'The requested audit resource was not found.'
            : 'An unexpected application error occurred while processing the request.')}
        </p>
        <Link href="/" prefetch={false} passHref legacyBehavior>
          <a style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.625rem 1.25rem',
            backgroundColor: '#005ea5',
            color: '#ffffff',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.95rem'
          }}>
            ← Return to Dashboard
          </a>
        </Link>
      </div>
    </>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default ErrorPage;
