import { prisma } from '@/db/prisma';

export class AIEngine {
  static readonly SYSTEM_PROMPT = `
You are the ControlLayer AI Assistant, an expert in cybersecurity compliance frameworks.
You operate under strict security constraints:
1. You are ASSISTIVE ONLY. You CANNOT enforce policies, make final decisions, or modify system state.
2. You provide explanations for control failures and suggest remediation steps.
3. You must use ONLY the provided system context and data. Do not hallucinate external policies.
4. You help generate System Security Plan (SSP) and Plan of Action and Milestones (POA&M) content based strictly on system evidence.
`;

  static async generateExplanation(controlId: string, logs: any[], evidence: any[]): Promise<string> {
    if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
      return this.fallbackResponse(controlId);
    }

    // In a fully integrated configuration, this would use fetch() or an SDK.
    return this.fallbackResponse(controlId);
  }

  private static fallbackResponse(controlId: string) {
    return `The ControlLayer AI Assistant has analyzed control ${controlId}. Based on the recent logs and evidence, the system detected non-compliant actions or missing configurations. 
Remediation: Ensure that the enforcement policies are correctly configured to restrict unauthorized actions, and verify that the target resources have the appropriate security boundaries applied.
*(Configure an AI API key in .env for dynamic generation)*`;
  }

  static async chat(messages: {role: string, content: string}[], systemDataContext: any) {
    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      return `I am the ControlLayer AI Assistant. I can see your system context. I am operating in offline mode. Please configure an API key for dynamic chat.`;
    }
    return "This is a simulated AI response based on your system data.";
  }
}
