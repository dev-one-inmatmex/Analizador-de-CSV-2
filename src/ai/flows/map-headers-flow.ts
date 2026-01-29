'use server';
/**
 * @fileOverview Genkit flow for mapping CSV headers to database columns.
 * 
 * - mapHeaders - A function that takes CSV headers and DB columns and returns a smart mapping.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MapHeadersInput, MapHeadersInputSchema, MapHeadersOutput, MapHeadersOutputSchema } from '@/ai/schemas/mapping-schemas';

const prompt = ai.definePrompt({
    name: 'mapHeadersPrompt',
    input: { schema: MapHeadersInputSchema },
    output: { schema: MapHeadersOutputSchema },
    config: {
        // Ensure the model knows we expect a JSON response.
        responseMimeType: "application/json",
    },
    prompt: `
      You are a data mapping expert. Your task is to map headers from a CSV file to the columns of a database table.
      The names might not be identical, but they are often similar or relate to the same concept.
      
      For example, 'Nº de Venta' or '# de venta' in CSV should map to 'numero_venta' in the database.
      'Producto' should map to 'titulo_publicacion'. 'Cliente' should map to 'comprador'.

      Analyze the provided CSV headers and database columns. 
      
      Your response MUST be a JSON object with a single key named "headerMap". 
      The value of "headerMap" should be another object representing the mapping.
      In this mapping object, the keys should be the original CSV headers, and the values should be the corresponding database column names.

      **Only include headers in the final mapping object if you are confident about the match.** Do not guess for headers that have no clear equivalent. Do not include unmapped headers in the output object.
      Do not add any introductory text or explanations, just the JSON object.

      CSV Headers:
      {{#each csvHeaders}}
      - {{this}}
      {{/each}}

      Database Columns:
      {{#each dbColumns}}
      - {{this}}
      {{/each}}
    `,
});

const mapHeadersFlow = ai.defineFlow(
  {
    name: 'mapHeadersFlow',
    inputSchema: MapHeadersInputSchema,
    outputSchema: MapHeadersOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        // If the model returns nothing, provide a default empty map.
        return { headerMap: {} };
    }
    return output;
  }
);

export async function mapHeaders(input: MapHeadersInput): Promise<MapHeadersOutput> {
    return mapHeadersFlow(input);
}
