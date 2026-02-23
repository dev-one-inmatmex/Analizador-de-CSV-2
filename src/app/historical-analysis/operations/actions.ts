'use server';

import { supabaseAdmin } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import { 
  expenseFormSchema, 
  TransactionFormValues,
  EMPRESAS,
  METODOS_PAGO,
  BANCOS,
  CUENTAS 
} from './schemas';
import { format } from 'date-fns';

/**
 * Prepara los datos para la base de datos, asegurando que no se envíen valores 
 * que violen las restricciones de ENUM de Postgres.
 */
function prepareDataForDB(values: any) {
  const data = { ...values };
  let extraNotes = '';

  // Verificación de Empresa
  if (!EMPRESAS.includes(data.empresa as any)) {
    extraNotes += `[Empresa: ${data.empresa}] `;
    data.empresa = 'OTRA';
  }

  // Verificación de Método de Pago
  if (!METODOS_PAGO.includes(data.metodo_pago as any)) {
    extraNotes += `[Método: ${data.metodo_pago}] `;
    data.metodo_pago = 'OTRO';
  }

  // Verificación de Banco
  if (!BANCOS.includes(data.banco as any)) {
    extraNotes += `[Banco: ${data.banco}] `;
    data.banco = 'OTRO';
  }

  // Verificación de Cuenta
  if (!CUENTAS.includes(data.cuenta as any)) {
    extraNotes += `[Cuenta: ${data.cuenta}] `;
    data.cuenta = 'OTRO';
  }

  if (extraNotes) {
    data.notas = `${extraNotes}${data.notas || ''}`.trim();
  }

  return data;
}

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

  const dbCompatibleData = prepareDataForDB(validatedFields.data);
  const { es_nomina_mixta, especificar_empresa, especificar_metodo_pago, especificar_banco, especificar_cuenta, ...dbFields } = dbCompatibleData;

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

    const dbCompatibleData = prepareDataForDB(validatedFields.data);
    const { es_nomina_mixta, especificar_empresa, especificar_metodo_pago, especificar_banco, especificar_cuenta, ...dbFields } = dbCompatibleData;

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
