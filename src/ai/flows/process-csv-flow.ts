'use server';
/**
 * @fileOverview Flujo de Genkit para procesar datos de celdas CSV.
 * 
 * - processCsvData - Una función que toma datos de celdas seleccionadas y devuelve un análisis.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ProcessCsvDataInput, ProcessCsvDataInputSchema, ProcessCsvDataOutput, ProcessCsvDataOutputSchema } from '@/ai/schemas/csv-schemas';

const prompt = ai.definePrompt({
    name: 'processCsvPrompt',
    input: { schema: ProcessCsvDataInputSchema },
    output: { schema: ProcessCsvDataOutputSchema },
    config: {
        responseMimeType: "application/json",
    },
    prompt: `
      You are a data analysis assistant. You have been provided with a set of selected data cells from a CSV file.

      Selected cell data:
      {{#each cells}}
      - Cell: {{column}}{{row}}, Header: {{header}}, Value: {{value}}
      {{/each}}

      1.  **Analyze**: Perform a brief analysis or summary based on the provided data. Be concise and to the point.
          - If the data seems to be numerical, calculate simple statistics like average, sum, or count.
          - If the data is textual, identify common themes or patterns.
          - Place this analysis in the 'analysis' field.

      2.  **Format Table**: Reformat the selected data into a table structure.
          - Create a list of unique headers from the selected cells.
          - Create a list of rows, where each row is an array of values corresponding to the headers.
          - If a cell for a specific header is not present in a row, use an empty string as a placeholder.
          - Ensure the order of values in each row matches the order of the headers.
          - Place this structured data in the 'table' field.
    `,
});

const processCsvFlow = ai.defineFlow(
  {
    name: 'processCsvFlow',
    inputSchema: ProcessCsvDataInputSchema,
    outputSchema: ProcessCsvDataOutputSchema,
  },
  async (input) => {
    // Deduplicate cells based on row and column to create a clean set of headers
    const uniqueHeaders = [...new Set(input.cells.map(cell => cell.header))];
    
    // Group cells by row number
    const rowsMap = new Map<number, { [key: string]: string }>();
    input.cells.forEach(cell => {
        if (!rowsMap.has(cell.row)) {
            rowsMap.set(cell.row, {});
        }
        rowsMap.get(cell.row)![cell.header] = cell.value;
    });

    // Create the table structure to send to the prompt
    const { output } = await prompt(input);
    
    if (output) {
      // Ensure the output table has the correct structure, as LLM might miss placeholders.
      const structuredRows = Array.from(rowsMap.values()).map(rowObject => 
          uniqueHeaders.map(header => rowObject[header] || '')
      );
      output.table = {
          headers: uniqueHeaders,
          rows: structuredRows
      };
      return output;
    }

    return {
        analysis: 'No analysis could be performed.',
        table: { headers: [], rows: [] },
    };
  }
);

export async function processCsvData(input: ProcessCsvDataInput): Promise<ProcessCsvDataOutput> {
    return processCsvFlow(input);
}
