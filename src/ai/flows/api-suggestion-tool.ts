
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
    .describe('A description of existing API configurations, including endpoints, auth methods, and body/response formats.'),
  newApiDescription: z
    .string()
    .describe('A detailed description of the new API integration needed, including the service it provides.'),
});
export type ApiSuggestionInput = z.infer<typeof ApiSuggestionInputSchema>;

const ApiSuggestionOutputSchema = z.object({
  suggestedParameters: z
    .string()
    .describe('Bulleted list of suggested API parameters with brief explanations. (e.g., "- amount: The value of the transaction."). Format as a simple string, not markdown.'),
  suggestedRequestFormat: z
    .string()
    .describe('A JSON object representing the suggested request body format. Provide a clear, well-structured example.'),
  suggestedSecurityMeasures: z
    .string()
    .describe('Bulleted list of suggested security measures. (e.g., "- Use HMAC signatures to verify request integrity."). Format as a simple string, not markdown.'),
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
  prompt: `You are an expert API integration specialist for a Nigerian FinTech company.

  Based on the provided existing API configurations and the description of the new API to be integrated, provide detailed suggestions. Your suggestions should be practical, follow industry best practices, and be tailored to the Nigerian context where applicable.

  Existing API Configurations for context:
  {{existingApiConfigurations}}

  New API Description:
  {{newApiDescription}}

  Generate the following suggestions:

  1.  **Suggested Parameters**:
      - Identify all necessary parameters for the new API endpoint.
      - For each parameter, provide a brief, clear explanation of its purpose.
      - Format this as a simple bulleted list string.

  2.  **Suggested Request Format**:
      - Propose a clear and logical JSON structure for the API request body.
      - Include example values that make sense for the described service (e.g., a valid Nigerian phone number for an airtime API).
      - Ensure the JSON is well-formatted.

  3.  **Suggested Security Measures**:
      - Recommend at least two security measures appropriate for this type of API.
      - Examples include: API Key in header, Bearer Token, Basic Auth, IP Whitelisting, HMAC Signatures.
      - Explain why each measure is recommended.
      - Format this as a simple bulleted list string.

  Return your entire output as a single, valid JSON object matching the output schema.
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
