'use server';

/**
 * @fileOverview Flujo de Genkit para guardar datos de una tabla en la base de datos.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { TableDataSchema } from '@/ai/schemas/csv-schemas';
import { supabase } from '@/lib/supabaseClient';

const SaveToDatabaseInputSchema = z.object({
  targetTable: z.string().describe('El nombre de la tabla de la base de datos de destino.'),
  data: TableDataSchema.describe('Los datos de la tabla para guardar.'),
  conflictKey: z.string().optional().describe('La columna a usar para resolver conflictos en un upsert.'),
  newCount: z.number().describe('El número de registros nuevos a insertar.'),
  updateCount: z.number().describe('El número de registros a actualizar.'),
});
type SaveToDatabaseInput = z.infer<typeof SaveToDatabaseInputSchema>;

const SaveToDatabaseOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  processedCount: z.number().optional(),
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
  async ({ targetTable, data, conflictKey, newCount, updateCount }) => {
    
    if (!supabase) {
        return { 
            success: false, 
            message: `Error de Configuración: No se ha configurado la conexión a la base de datos. Asegúrate de que las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY estén definidas en tu archivo .env.`
        };
    }

    if (!data.headers || !data.rows) {
      return { success: false, message: 'Datos de tabla inválidos. Faltan encabezados o filas.' };
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
      return { success: false, message: 'No hay filas de datos para guardar.' };
    }

    const query = supabase.from(targetTable);
    const { error, count } = await (
      conflictKey
      ? query.upsert(objects, { onConflict: conflictKey }).select('*', { count: 'exact', head: false })
      : query.insert(objects).select('*', { count: 'exact', head: false })
    );


    if (error) {
      console.error('❌ Error de Supabase:', error);
      let friendlyMessage = `Error de base de datos: ${error.message}`;

      if (error.message.includes('ON CONFLICT') && conflictKey) {
        friendlyMessage = `Error de Actualización (Upsert): La columna '${conflictKey}' que se usa para identificar actualizaciones no tiene una restricción 'UNIQUE' en la base de datos.\n\nSOLUCIÓN:\n1. Ve a tu panel de Supabase > Table Editor.\n2. Selecciona la tabla '${targetTable}'.\n3. Haz clic en el ícono de engranaje al lado del nombre de la columna '${conflictKey}' y selecciona 'Edit column'.\n4. En la sección 'Advanced', activa la opción 'is Unique' y guarda los cambios.`;
      } else if (error.code === '42501' || error.message.includes('row-level security')) {
        friendlyMessage = `Error de Permisos (RLS): La base de datos bloqueó la escritura. Para permitir que la aplicación guarde datos, debes crear una política de seguridad (RLS) en tu tabla '${targetTable}' en Supabase.\n\nSOLUCIÓN:\n1. Ve a tu panel de Supabase > Authentication > Policies.\n2. Selecciona la tabla '${targetTable}' y haz clic en "New Policy".\n3. Elige la opción "Enable insert/update access for all users" como plantilla y guárdala.`;
      }
      
      return { success: false, message: friendlyMessage };
    }
    
    if ((count ?? 0) < objects.length) {
        const warningMessage = `Se esperaba procesar ${objects.length} registros, pero solo se procesaron ${count ?? 0}. Esto puede deberse a políticas de seguridad a nivel de fila (RLS) que impiden la escritura, o a que los datos no cumplen las restricciones de la tabla (ej. valores únicos, no nulos). Por favor, revisa la configuración de tu tabla '${targetTable}' en Supabase.`;
        return { success: false, message: warningMessage, processedCount: count ?? 0 };
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('es-MX')} a las ${now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
    
    const messages = [];
    if (newCount > 0) messages.push(`${newCount} registro${newCount > 1 ? 's' : ''} nuevo${newCount > 1 ? 's' : ''}`);
    if (updateCount > 0) messages.push(`${updateCount} registro${updateCount > 1 ? 's' : ''} actualizado${updateCount > 1 ? 's' : ''}`);

    let summary = messages.join(' y ');
    if (summary) {
        summary = `Resumen: ${summary.charAt(0).toUpperCase() + summary.slice(1)}.`;
    }

    return {
      success: true,
      message: `Sincronización completada el ${formattedDate}. ${summary}`,
      processedCount: count ?? 0,
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
