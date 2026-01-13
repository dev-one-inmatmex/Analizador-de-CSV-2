/**
 * @fileOverview Esquemas y tipos de Zod para el procesamiento de CSV.
 * 
 * - ProcessCsvDataInputSchema - El esquema para la entrada de la función processCsvData.
 * - ProcessCsvDataInput - El tipo para la entrada de la función processCsvData.
 */

import { z } from 'genkit';

const CellDataSchema = z.object({
  header: z.string().describe('El encabezado de la columna de la celda.'),
  value: z.string().describe('El valor de la celda.'),
  row: z.number().describe('El número de fila de la celda (basado en 1).'),
  column: z.string().describe('La letra de la columna de la celda (ej. A, B, C).'),
});

export const ProcessCsvDataInputSchema = z.object({
  cells: z.array(CellDataSchema).describe('Un array de los datos de las celdas seleccionadas.'),
});
export type ProcessCsvDataInput = z.infer<typeof ProcessCsvDataInputSchema>;
