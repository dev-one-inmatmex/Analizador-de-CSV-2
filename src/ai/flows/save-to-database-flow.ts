'use server';
/**
 * @fileOverview Flujo de Genkit para guardar datos de una tabla en la base de datos.
 *
 * - saveToDatabase - Una función que toma datos tabulares y los inserta en una tabla de Supabase.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { TableDataSchema } from '@/ai/schemas/csv-schemas';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const SaveToDatabaseInputSchema = z.object({
  targetTable: z.string().describe('El nombre de la tabla de la base de datos de destino.'),
  data: TableDataSchema.describe('Los datos de la tabla para guardar.'),
});
type SaveToDatabaseInput = z.infer<typeof SaveToDatabaseInputSchema>;

const SaveToDatabaseOutputSchema = z.object({
  success: z.boolean().describe('Indica si la operación fue exitosa.'),
  message: z.string().describe('Un mensaje que describe el resultado de la operación.'),
});
type SaveToDatabaseOutput = z.infer<typeof SaveToDatabaseOutputSchema>;

function parseValue(key: string, value: string): any {
    const numericFields = ['id', 'costo', 'tiempo_preparacion', 'producto_madre_id'];
    const booleanFields: string[] = [];

    if (numericFields.includes(key)) {
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }
    if (booleanFields.includes(key)) {
        return value.toLowerCase() === 'true' || value === '1';
    }
    
    // Retorna null para valores explícitamente vacíos, undefined o "null"
    if (value === '' || value === undefined || value.toLowerCase() === 'null') {
      return null;
    }

    return value;
}


const saveToDatabaseFlow = ai.defineFlow(
  {
    name: 'saveToDatabaseFlow',
    inputSchema: SaveToDatabaseInputSchema,
    outputSchema: SaveToDatabaseOutputSchema,
  },
  async ({ targetTable, data }) => {
    if (!isSupabaseConfigured || !supabase) {
        return { success: false, message: 'La configuración de Supabase está incompleta. Por favor, edita el archivo .env con tus credenciales y reinicia el servidor.' };
    }
    
    if (!data.headers || !data.rows) {
      return { success: false, message: 'Datos de tabla inválidos. Faltan encabezados o filas.' };
    }

    const objects = data.rows.map(row => {
      const obj: { [key: string]: any } = {};
      data.headers.forEach((header, i) => {
        if (header) { // Solo procesa si el encabezado no está vacío
            obj[header] = parseValue(header, row[i]);
        }
      });
      return obj;
    });

    if (objects.length === 0) {
      return { success: false, message: 'No hay filas de datos para guardar.' };
    }
    
    try {
        const { error } = await supabase.from(targetTable).insert(objects);

        if (error) {
            console.error('Error de Supabase:', error);
            return { success: false, message: `Error de base de datos: ${error.message}` };
        }

        return { success: true, message: `¡${objects.length} registros guardados exitosamente en la tabla '${targetTable}'!` };
    } catch (e: any) {
        console.error('Error inesperado al guardar en la base de datos:', e);
        return { success: false, message: `Error inesperado: ${e.message}` };
    }
  }
);

export async function saveToDatabase(input: SaveToDatabaseInput): Promise<SaveToDatabaseOutput> {
  return saveToDatabaseFlow(input);
}
