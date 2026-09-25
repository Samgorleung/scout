import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI, Type } from '@google/genai';
import { saveFirestoreEvaluation } from '@/lib/firebase';

let aiInstance: GoogleGenAI | null = null;

// Resolve API keys sequentially: process.env.GEMINI_API_KEY, process.env.GOOGLE_GENAI_API_KEY, process.env.API_KEY
function getApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.API_KEY
  );
}

function getAIClient(): GoogleGenAI | null {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        res.status(400).json({ error: 'Invalid JSON body provided' });
        return;
      }
    }

    const { companyNumber, projectName, reviewType, deepAnalysis } = body || {};

    if (!companyNumber) {
      res.status(400).json({ error: 'UK Company Number or Entity identifier is required for compliance evaluation.' });
      return;
    }

    const targetModel = 'gemini-3.8-flash';
    const targetEntity = String(companyNumber).trim();
    const targetProject = projectName ? String(projectName).trim() : 'IPA Infrastructure Audit';
    const targetGate = reviewType ? String(reviewType).trim() : 'GATE_2';

    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(500).json({
        error: 'Gemini API credential not detected. Please configure GEMINI_API_KEY in environment secrets to execute live compliance evaluations.'
      });
      return;
    }

    const ai = getAIClient();
    if (!ai) {
      res.status(500).json({
        error: 'Failed to initialize Google Gen AI SDK with provided credentials.'
      });
      return;
    }

    // System instructions enforce compliance rules and criteria constraints strictly
    const systemInstruction = `The system operates as an autonomous Cross-Border Corporate Compliance Officer and Infrastructure Review Evaluator.
Evaluate the corporate registration and compliance standing of the target entity under Gateway Review Level ${targetGate} standards and criteria.

Operational Constraints:
1. All analytical evaluations, risk profiles, and compliance cross-mappings must be formulated in comprehensive paragraphs using the third person.
2. First-person pronouns (I, me, my, we, our) and second-person pronouns (you, your) are strictly forbidden.
3. The tone must remain exclusively objective, formal, regulatory, and analytical. Avoid conversational greetings, introductory pleasantries, or speculative marketing language.
4. Cross-reference corporate legal standing, registration filing history, solvency indicators, Gateway risk ownership, and delivery capability.
5. You must output exclusively a valid JSON object matching the requested schema.`;

    const contents = `Perform rigorous cross-border corporate compliance and assurance evaluation for entity: "${targetEntity}", mapped to project: "${targetProject}" under review level: "${targetGate}". Include risk findings for Financial, Risk, Governance, and Delivery Capability dimensions.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        entityName: { type: Type.STRING },
        registrationNumber: { type: Type.STRING },
        jurisdiction: { type: Type.STRING },
        legalStandingStatus: { type: Type.STRING },
        riskProfileSummary: { type: Type.STRING },
        analyticalEvaluation: { type: Type.STRING },
        crossMappingFindings: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              status: { type: Type.STRING },
              question: { type: Type.STRING },
              analyticalJustification: { type: Type.STRING }
            },
            required: ['category', 'status', 'question', 'analyticalJustification']
          }
        }
      },
      required: [
        'entityName',
        'registrationNumber',
        'jurisdiction',
        'legalStandingStatus',
        'riskProfileSummary',
        'analyticalEvaluation',
        'crossMappingFindings'
      ]
    };

    const config: any = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema
    };

    // If deepAnalysis is enabled, configure thinking level without legacy parameters
    if (deepAnalysis) {
      config.thinkingConfig = {
        thinkingLevel: 'HIGH'
      };
    }

    const response = await ai.models.generateContent({
      model: targetModel,
      contents,
      config
    });

    const responseText = response.text?.trim();
    if (!responseText) {
      res.status(502).json({ error: 'Gemini 3.8 Flash returned an empty response. Please retry.' });
      return;
    }

    let parsedResult: any;
    try {
      parsedResult = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[Gemini API] Failed to parse model output as JSON:', responseText, parseErr);
      res.status(502).json({
        error: 'Evaluation response from Gemini model could not be parsed as valid JSON.',
        raw: responseText
      });
      return;
    }

    // Persist evaluation to Cloud Firestore
    try {
      await saveFirestoreEvaluation({
        companyNumber: targetEntity,
        projectName: targetProject,
        reviewType: targetGate,
        model: targetModel,
        evaluation: parsedResult
      });
    } catch (firestoreErr) {
      console.warn('[Firestore] Note: Could not persist evaluation record to Firestore:', firestoreErr);
    }

    res.status(200).json(parsedResult);
  } catch (error: any) {
    console.error('[API /api/evaluate] Error:', error);
    let errorMessage = error?.message || 'An unexpected error occurred during compliance evaluation.';
    try {
      const parsedErr = JSON.parse(errorMessage);
      if (parsedErr?.error?.message) {
        errorMessage = parsedErr.error.message;
      }
    } catch {
      // not JSON, retain original error message string
    }
    res.status(500).json({ error: errorMessage });
  }
}
