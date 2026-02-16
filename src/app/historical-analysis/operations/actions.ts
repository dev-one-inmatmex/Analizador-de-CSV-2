'use server';

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import { expenseFormSchema } from './schemas';

export async function addExpenseAction(values: z.infer<typeof expenseFormSchema>) {
  const validatedFields = expenseFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Datos inválidos." };
  }
  
  if (!supabaseAdmin) {
    return { error: "La conexión con la base de datos (admin) no está disponible." };
  }

  const { error } = await supabaseAdmin.from('gastos_diarios').insert([validatedFields.data]);

  if (error) {
    console.error('Supabase insert error:', error);
    return { error: `Error al guardar el gasto: ${error.message}` };
  }

  revalidatePath('/historical-analysis/operations', 'page');
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

    const { error } = await supabaseAdmin
        .from('gastos_diarios')
        .update(validatedFields.data)
        .eq('id', id);

    if (error) {
        console.error('Supabase update error:', error);
        return { error: `Error al actualizar el gasto: ${error.message}` };
    }

    revalidatePath('/historical-analysis/operations', 'page');
    return { data: "Gasto actualizado exitosamente." };
}

export async function deleteExpenseAction(id: number) {
    if (!supabaseAdmin) {
        return { error: "La conexión con la base de datos (admin) no está disponible." };
    }

    const { error } = await supabaseAdmin
        .from('gastos_diarios')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Supabase delete error:', error);
        return { error: `Error al eliminar el gasto: ${error.message}` };
    }
    
    revalidatePath('/historical-analysis/operations', 'page');
    return { data: "Gasto eliminado exitosamente." };
}
