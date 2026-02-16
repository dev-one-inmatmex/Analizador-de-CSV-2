import { z } from 'zod';

export const expenseFormSchema = z.object({
  fecha: z.date({
    required_error: "La fecha es obligatoria.",
    invalid_type_error: "Debe seleccionar una fecha válida.",
  }),
  empresa: z.string().min(1, { message: "Debe seleccionar una empresa." }),
  tipo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia'], {
    required_error: "Debe seleccionar un tipo de pago.",
  }),
  monto: z.coerce
    .number({
      invalid_type_error: "El monto debe ser un número.",
    })
    .positive({ message: "El monto debe ser mayor que 0." }),
  capturista: z.string().min(1, { message: "El nombre del capturista es obligatorio." }),
});
