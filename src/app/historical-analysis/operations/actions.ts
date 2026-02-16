'use server';

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { expenseFormSchema } from './schemas';

export async function addExpenseAction(values: z.infer<typeof expenseFormSchema>) {
  const validatedFields = expenseFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Datos inválidos." };
  }
  
  if (!supabaseAdmin) {
    return { error: "La conexión con la base de datos (admin) no está disponible." };
  }

  const { fecha, empresa, tipo_pago, monto, capturista } = validatedFields.data;

  const { error } = await supabaseAdmin.from('gastos_diarios').insert([
    { 
        fecha: format(fecha, 'yyyy-MM-dd'),
        empresa,
        tipo_gasto: tipo_pago,
        monto,
        capturista,
    }
  ]);

  if (error) {
    console.error('Supabase insert error:', error);
    return { error: `Error al guardar el gasto: ${error.message}` };
  }

  revalidatePath('/historical-analysis/operations');
  return { data: "Gasto añadido exitosamente." };
}

export async function updateExpenseAction(id: number, values: z.infer<typeof expenseFormSchema>) {
    const validatedFields = expenseFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Datos de actualización inválidos." };
    }

    if (!supabaseAdmin) {
        return { error: "La conexión con la base de datos (admin) no está disponible." };
    }

    const { tipo_pago, ...restOfData } = validatedFields.data;

    const { error } = await supabaseAdmin
        .from('gastos_diarios')
        .update({ 
            ...restOfData,
            tipo_gasto: tipo_pago,
            fecha: format(validatedFields.data.fecha, 'yyyy-MM-dd'),
        })
        .eq('id', id);

    if (error) {
        console.error('Supabase update error:', error);
        return { error: `Error al actualizar el gasto: ${error.message}` };
    }

    revalidatePath('/historical-analysis/operations');
    return { data: "Gasto actualizado exitosamente." };
}
