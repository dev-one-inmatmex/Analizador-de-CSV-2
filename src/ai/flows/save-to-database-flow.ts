// 'use server';

// /**
//  * @fileOverview Flujo de Genkit para guardar datos de una tabla en la base de datos, procesando registro por registro para una mayor tolerancia a fallos.
//  */

// import { ai } from '@/ai/genkit';
// import { z } from 'zod';
// import { TableDataSchema } from '@/ai/schemas/csv-schemas';
// import { supabaseAdmin } from '@/lib/supabaseClient'; // Use the admin client for writes

// const SaveToDatabaseInputSchema = z.object({
//   targetTable: z.string().describe('El nombre de la tabla de la base de datos de destino.'),
//   data: TableDataSchema.describe('Los datos de la tabla para guardar.'),
//   conflictKey: z.string().optional().describe('La columna a usar para resolver conflictos en un upsert.'),
// });
// type SaveToDatabaseInput = z.infer<typeof SaveToDatabaseInputSchema>;

// const RowErrorSchema = z.object({
//     recordIdentifier: z.string().describe('El identificador del registro que falló (usando la clave primaria).'),
//     message: z.string().describe('El mensaje de error específico para este registro.'),
// });

// const SaveToDatabaseOutputSchema = z.object({
//   success: z.boolean(),
//   message: z.string(),
//   processedCount: z.number().describe('Número de registros procesados exitosamente en el bloque.'),
//   errorCount: z.number().describe('Número de registros que fallaron en el bloque.'),
//   errors: z.array(RowErrorSchema).optional().describe('Un array de los errores encontrados.'),
//   successfulRecords: z.array(z.any()).optional().describe('Un array de los registros procesados exitosamente.'),
// });
// type SaveToDatabaseOutput = z.infer<typeof SaveToDatabaseOutputSchema>;

// /* =========================
//    Helpers
// ========================= */

// function parseValue(key: string, value: string): any {
//     const numericFields = [
//       'costo', 'tiempo_preparacion', 'unidades', 
//       'ingreso_productos', 'cargo_venta_impuestos', 'ingreso_envio', 'costo_envio', 
//       'costo_medidas_peso', 'cargo_diferencia_peso', 'anulaciones_reembolsos', 'total', 
//       'precio_unitario', 'unidades_envio', 'dinero_a_favor', 'unidades_reclamo', 'price',
//       'landed_cost', 'piezas_por_sku', 'tiempo_produccion', 'publicaciones', 'tiempo_recompra'
//     ];
  
//     const booleanFields = [
//       'es_paquete_varios', 'pertenece_kit', 'venta_publicidad', 'negocio',
//       'revisado_por_ml', 'reclamo_abierto', 'reclamo_cerrado', 'con_mediacion',
//     ];
  
//     const dateFields = [
//       'fecha_venta', 'fecha_en_camino', 'fecha_entregado', 'fecha_revision', 'created_at', 'fecha_registro',
//     ];

//     if (value === undefined || value === null || value.trim() === '' || value.toLowerCase() === 'null') {
//       return null;
//     }
  
//     // Keep text-based IDs as strings
//     if (key === 'numero_venta' || key === 'sku' || key === 'item_id' || key === 'product_number' || key === 'variation_id' || key === 'publicacion_id') {
//       return value.trim();
//     }
    
//     if (numericFields.includes(key)) {
//       const num = parseFloat(value.replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
//       return isNaN(num) ? null : num;
//     }
  
//     if (booleanFields.includes(key)) {
//       const v = value.toLowerCase();
//       return v === 'true' || v === '1' || v === 'verdadero' || v === 'si' || v === 'sí';
//     }
  
//     if (dateFields.includes(key)) {
//       const date = new Date(value);
//       return isNaN(date.getTime()) ? null : date.toISOString();
//     }
  
//     return value;
// }


// function formatSupabaseError(error: any, targetTable: string, conflictKey?: string): string {
//   console.error('❌ Error de Supabase:', error);
//   let friendlyMessage = `Error de base de datos: ${error.message}`;

//   if (error.code === '42501' || error.message.includes('new row violates row-level security policy')) {
//     const operation = conflictKey ? 'INSERT o UPDATE' : 'INSERT';
//     friendlyMessage = `Error de Permisos (RLS): La base de datos rechazó la operación de escritura. Para permitir que la aplicación guarde datos, debes crear una política de Seguridad a Nivel de Fila (RLS) en Supabase para la tabla '${targetTable}' que permita la operación '${operation}'.\n\nACCIÓN REQUERIDA:\n1. Ve a tu panel de Supabase > Authentication > Policies.\n2. Selecciona la tabla '${targetTable}' y haz clic en 'New Policy'.\n3. Elige 'Enable ${operation} access to all users'.\n4. Revisa y guarda la política.`;
//   } else if (error.message.includes('duplicate key value violates unique constraint')) {
//     const constraintName = error.message.match(/"([^"]+)"/)?.[1] || 'desconocida';
//     const columnNameMatch = constraintName.match(/_([^_]+)_key$/);
//     const columnName = columnNameMatch ? columnNameMatch[1] : constraintName.replace(`${targetTable}_`, '').replace('_key', '');
    
