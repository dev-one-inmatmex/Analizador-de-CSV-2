export interface Usuario {
    id: number;
    nombre: string;
    email: string;
} 

/**
 * Definición completa de tipos para el sistema de finanzas
 * Sincronizado con la tabla gastos_diarios (Fase 1)
 */

// --- Catálogos (Enums) ---

export type Empresa = 'MTM' | 'TAL' | 'DOMESKA' | 'OTRA';

export type TipoTransaccion = 'INGRESO' | 'GASTO' | 'TRANSFERENCIA' | 'AJUSTE';

export type TipoGastoImpacto = 
  | 'COSTO_MERCANCIA_COGS' 
  | 'GASTO_OPERATIVO' 
  | 'GASTO_ADMINISTRATIVO' 
  | 'GASTO_COMERCIAL' 
  | 'GASTO_LOGISTICO' 
  | 'GASTO_FINANCIERO' 
  | 'NOMINA' 
  | 'INVERSION_CAPEX' 
  | 'IMPUESTOS';

export type AreaFuncional = 
  | 'VENTAS_ECOMMERCE' 
  | 'VENTAS_MAYOREO' 
  | 'LOGISTICA' 
  | 'COMPRAS' 
  | 'ADMINISTRACION' 
  | 'MARKETING' 
  | 'DIRECCION' 
  | 'PRODUCCION' 
  | 'SISTEMAS' 
  | 'RECURSOS_HUMANOS';

export type CanalAsociado = 
  | 'MERCADO_LIBRE' 
  | 'SHOPIFY' 
  | 'MAYOREO' 
  | 'FISICO' 
  | 'PRODUCCION_MALLA_SOMBRA' 
  | 'GENERAL';

export type ClasificacionOperativa = 'DIRECTO' | 'SEMI_DIRECTO' | 'COMPARTIDO';

export type CategoriaMacro = 'OPERATIVO' | 'COMERCIAL' | 'ADMINISTRATIVO' | 'FINANCIERO' | 'NOMINA';

export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'PAYPAL' | 'OTRO';

export type Banco = 'BBVA' | 'SANTANDER' | 'BANAMEX' | 'MERCADO_PAGO' | 'OTRO';

export type Cuenta = 'OPERATIVA' | 'FISCAL' | 'CAJA_CHICA' | 'OTRO';

// --- Interfaz Principal ---

export interface GastoDiario {
  // Metadatos
  id?: number; 
  created_at?: string; 
  fecha: string; // Formato YYYY-MM-DD
  empresa: Empresa;
  capturista?: string; // UUID del usuario
  
  // Clasificación y Estrategia (Fase 1)
  tipo_transaccion: TipoTransaccion;
  tipo_gasto_impacto: TipoGastoImpacto | null;
  area_funcional: AreaFuncional | null;
  categoria_macro: CategoriaMacro;
  subcategoria_especifica: string; // El valor del dropdown dinámico del Nivel 3
  
  // Atribución de Negocio
  canal_asociado: CanalAsociado;
  clasificacion_operativa: ClasificacionOperativa | null;
  es_fijo: boolean;
  es_recurrente: boolean;
  
  // Información Financiera
  monto: number;
  metodo_pago: MetodoPago;
  metodo_pago_especificar?: string | null;
  banco: Banco;
  banco_especificar?: string | null;
  cuenta: Cuenta;
  cuenta_especificar?: string | null;
  
  // Soporte y Detalle
  responsable?: string | null;
  comprobante_url?: string | null;
  descripcion?: string | null;
  notas?: string | null;
}

export interface sku_m {
  sku_mdr: string;
  cat_mdr: string | null;
  piezas_por_sku: number | null;
  sku: string | null;
  piezas_xcontenedor: number | null;
  bodega: string | null;
  bloque: number | null;
  landed_cost: number;
}

export interface sku_alterno {
  sku: string;
  sku_mdr: string | null;
}

export interface sku_costos {
  id: string;
  sku_mdr: string;
  landed_cost: number;
  fecha_desde: string;
  proveedor: string | null;
  piezas_xcontenedor: number | null;
  sku: string | null;
  esti_time: number | null;
}

export interface ml_sales {
  id?: string;
  num_venta: string | null;
  fecha_venta: string | null;
  status: string | null;
  desc_status: string | null;
  paquete_varios: boolean;
  pertenece_kit: boolean;
  unidades: number | null;
  ing_xunidad: number | null;
  cargo_venta: number | null;
  ing_xenvio: number | null;
  costo_envio: number | null;
  costo_enviomp: number | null;
  cargo_difpeso: number | null;
  anu_reembolsos: number | null;
  total: number | null;
  venta_xpublicidad: boolean;
  sku: string | null;
  num_publi: string | null;
  tienda: string | null;
  tit_pub: string | null;
  variante: string | null;
  price: number | null;
  tip_publi: string | null;
  factura_a: string | null;
  datos_poe: string | null;
  tipo_ndoc: string | null;
  direccion: string | null;
  t_contribuyente: string | null;
  cfdi: string | null;
  t_usuario: string | null;
  r_fiscal: string | null;
  comprador: string | null;
  negocio: boolean;
  ife: string | null;
  domicilio: string | null;
  mun_alcaldia: string | null;
  estado: string | null;
  c_postal: string | null;
  pais: string | null;
  f_entrega: string | null;
  f_camino: string | null;
  f_entregado: string | null;
  transportista: string | null;
  num_seguimiento: string | null;
  url_seguimiento: string | null;
  unidades_2: number | null;
  f_entrega2: string | null;
  f_camino2: string | null;
  f_entregado2: string | null;
  transportista2: string | null;
  num_seguimiento2: string | null;
  url_seguimiento2: string | null;
  revisado_xml: string | null;
  f_revision3: string | null;
  d_afavor: string | null;
  resultado: string | null;
  destino: string | null;
  motivo_resul: string | null;
  unidades_3: number | null;
  r_abierto: boolean;
  r_cerrado: boolean | null;
  c_mediacion: boolean;
}

export interface publi_tienda {
  num_publi: string | null;
  sku: string;
  num_producto: string | null;
  titulo: string | null;
  status: string | null;
  cat_mdr: string | null;
  costo: number | null;
  tienda: string | null;
  created_at?: string | null;
}

export interface publi_xsku {
  sku: string;
  num_publicaciones: number | null;
}

export interface catalogo_madre {
  sku: string;
  nombre_madre: string | null;
  company: string | null;
}

export interface diccionario_skus {
  sku: string;
  categoria_madre: string | null;
  landed_cost: number | null;
  codigo_en_siggo: string | null;
  nombre_en_siggo: string | null;
  rock_en_siggo: number | null;
  piezas_totales: number | null;
  estado_en_siggo: string | null;
  bodega: string | null;
  bloque: string | null;
}

export interface skuxpublicaciones {
  sku: string;
  item_id: string;
  nombre_madre: string | null;
}

export interface publicaciones_por_sku {
  sku: string;
  publicaciones: number | null;
}