'use server';

import { supabaseAdmin } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import { expenseFormSchema, TransactionFormValues } from './schemas';
import { format } from 'date-fns';

/**
 * Registra un nuevo gasto utilizando privilegios de administrador para bypass de RLS.
 */
export async function addExpenseAction(values: TransactionFormValues) {
  const validatedFields = expenseFormSchema.safeParse(values);

  if (!validatedFields.success) {
    console.error('Validation errors:', validatedFields.error.flatten().fieldErrors);
    return { error: "Datos inválidos. Por favor revisa los campos." };
  }
  
  if (!supabaseAdmin) {
    return { error: "La conexión con la base de datos (admin) no está disponible." };
  }

  // Extraemos solo los campos que existen en la base de datos
  // es_nomina_mixta es un campo del formulario, no de la DB
  const { es_nomina_mixta, ...dbFields } = validatedFields.data;

  const dataToInsert = {
    ...dbFields,
    fecha: format(validatedFields.data.fecha, 'yyyy-MM-dd'),
    monto: Number(validatedFields.data.monto)
  };

  const { error } = await supabaseAdmin.from('gastos_diarios').insert([dataToInsert]);

  if (error) {
    console.error('Supabase insert error:', error);
    return { error: `Error al guardar: ${error.message}` };
  }

  revalidatePath('/historical-analysis/operations');
  return { data: "Gasto registrado exitosamente." };
}

/**
 * Actualiza un registro existente.
 */
export async function updateExpenseAction(id: number, values: TransactionFormValues) {
    const validatedFields = expenseFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Datos de actualización inválidos." };
    }

    if (!supabaseAdmin) {
        return { error: "La conexión con la base de datos (admin) no está disponible." };
    }

    const { es_nomina_mixta, ...dbFields } = validatedFields.data;

    const dataToUpdate = {
        ...dbFields,
        fecha: format(validatedFields.data.fecha, 'yyyy-MM-dd'),
        monto: Number(validatedFields.data.monto)
    };
    
    const { error } = await supabaseAdmin
        .from('gastos_diarios')
        .update(dataToUpdate)
        .eq('id', id);

    if (error) {
        console.error('Supabase update error:', error);
        return { error: `Error al actualizar: ${error.message}` };
    }

    revalidatePath('/historical-analysis/operations');
    return { data: "Registro actualizado exitosamente." };
}

/**
 * Elimina un registro.
 */
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