//     if (conflictKey) {
//         if (columnName === conflictKey) {
//             friendlyMessage = `Conflicto de Clave Primaria: Se intentó insertar un registro con la clave '${columnName}' que ya existe. Esto puede ocurrir si tu archivo CSV tiene filas duplicadas en la columna clave.`;
//         } else {
//             friendlyMessage = `Conflicto de Unicidad: Al actualizar un registro, el valor para la columna '${columnName}' resultó en un duplicado, ya que ese valor ya existe en otra fila de la tabla.`;
//         }
//     } else {
//         friendlyMessage = `Conflicto de Duplicado al Insertar: La columna '${columnName}' requiere un valor único, pero se intentó guardar un valor que ya existe.`;
//     }
//   } else if (error.message.includes('violates not-null constraint')) {
//     const columnName = error.message.match(/column "([^"]+)"/)?.[1];
//     friendlyMessage = `Error de Valor Nulo: La columna '${columnName || 'desconocida'}' no puede estar vacía. Por favor, asegúrate de que todos los registros en tu archivo CSV tengan un valor para esta columna.`;
//   } else if (error.message.includes('ON CONFLICT') && conflictKey) {
//     friendlyMessage = `Error de Actualización (Upsert): La columna '${conflictKey}' que se usa para identificar actualizaciones no tiene una restricción 'UNIQUE' en la base de datos.\n\nSOLUCIÓN:\n1. Ve a tu panel de Supabase > Table Editor.\n2. Selecciona la tabla '${targetTable}'.\n3. Haz clic en el ícono de engranaje al lado de la columna '${conflictKey}' y selecciona 'Edit column'.\n4. En la sección 'Advanced', activa la opción 'is Unique' y guarda los cambios.`;
//   }
  
//   return friendlyMessage;
// }


// /* =========================
//    Flow
// ========================= */

// const saveToDatabaseFlow = ai.defineFlow(
//   {
//     name: 'saveToDatabaseFlow',
//     inputSchema: SaveToDatabaseInputSchema,
//     outputSchema: SaveToDatabaseOutputSchema,
//   },
//   async ({ targetTable, data, conflictKey }) => {
    
//     if (!supabaseAdmin) {
//         return {
//             success: false,
//             message: 'La llave de administrador de Supabase (Service Role Key) no está configurada.',
//             processedCount: 0,
//             errorCount: data.rows.length,
//         };
//     }

//     if (!data.headers || !data.rows) {
//       return { success: false, message: 'Datos de tabla inválidos. Faltan encabezados o filas.', processedCount: 0, errorCount: 0 };
//     }

//     const objects = data.rows.map((row) => {
//       const obj: Record<string, any> = {};
//       data.headers.forEach((header, i) => {
//         if (header) {
//           obj[header] = parseValue(header, row[i]);
//         }
//       });
//       return obj;
//     }).filter(obj => {
//         if(conflictKey) {
//             return obj[conflictKey] !== null && obj[conflictKey] !== undefined && String(obj[conflictKey]).trim() !== '';
//         }
//         return true;
//     });

//     if (objects.length === 0) {
//       return { success: true, message: 'No hay filas válidas para guardar en este bloque.', processedCount: 0, errorCount: 0, successfulRecords: [] };
//     }

//     let processedCount = 0;
//     const errors: z.infer<typeof RowErrorSchema>[] = [];
//     const successfulRecords: any[] = [];

//     for (const object of objects) {
//         const query = supabaseAdmin.from(targetTable);
//         const { error } = await (
//             conflictKey
//             ? query.upsert(object, { onConflict: conflictKey })
//             : query.insert(object)
//         );

//         if (error) {
//             const recordIdentifier = conflictKey ? String(object[conflictKey]) : `Fila del CSV #${data.rows.findIndex(r => objects.indexOf(object) !== -1) + 1}`;
//             const friendlyMessage = formatSupabaseError(error, targetTable, conflictKey);
//             errors.push({ recordIdentifier, message: friendlyMessage });
//         } else {
//             processedCount++;
//             successfulRecords.push(object);
//         }
//     }

//     return {
//       success: errors.length === 0,
//       message: `Bloque procesado: ${processedCount} éxitos, ${errors.length} errores.`,
//       processedCount: processedCount,
//       errorCount: errors.length,
//       errors: errors,
//       successfulRecords: successfulRecords,
//     };
//   }
// );

// /* =========================
//    Export
// ========================= */

// export async function saveToDatabase(
//   input: SaveToDatabaseInput
// ): Promise<SaveToDatabaseOutput> {
//   return saveToDatabaseFlow(input);
// }

'use server';

