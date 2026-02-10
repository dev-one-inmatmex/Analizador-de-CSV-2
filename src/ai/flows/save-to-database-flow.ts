'use server';

/**
 * @fileOverview
 * Flujo de Genkit para guardar datos de una tabla en la base de datos,
 * procesando registro por registro para una mayor tolerancia a fallos.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { TableDataSchema } from '@/ai/schemas/csv-schemas';
import { supabaseAdmin } from '@/lib/supabaseClient';

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
    'dinero_a_favor',
  ];

  const booleanFields = [
    'es_paquete_varios',
    'pertenece_kit',
    'venta_publicidad',
    'negocio',
    'revisado_por_ml',
    'reclamo_abierto',
    'reclamo_cerrado',
    'con_mediacion'
  ];

  const dateFields = [
    'fecha_venta',
    'fecha_en_camino',
    'fecha_entregado',
    'created_at',
    'fecha_registro',
    'fecha_en_camino_envio',
    'fecha_entregado_envio',
    'fecha_revision'
  ];

  // IDs siempre como string
  if (
    ['sku', 'item_id', 'numero_venta'].includes(key)
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
    if (!supabaseAdmin) {
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
      const query = supabaseAdmin.from(targetTable);
      const { error } = conflictKey
        ? await query.upsert([record] as any, { onConflict: conflictKey })
        : await query.insert([record] as any);

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
