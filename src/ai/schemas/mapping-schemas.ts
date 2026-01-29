/**
 * @fileOverview Zod schemas and types for header mapping.
 */

import { z } from 'genkit';

export const MapHeadersInputSchema = z.object({
  csvHeaders: z.array(z.string()).describe('An array of header strings from the CSV file.'),
  dbColumns: z.array(z.string()).describe('An array of column name strings from the database table.'),
});
export type MapHeadersInput = z.infer<typeof MapHeadersInputSchema>;

export const MapHeadersOutputSchema = z.object({
  headerMap: z.record(z.string()).describe('A mapping from CSV headers (keys) to database columns (values). Only include headers that could be confidently mapped.'),
});
export type MapHeadersOutput = z.infer<typeof MapHeadersOutputSchema>;
