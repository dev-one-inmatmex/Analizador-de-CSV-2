import { z } from 'zod';

export const IMPACTO_FINANCIERO = [
  'Costo de mercancía (COGS)', 'Gasto Operativo', 'Gasto Administrativo', 
  'Gasto Comercial', 'Gasto Logístico', 'Gasto Financiero', 
  'Nómina', 'Inversión (CAPEX)', 'Impuestos'
] as const;

export const AREA_FUNCIONAL = [
  'Ventas Ecommerce', 'Ventas Mayoreo', 'Logística', 'Compras', 
  'Administración', 'Marketing', 'Dirección', 'Producción', 
  'Sistemas', 'Recursos Humanos'
] as const;

export const CANAL_VENTA = [
  'Mercado Libre', 'Shopify', 'Mayoreo', 'Físico', 
  'Producción malla sombra', 'General'
] as const;

export const CLASIFICACION_OPERATIVA = ['Directo', 'Semi-directo', 'Compartido'] as const;

export const EMPRESAS = ['INMATMEX', 'COMERTAL', 'DK', 'MTM', 'TAL', 'Otro'] as const;

export const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia', 'OTRO'] as const;

export const BANCOS = ['BBVA', 'BANAMEX', 'MERCADO PAGO', 'SANTANDER', 'BANORTE', 'OTRO'] as const;

export const CUENTAS = ['FISCAL', 'NO FISCAL', 'CAJA CHICA', 'OTRO'] as const;

export const expenseFormSchema = z.object({
  fecha: z.date({
    required_error: "La fecha es obligatoria.",
  }),
  empresa: z.enum(EMPRESAS, {
    required_error: "Debe seleccionar una empresa.",
  }),
  tipo_gasto: z.enum(IMPACTO_FINANCIERO, {
    required_error: "Debe seleccionar el impacto financiero.",
  }),
  area_funcional: z.enum(AREA_FUNCIONAL, {
    required_error: "Debe seleccionar el área funcional.",
  }),
  categoria_especifica: z.string().min(1, "La categoría específica es obligatoria."),
  canal_asociado: z.enum(CANAL_VENTA, {
    required_error: "Debe seleccionar el canal asociado.",
  }),
  clasificacion_operativa: z.enum(CLASIFICACION_OPERATIVA, {
    required_error: "Debe seleccionar la clasificación operativa.",
  }),
  es_fijo: z.boolean().default(false),
  es_recurrente: z.boolean().default(false),
  monto: z.coerce
    .number({ invalid_type_error: "El monto debe ser un número." })
    .positive({ message: "El monto debe ser mayor que 0." }),
  metodo_pago: z.enum(METODOS_PAGO, {
    required_error: "Debe seleccionar un método de pago.",
  }),
  metodo_pago_especificar: z.string().optional().nullable(),
  banco: z.enum(BANCOS).optional().nullable(),
  banco_especificar: z.string().optional().nullable(),
  cuenta: z.enum(CUENTAS).optional().nullable(),
  cuenta_especificar: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  notas: z.string().max(280, "Máximo 280 caracteres.").optional().nullable(),
});

export type TransactionFormValues = z.infer<typeof expenseFormSchema>;
