'use server';

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import { expenseFormSchema, TransactionFormValues } from './schemas';

export async function addExpenseAction(values: TransactionFormValues) {
  const validatedFields = expenseFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Datos inválidos." };
  }
  
  if (!supabaseAdmin) {
    return { error: "La conexión con la base de datos (admin) no está disponible." };
  }

  // Form values map directly to the database schema
  const dbData = validatedFields.data;

  const { error } = await supabaseAdmin.from('finanzas').insert([dbData]);

  if (error) {
    console.error('Supabase insert error:', error);
    return { error: `Error al guardar la transacción: ${error.message}` };
  }

  revalidatePath('/historical-analysis/operations', 'page');
  return { data: "Transacción añadida exitosamente." };
}

export async function updateExpenseAction(id: number, values: TransactionFormValues) {
    const validatedFields = expenseFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Datos de actualización inválidos." };
    }

    if (!supabaseAdmin) {
        return { error: "La conexión con la base de datos (admin) no está disponible." };
    }
    
    const dbData = validatedFields.data;

    const { error } = await supabaseAdmin
        .from('finanzas')
        .update(dbData)
        .eq('id', id);

    if (error) {
        console.error('Supabase update error:', error);
        return { error: `Error al actualizar la transacción: ${error.message}` };
    }

    revalidatePath('/historical-analysis/operations', 'page');
    return { data: "Transacción actualizada exitosamente." };
}

export async function deleteExpenseAction(id: number) {
    if (!supabaseAdmin) {
        return { error: "La conexión con la base de datos (admin) no está disponible." };
    }

    const { error } = await supabaseAdmin
        .from('finanzas')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Supabase delete error:', error);
        return { error: `Error al eliminar la transacción: ${error.message}` };
    }
    
    revalidatePath('/historical-analysis/operations', 'page');
    return { data: "Transacción eliminada exitosamente." };
}
