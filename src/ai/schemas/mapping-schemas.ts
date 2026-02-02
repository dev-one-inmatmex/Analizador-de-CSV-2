/**
 * @fileOverview This file is no longer used and can be deleted.
 * The new CSV uploader does not use these schemas as AI mapping was removed.
 */
import { z } from 'genkit';

export const MapHeadersInputSchema = z.object({});
export type MapHeadersInput = z.infer<typeof MapHeadersInputSchema>;

export const MapHeadersOutputSchema = z.object({});
export type MapHeadersOutput = z.infer<typeof MapHeadersOutputSchema>;
