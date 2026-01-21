/**
 * @fileOverview Esquemas y tipos de Zod para el procesamiento de CSV.
 * 
 * - ProcessCsvDataInputSchema - El esquema para la entrada de la función processCsvData.
 * - ProcessCsvDataInput - El tipo para la entrada de la función processCsvData.
 * - ProcessCsvDataOutputSchema - El esquema para la salida de la función processCsvData.
 * - ProcessCsvDataOutput - El tipo para la salida de la función processCsvData.
 * - TableDataSchema - El esquema para los datos de la tabla.
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


export const TableDataSchema = z.object({
    headers: z.array(z.string()).describe('Los encabezados de la tabla.'),
    rows: z.array(z.array(z.string())).describe('Las filas de datos de la tabla, que coinciden con los encabezados.'),
});

export const ProcessCsvDataOutputSchema = z.object({
    analysis: z.string().describe('Un breve análisis o resumen de los datos seleccionados.'),
    table: TableDataSchema.describe('Los datos seleccionados formateados como una tabla.')
});
export type ProcessCsvDataOutput = z.infer<typeof ProcessCsvDataOutputSchema>;
