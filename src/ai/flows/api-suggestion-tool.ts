'use server';

/**
 * @fileOverview A tool that suggests API parameters, request formats, and security measures for new API integrations.
 *
 * - generateApiSuggestion - A function that generates API suggestions based on existing API configurations.
 * - ApiSuggestionInput - The input type for the generateApiSuggestion function.
 * - ApiSuggestionOutput - The return type for the generateApiSuggestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ApiSuggestionInputSchema = z.object({
  existingApiConfigurations: z
    .string()
    .describe('A description of existing API configurations.'),
  newApiDescription: z
    .string()
    .describe('A description of the new API integration needed.'),
});
export type ApiSuggestionInput = z.infer<typeof ApiSuggestionInputSchema>;

const ApiSuggestionOutputSchema = z.object({
  suggestedParameters: z
    .string()
    .describe('Suggested parameters for the new API integration.'),
  suggestedRequestFormat: z
    .string()
    .describe('Suggested request format for the new API integration.'),
  suggestedSecurityMeasures: z
    .string()
    .describe('Suggested security measures for the new API integration.'),
});
export type ApiSuggestionOutput = z.infer<typeof ApiSuggestionOutputSchema>;

export async function generateApiSuggestion(
  input: ApiSuggestionInput
): Promise<ApiSuggestionOutput> {
  return apiSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'apiSuggestionPrompt',
  input: {schema: ApiSuggestionInputSchema},
  output: {schema: ApiSuggestionOutputSchema},
  prompt: `You are an expert API integration specialist.

  Based on the existing API configurations and the description of the new API integration, suggest parameters, request format, and security measures.

  Existing API Configurations:
  {{existingApiConfigurations}}

  New API Description:
  {{newApiDescription}}

  Consider the following when generating your suggestions:
  - Parameters: What parameters are needed for the new API integration?
  - Request Format: What is the suggested request format for the new API integration (e.g., JSON, XML)?
  - Security Measures: What security measures should be implemented for the new API integration (e.g., authentication, authorization)?

  Your suggestions should be detailed and specific.

  Output the result in JSON format.
  `,
});

const apiSuggestionFlow = ai.defineFlow(
  {
    name: 'apiSuggestionFlow',
    inputSchema: ApiSuggestionInputSchema,
    outputSchema: ApiSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
