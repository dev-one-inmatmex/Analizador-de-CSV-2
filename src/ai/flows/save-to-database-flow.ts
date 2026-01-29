'use server';

/**
 * @fileOverview Flujo de Genkit para guardar datos de una tabla en la base de datos.
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
  success: z.boolean(),
  message: z.string(),
});
type SaveToDatabaseOutput = z.infer<typeof SaveToDatabaseOutputSchema>;

/* =========================
   Helpers
========================= */

function parseValue(key: string, value: string): any {
  const numericFields = [
    'id', 'costo', 'tiempo_preparacion', 'producto_madre_id',
    'numero_venta', 'unidades', 'ingreso_productos', 'cargo_venta_impuestos',
    'ingreso_envio', 'costo_envio', 'costo_medidas_peso', 'cargo_diferencia_peso',
    'anulaciones_reembolsos', 'total', 'precio_unitario', 'unidades_envio',
    'dinero_a_favor', 'unidades_reclamo', 'price',
  ];

  const booleanFields = [
    'es_paquete_varios', 'pertenece_kit', 'venta_publicidad', 'negocio',
    'revisado_por_ml', 'reclamo_abierto', 'reclamo_cerrado', 'con_mediacion',
  ];

  const dateFields = [
      'fecha_venta', 'fecha_en_camino', 'fecha_entregado', 'fecha_revision', 'created_at', 'fecha_registro'
  ];

  if (value === undefined || value === null || value.trim() === '' || value.toLowerCase() === 'null') {
    return null;
  }

  if (numericFields.includes(key)) {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  if (booleanFields.includes(key)) {
    const v = value.toLowerCase();
    return v === 'true' || v === '1' || v === 'verdadero';
  }

  if (dateFields.includes(key)) {
    const date = new Date(value);
    // Si la fecha no es válida, es más seguro insertar null que una cadena mal formada.
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  return value;
}

/* =========================
   Flow
========================= */

const saveToDatabaseFlow = ai.defineFlow(
  {
    name: 'saveToDatabaseFlow',
    inputSchema: SaveToDatabaseInputSchema,
    outputSchema: SaveToDatabaseOutputSchema,
  },
  async ({ targetTable, data }) => {
    if (!isSupabaseConfigured || !supabase) {
        return { 
            success: false, 
            message: 'La configuración de Supabase está incompleta. Por favor, edita el archivo .env con tus credenciales y reinicia el servidor.' 
        };
    }

    if (!data.headers || !data.rows) {
      return {
        success: false,
        message: 'Datos de tabla inválidos. Faltan encabezados o filas.',
      };
    }

    const objects = data.rows.map((row) => {
      const obj: Record<string, any> = {};
      data.headers.forEach((header, i) => {
        if (header) {
          obj[header] = parseValue(header, row[i]);
        }
      });
      return obj;
    });

    if (objects.length === 0) {
      return {
        success: false,
        message: 'No hay filas de datos para guardar.',
      };
    }

    const { error } = await supabase.from(targetTable).insert(objects);

    if (error) {
      console.error('❌ Error de Supabase:', error);
      return {
        success: false,
        message: `Error de base de datos: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `✅ ${objects.length} registros guardados en '${targetTable}'.`,
    };
  }
);

/* =========================
   Export
========================= */

export async function saveToDatabase(
  input: SaveToDatabaseInput
): Promise<SaveToDatabaseOutput> {
  return saveToDatabaseFlow(input);
}
