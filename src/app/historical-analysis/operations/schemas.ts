import { z } from 'zod';
import { 
  Empresa, 
  TipoTransaccion, 
  TipoGastoImpacto, 
  AreaFuncional, 
  CanalAsociado, 
  ClasificacionOperativa, 
  CategoriaMacro, 
  MetodoPago, 
  Banco, 
  Cuenta 
} from '@/types/database';

export const EMPRESAS: Empresa[] = ['MTM', 'TAL', 'DOMESKA', 'OTRA'];
export const TIPOS_TRANSACCION: TipoTransaccion[] = ['INGRESO', 'GASTO', 'TRANSFERENCIA', 'AJUSTE'];
export const IMPACTOS_FINANCIEROS: TipoGastoImpacto[] = [
  'COSTO_MERCANCIA_COGS', 'GASTO_OPERATIVO', 'GASTO_ADMINISTRATIVO', 
  'GASTO_COMERCIAL', 'GASTO_LOGISTICO', 'GASTO_FINANCIERO', 
  'NOMINA', 'INVERSION_CAPEX', 'IMPUESTOS'
];
export const AREAS_FUNCIONALES: AreaFuncional[] = [
  'VENTAS_ECOMMERCE', 'VENTAS_MAYOREO', 'LOGISTICA', 'COMPRAS', 
  'ADMINISTRACION', 'MARKETING', 'DIRECCION', 'PRODUCCION', 
  'SISTEMAS', 'RECURSOS_HUMANOS'
];
export const CANALES_ASOCIADOS: CanalAsociado[] = [
  'MERCADO_LIBRE', 'SHOPIFY', 'MAYOREO', 'FISICO', 
  'PRODUCCION_MALLA_SOMBRA', 'GENERAL'
];
export const CLASIFICACIONES_OPERATIVAS: ClasificacionOperativa[] = ['DIRECTO', 'SEMI_DIRECTO', 'COMPARTIDO'];
export const CATEGORIAS_MACRO: CategoriaMacro[] = ['OPERATIVO', 'COMERCIAL', 'ADMINISTRATIVO', 'FINANCIERO', 'NOMINA'];
export const METODOS_PAGO: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'PAYPAL', 'OTRO'];
export const BANCOS: Banco[] = ['BBVA', 'SANTANDER', 'BANAMEX', 'MERCADO_PAGO', 'OTRO'];
export const CUENTAS: Cuenta[] = ['OPERATIVA', 'FISCAL', 'CAJA_CHICA', 'OTRO'];

export const expenseFormSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  empresa: z.enum(['MTM', 'TAL', 'DOMESKA', 'OTRA'], { required_error: "Seleccione una empresa." }),
  tipo_transaccion: z.enum(['INGRESO', 'GASTO', 'TRANSFERENCIA', 'AJUSTE'], { required_error: "Seleccione tipo de transacción." }),
  tipo_gasto_impacto: z.string().nullable().optional(),
  area_funcional: z.string().nullable().optional(),
  categoria_macro: z.enum(['OPERATIVO', 'COMERCIAL', 'ADMINISTRATIVO', 'FINANCIERO', 'NOMINA'], { required_error: "Seleccione categoría macro." }),
  subcategoria_especifica: z.string().min(1, "La subcategoría es obligatoria."),
  canal_asociado: z.enum(['MERCADO_LIBRE', 'SHOPIFY', 'MAYOREO', 'FISICO', 'PRODUCCION_MALLA_SOMBRA', 'GENERAL'], { required_error: "Seleccione canal asociado." }),
  clasificacion_operativa: z.enum(['DIRECTO', 'SEMI_DIRECTO', 'COMPARTIDO']).nullable().optional(),
  es_fijo: z.boolean().default(false),
  es_recurrente: z.boolean().default(false),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  metodo_pago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'PAYPAL', 'OTRO'], { required_error: "Seleccione método de pago." }),
  metodo_pago_especificar: z.string().nullable().optional(),
  banco: z.enum(['BBVA', 'SANTANDER', 'BANAMEX', 'MERCADO_PAGO', 'OTRO'], { required_error: "Seleccione banco." }),
  banco_especificar: z.string().nullable().optional(),
  cuenta: z.enum(['OPERATIVA', 'FISCAL', 'CAJA_CHICA', 'OTRO'], { required_error: "Seleccione cuenta." }),
  cuenta_especificar: z.string().nullable().optional(),
  responsable: z.string().nullable().optional(),
  descripcion: z.string().nullable().optional(),
  notas: z.string().max(280, "Máximo 280 caracteres.").nullable().optional(),
});

export type TransactionFormValues = z.infer<typeof expenseFormSchema>;
