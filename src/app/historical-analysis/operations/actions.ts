'use server';

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';

const expenseFormSchema = z.object({
  fecha: z.date(),
  empresa: z.string().min(1),
  tipo_gasto: z.string().min(1),
  monto: z.coerce.number().positive(),
  capturista: z.string().min(1),
});

export async function addExpenseAction(values: z.infer<typeof expenseFormSchema>) {
  const validatedFields = expenseFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: "Datos inválidos.",
    };
  }
  
  if (!supabaseAdmin) {
    return {
      error: "La conexión con la base de datos (admin) no está disponible. Revisa la configuración del servidor.",
    };
  }

  const { fecha, empresa, tipo_gasto, monto, capturista } = validatedFields.data;

  const { error } = await supabaseAdmin.from('gastos_diarios').insert([
    { 
        fecha: format(fecha, 'yyyy-MM-dd'),
        empresa,
        tipo_gasto,
        monto,
        capturista,
    }
  ]);

  if (error) {
    console.error('Supabase insert error:', error);
    return {
      error: `Error al guardar el gasto: ${error.message}`,
    };
  }

  revalidatePath('/historical-analysis/operations');

  return {
    data: "Gasto añadido exitosamente.",
  };
}
