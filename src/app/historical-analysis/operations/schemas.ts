import { z } from 'zod';

export const paymentMethods = ['Efectivo', 'Tarjeta', 'Transferencia', 'Otro'] as const;
export const expenseCategories = ['Comida', 'Transporte', 'Insumos', 'Servicios', 'Marketing', 'Renta', 'Sueldos', 'Otro'] as const;

export const expenseFormSchema = z.object({
  fecha: z.date({
    required_error: "La fecha es obligatoria.",
    invalid_type_error: "Debe seleccionar una fecha válida.",
  }),
  empresa: z.string().min(1, { message: "Debe seleccionar una empresa." }),
  tipo_gasto: z.enum(expenseCategories, {
    required_error: "Debe seleccionar una categoría de gasto.",
  }),
  monto: z.coerce
    .number({
      invalid_type_error: "El monto debe ser un número.",
    })
    .positive({ message: "El monto debe ser mayor que 0." }),
  capturista: z.string().min(1, { message: "El nombre del capturista es obligatorio." }),
  // El tipo de pago se puede agregar en el futuro si se añade la columna en la DB
  // tipo_pago: z.enum(paymentMethods, {
  //   required_error: "Debe seleccionar un tipo de pago.",
  // }),
});