/**
 * @fileOverview
 * Flujo de Genkit para guardar datos de una tabla en la base de datos,
 * procesando registro por registro para una mayor tolerancia a fallos.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { TableDataSchema } from '@/ai/schemas/csv-schemas';
import { supabase } from '@/lib/supabaseClient';

/* =========================
   Schemas
========================= */

const SaveToDatabaseInputSchema = z.object({
  targetTable: z.string().describe('El nombre de la tabla de la base de datos de destino.'),
  data: TableDataSchema.describe('Los datos de la tabla para guardar.'),
  conflictKey: z
    .string()
    .optional()
    .describe('La columna a usar para resolver conflictos en un upsert.'),
});

type SaveToDatabaseInput = z.infer<typeof SaveToDatabaseInputSchema>;

const RowErrorSchema = z.object({
  recordIdentifier: z.string().describe('Identificador del registro que falló.'),
  message: z.string().describe('Mensaje de error específico del registro.'),
});

const SaveToDatabaseOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  processedCount: z.number(),
  errorCount: z.number(),
  errors: z.array(RowErrorSchema).optional(),
  successfulRecords: z.array(z.any()).optional(),
});

type SaveToDatabaseOutput = z.infer<typeof SaveToDatabaseOutputSchema>;

/* =========================
   Helpers
========================= */

function parseValue(key: string, value: string): any {
  if (value === undefined || value === null || value.trim() === '' || value.toLowerCase() === 'null') {
    return null;
  }

  const numericFields = [
    'costo',
    'tiempo_preparacion',
    'unidades',
    'precio_unitario',
    'total',
    'piezas_por_sku',
    'tiempo_produccion',
    'publicaciones',
    'tiempo_recompra',
  ];

  const booleanFields = [
    'es_paquete_varios',
    'pertenece_kit',
    'venta_publicidad',
    'negocio',
    'revisado_por_ml',
  ];

  const dateFields = [
    'fecha_venta',
    'fecha_en_camino',
    'fecha_entregado',
    'created_at',
    'fecha_registro',
  ];

  // IDs siempre como string
  if (
    ['sku', 'item_id', 'publicacion_id', 'numero_venta', 'variation_id'].includes(key)
  ) {
    return value.trim();
  }

  if (numericFields.includes(key)) {
    const num = parseFloat(value.replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? null : num;
  }

  if (booleanFields.includes(key)) {
    const v = value.toLowerCase();
    return ['true', '1', 'si', 'sí', 'verdadero'].includes(v);
  }

  if (dateFields.includes(key)) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  return value;
}

function formatSupabaseError(error: any, targetTable: string, conflictKey?: string): string {
  console.error('❌ Supabase error:', error);

  if (error.code === '42501') {
    return `Error de permisos (RLS): La tabla '${targetTable}' no permite escritura.`;
  }

  if (error.message?.includes('duplicate key')) {
    return conflictKey
      ? `Conflicto de duplicado en la clave '${conflictKey}'.`
      : `Conflicto de duplicado al insertar el registro.`;
  }

  if (error.message?.includes('not-null')) {
    return `Error: una columna obligatoria viene vacía.`;
  }

  return error.message || 'Error desconocido al guardar el registro.';
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
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase Service Role Key no configurada.',
        processedCount: 0,
        errorCount: data.rows.length,
      };
    }

    if (!data.headers || !data.rows) {
      return {
        success: false,
        message: 'Datos inválidos: faltan encabezados o filas.',
        processedCount: 0,
        errorCount: 0,
      };
    }

    const records = data.rows
      .map((row) => {
        const obj: Record<string, any> = {};
        data.headers.forEach((header, i) => {
          if (header) obj[header] = parseValue(header, row[i]);
        });
        return obj;
      })
      .filter((obj) => {
        if (!conflictKey) return true;
        return obj[conflictKey] !== null && obj[conflictKey] !== undefined && obj[conflictKey] !== '';
      });

    let processedCount = 0;
    const errors: z.infer<typeof RowErrorSchema>[] = [];
    const successfulRecords: any[] = [];

    for (const record of records) {
      const query = supabase.from(targetTable);
      const { error } = conflictKey
        ? await query.upsert(record, { onConflict: conflictKey })
        : await query.insert(record);

      if (error) {
        errors.push({
          recordIdentifier: conflictKey ? String(record[conflictKey]) : 'Fila CSV',
          message: formatSupabaseError(error, targetTable, conflictKey),
        });
      } else {
        processedCount++;
        successfulRecords.push(record);
      }
    }

    return {
      success: errors.length === 0,
      message: `Procesados: ${processedCount}, Errores: ${errors.length}`,
      processedCount,
      errorCount: errors.length,
      errors,
      successfulRecords,
    };
  }
);

/* =========================
   Export público
========================= */

export async function saveToDatabase(
  input: SaveToDatabaseInput
): Promise<SaveToDatabaseOutput> {
  return saveToDatabaseFlow(input);
}
