'use server';

/**
 * @fileOverview Flujo de Genkit para guardar datos de una tabla en la base de datos.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { TableDataSchema } from '@/ai/schemas/csv-schemas';
import { supabaseAdmin } from '@/lib/supabaseClient';

const SaveToDatabaseInputSchema = z.object({
  targetTable: z.string().describe('El nombre de la tabla de la base de datos de destino.'),
  data: TableDataSchema.describe('Los datos de la tabla para guardar.'),
  conflictKey: z.string().optional().describe('La columna a usar para resolver conflictos en un upsert.'),
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
      'fecha_venta', 'fecha_en_camino', 'fecha_entregado', 'fecha_revision', 'created_at', 'fecha_registro',
    ];

    if (value === undefined || value === null || value.trim() === '' || value.toLowerCase() === 'null') {
      return null;
    }
  
    if (numericFields.includes(key)) {
      const num = parseFloat(value.replace(',', '.')); // Handle decimal commas
      return isNaN(num) ? null : num;
    }
  
    if (booleanFields.includes(key)) {
      const v = value.toLowerCase();
      return v === 'true' || v === '1' || v === 'verdadero' || v === 'si' || v === 'sí';
    }
  
    if (dateFields.includes(key)) {
      const date = new Date(value);
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
  async ({ targetTable, data, conflictKey }) => {
    if (!supabaseAdmin) {
        return { 
            success: false, 
            message: 'La llave de administrador de Supabase (Service Role Key) no está configurada. Por favor, edita el archivo .env con tu SUPABASE_SERVICE_ROLE_KEY y reinicia el servidor.' 
        };
    }

    if (process.env.SUPABASE_SERVICE_ROLE_KEY === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return {
            success: false,
            message: 'Error de configuración: La llave de administrador (SUPABASE_SERVICE_ROLE_KEY) es igual a la llave pública (NEXT_PUBLIC_SUPABASE_ANON_KEY). Debes usar la llave "service_role" para poder escribir en la base de datos.'
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

    const query = supabaseAdmin.from(targetTable);
    const { error } = await (
      conflictKey
      ? query.upsert(objects, { onConflict: conflictKey })
      : query.insert(objects)
    );

    if (error) {
      console.error('❌ Error de Supabase:', error);
      
      let userFriendlyMessage = `Error de base de datos: ${error.message}`;
      if (error.message.includes('row-level security')) {
          userFriendlyMessage = 'Error de Permisos (RLS): La base de datos denegó la operación. Esto usualmente significa que la "SUPABASE_SERVICE_ROLE_KEY" en tu archivo .env es incorrecta, está ausente, o estás usando la llave pública "anon" en su lugar. Por favor, asegúrate de usar la llave "service_role" correcta y reinicia el servidor.';
      }

      return {
        success: false,
        message: userFriendlyMessage,
      };
    }

    return {
      success: true,
      message: `✅ ${objects.length} registros ${conflictKey ? 'sincronizados' : 'guardados'} en '${targetTable}'.`,
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
