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

export const TIPO_GASTO_IMPACTO_LIST: TipoGastoImpacto[] = [
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

export const SUBCATEGORIAS_NIVEL_3: Record<string, string[]> = {
  "GASTO_OPERATIVO": [
    "Gasolina",
    "Mantenimiento vehículos",
    "Refacciones",
    "Material empaque",
    "Herramientas",
    "Reparaciones nave",
    "Limpieza"
  ],
  "GASTO_COMERCIAL": [
    "Facebook Ads",
    "TikTok Ads",
    "Google Ads",
    "Influencers",
    "Producción contenido",
    "Comisiones vendedores",
    "Descuentos comerciales"
  ],
  "GASTO_ADMINISTRATIVO": [
    "Papelería",
    "Honorarios contables",
    "Software mensual",
    "Internet",
    "CFE",
    "Agua",
    "Renta"
  ],
  "GASTO_FINANCIERO": [
    "Intereses",
    "Comisión bancaria",
    "Comisión Mercado Libre",
    "Comisión Shopify",
    "Factoraje",
    "Pago terminal",
    "Cargos PayPal"
  ],
  "NOMINA": [
    "Sueldo base",
    "Comisión variable",
    "IMSS",
    "INFONAVIT",
    "Aguinaldo",
    "PTU",
    "Bonos"
  ],
  "COSTO_MERCANCIA_COGS": ["Compra de Mercancía"],
  "GASTO_LOGISTICO": ["Fletes", "Envíos Clientes", "Paquetería"],
  "INVERSION_CAPEX": ["Maquinaria", "Mobiliario", "Equipos Computo"],
  "IMPUESTOS": ["IVA", "ISR", "Retenciones"]
};

export const expenseFormSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  empresa: z.enum(['MTM', 'TAL', 'DOMESKA', 'OTRA'], { required_error: "Seleccione una empresa." }),
  tipo_transaccion: z.enum(['INGRESO', 'GASTO', 'TRANSFERENCIA', 'AJUSTE'], { required_error: "Seleccione tipo." }),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  tipo_gasto_impacto: z.enum([
    'COSTO_MERCANCIA_COGS', 'GASTO_OPERATIVO', 'GASTO_ADMINISTRATIVO', 
    'GASTO_COMERCIAL', 'GASTO_LOGISTICO', 'GASTO_FINANCIERO', 
    'NOMINA', 'INVERSION_CAPEX', 'IMPUESTOS'
  ], { required_error: "Seleccione Impacto (Nivel 1)." }),
  area_funcional: z.enum([
    'VENTAS_ECOMMERCE', 'VENTAS_MAYOREO', 'LOGISTICA', 'COMPRAS', 
    'ADMINISTRACION', 'MARKETING', 'DIRECCION', 'PRODUCCION', 
    'SISTEMAS', 'RECURSOS_HUMANOS'
  ], { required_error: "Seleccione Área (Nivel 2)." }),
  subcategoria_especifica: z.string().min(1, "Seleccione Subcategoría (Nivel 3)."),
  categoria_macro: z.enum(['OPERATIVO', 'COMERCIAL', 'ADMINISTRATIVO', 'FINANCIERO', 'NOMINA'], { required_error: "Seleccione macro." }),
  canal_asociado: z.enum([
    'MERCADO_LIBRE', 'SHOPIFY', 'MAYOREO', 'FISICO', 
    'PRODUCCION_MALLA_SOMBRA', 'GENERAL'
  ], { required_error: "Seleccione canal." }),
  clasificacion_operativa: z.enum(['DIRECTO', 'SEMI_DIRECTO', 'COMPARTIDO']).nullable().optional(),
  es_fijo: z.boolean().default(false),
  es_recurrente: z.boolean().default(false),
  metodo_pago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'PAYPAL', 'OTRO'], { required_error: "Seleccione pago." }),
  banco: z.enum(['BBVA', 'SANTANDER', 'BANAMEX', 'MERCADO_PAGO', 'OTRO'], { required_error: "Seleccione banco." }),
  cuenta: z.enum(['OPERATIVA', 'FISCAL', 'CAJA_CHICA', 'OTRO'], { required_error: "Seleccione cuenta." }),
  responsable: z.string().min(1, "Responsable es obligatorio."),
  descripcion: z.string().nullable().optional(),
  notas: z.string().max(280, "Máximo 280 caracteres.").nullable().optional(),
  comprobante_url: z.string().url("URL inválida").optional().or(z.literal('')),
  es_nomina_mixta: z.boolean().default(false).optional(),
});

export type TransactionFormValues = z.infer<typeof expenseFormSchema>;
