'use server';
/**
 * @fileOverview Flujo de Genkit para procesar datos de celdas CSV.
 * 
 * - processCsvData - Una función que toma datos de celdas seleccionadas y devuelve un análisis.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ProcessCsvDataInput, ProcessCsvDataInputSchema } from '@/ai/schemas/csv-schemas';

const prompt = ai.definePrompt({
    name: 'processCsvPrompt',
    input: { schema: ProcessCsvDataInputSchema },
    output: { format: 'text' },
    prompt: `
      Eres un asistente de análisis de datos. Se te ha proporcionado un conjunto de celdas de datos seleccionadas de un archivo CSV.

      Datos de las celdas seleccionadas:
      {{#each cells}}
      - Celda: {{column}}{{row}}, Encabezado: {{header}}, Valor: {{value}}
      {{/each}}

      Por favor, realiza un breve análisis o resumen basado en los datos proporcionados. Sé conciso y directo.
      Si los datos parecen ser numéricos, calcula estadísticas simples como el promedio, la suma o el recuento.
      Si los datos son textuales, identifica temas o patrones comunes.
    `,
});

const processCsvFlow = ai.defineFlow(
  {
    name: 'processCsvFlow',
    inputSchema: ProcessCsvDataInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function processCsvData(input: ProcessCsvDataInput): Promise<string> {
    return processCsvFlow(input);
}
