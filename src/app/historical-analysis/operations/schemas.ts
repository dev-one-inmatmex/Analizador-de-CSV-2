import { z } from 'zod';

export const transactionTypes = ['gasto', 'ingreso'] as const;
export const paymentMethods = ['Efectivo', 'Tarjeta', 'Cash', 'Otro'] as const;

export const expenseFormSchema = z.object({
  tipo_transaccion: z.enum(transactionTypes, {
    required_error: "Debe seleccionar un tipo de transacción.",
  }),
  monto: z.coerce
    .number({ invalid_type_error: "El monto debe ser un número." })
    .positive({ message: "El monto debe ser mayor que 0." }),
  empresa: z.string().min(1, "La empresa es obligatoria."),
  categoria: z.string().min(1, { message: "Debe seleccionar una categoría." }),
  subcategoria: z.string().optional().nullable(),
  fecha: z.date({
    required_error: "La fecha es obligatoria.",
  }),
  metodo_pago: z.enum(paymentMethods, {
    required_error: "Debe seleccionar un método de pago.",
  }),
  notas: z.string().max(280, { message: "Las notas no pueden exceder los 280 caracteres." }).optional().nullable(),
});

export type TransactionFormValues = z.infer<typeof expenseFormSchema>;
