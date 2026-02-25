import { z } from 'zod';
import { 
  Empresa, 
  TipoTransaccion, 
  CanalAsociado, 
  ClasificacionOperativa, 
  MetodoPago, 
  Banco, 
  Cuenta 
} from '@/types/database';

export const EMPRESAS: Empresa[] = ['MTM', 'TAL', 'DOMESKA', 'OTRA'];
export const TIPOS_TRANSACCION: TipoTransaccion[] = ['INGRESO', 'GASTO', 'TRANSFERENCIA', 'AJUSTE', 'COMPRA', 'VENTA'];

export const CANALES_ASOCIADOS: CanalAsociado[] = [
  'MERCADO_LIBRE', 'SHOPIFY', 'MAYOREO', 'FISICO', 
  'PRODUCCION_MALLA_SOMBRA', 'GENERAL'
];

export const CLASIFICACIONES_OPERATIVAS: ClasificacionOperativa[] = ['DIRECTO', 'SEMI_DIRECTO', 'COMPARTIDO'];
export const METODOS_PAGO: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'PAYPAL', 'OTRO'];
export const BANCOS: Banco[] = ['BBVA', 'SANTANDER', 'BANAMEX', 'MERCADO_PAGO', 'OTRO'];
export const CUENTAS: Cuenta[] = ['OPERATIVA', 'FISCAL', 'CAJA_CHICA', 'OTRO'];

export const expenseFormSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  empresa: z.string({ required_error: "Seleccione una empresa." }),
  especificar_empresa: z.string().optional(),
  tipo_transaccion: z.string({ required_error: "Seleccione tipo." }),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  
  // --- CAMPOS MIGRADOS A IDs NUMÉRICOS (FKs) ---
  tipo_gasto_impacto: z.number({ required_error: "Seleccione Impacto (Nivel 1)." }),
  area_funcional: z.number({ required_error: "Seleccione Área (Nivel 2)." }),
  subcategoria_especifica: z.number({ required_error: "Seleccione Subcategoría (Nivel 3)." }),
  categoria_macro: z.number({ required_error: "Seleccione macro." }),
  // ---------------------------------------------

  canal_asociado: z.string({ required_error: "Seleccione canal." }),
  clasificacion_operativa: z.string().nullable().optional(),
  es_fijo: z.boolean().default(false),
  es_recurrente: z.boolean().default(false),
  metodo_pago: z.string({ required_error: "Seleccione pago." }),
  especificar_metodo_pago: z.string().optional(),
  banco: z.string({ required_error: "Seleccione banco." }),
  especificar_banco: z.string().optional(),
  cuenta: z.string({ required_error: "Seleccione cuenta." }),
  especificar_cuenta: z.string().optional(),
  responsable: z.string().min(1, "Responsable es obligatorio."),
  descripcion: z.string().nullable().optional(),
  notas: z.string().max(280, "Máximo 280 caracteres.").nullable().optional(),
  es_nomina_mixta: z.boolean().default(false).optional(),
});

export type TransactionFormValues = z.infer<typeof expenseFormSchema>;
