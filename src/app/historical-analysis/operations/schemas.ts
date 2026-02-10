import { z } from 'zod';

export const expenseFormSchema = z.object({
  fecha: z.date(),
  empresa: z.string().min(1),
  tipo_gasto: z.string().min(1),
  monto: z.coerce.number().positive(),
  capturista: z.string().min(1),
});
