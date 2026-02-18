'use server';

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

  const { error } = await supabaseAdmin.from('gastos_diarios').insert([values]);

  if (error) {
    console.error('Supabase insert error:', error);
    return { error: `Error al guardar: ${error.message}` };
  }

  revalidatePath('/historical-analysis/operations');
  return { data: "Gasto registrado exitosamente." };
}

export async function updateExpenseAction(id: number, values: TransactionFormValues) {
    const validatedFields = expenseFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Datos de actualización inválidos." };
    }

    if (!supabaseAdmin) {
        return { error: "La conexión con la base de datos (admin) no está disponible." };
    }
    
    const { error } = await supabaseAdmin
        .from('gastos_diarios')
        .update(values)
        .eq('id', id);

    if (error) {
        console.error('Supabase update error:', error);
        return { error: `Error al actualizar: ${error.message}` };
    }

    revalidatePath('/historical-analysis/operations');
    return { data: "Registro actualizado exitosamente." };
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
        return { error: `Error al eliminar: ${error.message}` };
    }
    
    revalidatePath('/historical-analysis/operations');
    return { data: "Registro eliminado exitosamente." };
}
