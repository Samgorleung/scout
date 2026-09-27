import staticGateUrls from '../public/gate_urls.json';

const DEFAULT_GATEWAY_TOOLKIT_URL =
  'https://www.gov.uk/government/publications/infrastructure-projects-authority-assurance-review-toolkit';

const GATE_URL_MAP: Record<string, string> = {
  ...(staticGateUrls as Record<string, string> || {})
};

/**
 * Normalizes gate keys (e.g., 'Gate 2: Delivery Strategy', 'gate_2', 'GATE 2', '2') to standard GATE_X keys.
 */
function normalizeGateKey(gate: string): string {
  if (!gate) return 'GATE_2';
  const clean = gate.toUpperCase().trim();
  if (clean.includes('GATE 0') || clean.includes('GATE_0') || clean === '0' || clean.includes('STRATEGIC ASSESSMENT')) return 'GATE_0';
  if (clean.includes('GATE 1') || clean.includes('GATE_1') || clean === '1' || clean.includes('BUSINESS JUSTIFICATION')) return 'GATE_1';
  if (clean.includes('GATE 2') || clean.includes('GATE_2') || clean === '2' || clean.includes('DELIVERY STRATEGY')) return 'GATE_2';
  if (clean.includes('GATE 3') || clean.includes('GATE_3') || clean === '3' || clean.includes('INVESTMENT DECISION')) return 'GATE_3';
  if (clean.includes('GATE 4') || clean.includes('GATE_4') || clean === '4' || clean.includes('READINESS FOR SERVICE')) return 'GATE_4';
  if (clean.includes('GATE 5') || clean.includes('GATE_5') || clean === '5' || clean.includes('OPERATIONS REVIEW')) return 'GATE_4';
  return clean.replace(/\s+/g, '_');
}

/**
 * Returns the official UK Government IPA Assurance Review toolkit URL for a specific Gateway Review Phase.
 * Resolves synchronously from static data without requiring network roundtrips.
 */
export const getGateUrl = async (gate: string): Promise<string | null> => {
  const normalizedKey = normalizeGateKey(gate);

  // 1. Check static in-memory mapping first
  if (GATE_URL_MAP[normalizedKey]) {
    return GATE_URL_MAP[normalizedKey];
  }

  // 2. Client-side fetch attempt with silent fallback
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/gate_urls.json');
      if (response.ok) {
        const data = await response.json();
        if (data && data[normalizedKey]) {
          return data[normalizedKey];
        }
      }
    } catch {
      // Non-blocking fallback to default gateway toolkit URL
    }
  }

  return DEFAULT_GATEWAY_TOOLKIT_URL;
};

