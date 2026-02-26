'use server';
/**
 * @fileOverview AI flow to generate personalized portfolio insights.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PortfolioInsightInputSchema = z.object({
  assets: z.array(z.object({
    symbol: z.string(),
    assetType: z.string(),
    quantity: z.number(),
    averageCost: z.number(),
  })),
  userName: z.string(),
});
export type PortfolioInsightInput = z.infer<typeof PortfolioInsightInputSchema>;

const PortfolioInsightOutputSchema = z.object({
  summary: z.string().describe('A brief summary of the portfolio performance and diversification.'),
  recommendation: z.string().describe('A professional financial recommendation based on the assets.'),
  riskLevel: z.enum(['Low', 'Medium', 'High']).describe('The calculated risk level of the portfolio.'),
});
export type PortfolioInsightOutput = z.infer<typeof PortfolioInsightOutputSchema>;

export async function generatePortfolioInsight(input: PortfolioInsightInput): Promise<PortfolioInsightOutput> {
  return portfolioInsightFlow(input);
}

const prompt = ai.definePrompt({
  name: 'portfolioInsightPrompt',
  input: { schema: PortfolioInsightInputSchema },
  output: { schema: PortfolioInsightOutputSchema },
  prompt: `You are a professional financial AI advisor for AscendFolio. Analyze the portfolio for {{userName}}.
  
  Current Assets:
  {{#each assets}}
  - {{symbol}} ({{assetType}}): {{quantity}} units with an average cost of ${{averageCost}}
  {{/each}}

  Based on these holdings, provide:
  1. A sophisticated summary of their diversification.
  2. A strategic recommendation for future growth.
  3. An assessment of their overall portfolio risk level (Low, Medium, or High).
  
  Keep the tone professional, encouraging, and stable.`,
});

const portfolioInsightFlow = ai.defineFlow(
  {
    name: 'portfolioInsightFlow',
    inputSchema: PortfolioInsightInputSchema,
    outputSchema: PortfolioInsightOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('Failed to generate insight');
    return output;
  }
);
