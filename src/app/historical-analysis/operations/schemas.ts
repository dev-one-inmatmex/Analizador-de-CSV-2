import { z } from 'zod';

export const transactionTypes = ['gasto', 'compra', 'venta', 'ingreso'] as const;
export const paymentMethods = ['Efectivo', 'Tarjeta', 'Cash', 'Transferencia', 'Otro'] as const;
export const companies = ['DK', 'MTM', 'TAL', 'Otro'] as const;
export const banks = ['BBVA', 'BANAMEX', 'MERCADO PAGO', 'SANTANDER', 'BANORTE', 'OTRO'] as const;
export const accounts = ['TOLEXAL', 'TAL', 'MTM', 'DOMESKA', 'CAJA', 'OTRO'] as const;

export const expenseFormSchema = z.object({
  tipo_transaccion: z.enum(transactionTypes, {
    required_error: "Debe seleccionar un tipo de transacción.",
  }),
  monto: z.coerce
    .number({ invalid_type_error: "El monto debe ser un número." })
    .positive({ message: "El monto debe ser mayor que 0." }),
  categoria: z.string().min(1, { message: "Debe seleccionar una categoría." }),
  subcategoria: z.string().optional().nullable(),
  fecha: z.date({
    required_error: "La fecha es obligatoria.",
  }),
  empresa: z.enum(companies).optional().nullable(),
  metodo_pago: z.enum(paymentMethods, {
    required_error: "Debe seleccionar un método de pago.",
  }),
  metodo_pago_especificar: z.string().optional().nullable(),
  banco: z.enum(banks).optional().nullable(),
  banco_especificar: z.string().optional().nullable(),
  cuenta: z.enum(accounts).optional().nullable(),
  cuenta_especificar: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  notas: z.string().max(280, { message: "Las notas no pueden exceder los 280 caracteres." }).optional().nullable(),
});

export type TransactionFormValues = z.infer<typeof expenseFormSchema>;
