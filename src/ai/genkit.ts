// Stub implementation - genkit packages not installed
// To enable AI features, run: npm install genkit @genkit-ai/google-genai

const stubAI = {
  definePrompt: () => ({}) as any,
  defineFlow: (_config: any, fn: any) => fn,
};

export const ai = stubAI;
