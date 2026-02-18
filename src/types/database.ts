export interface Usuario {
    id: number;
    nombre: string;
    email: string;
} 

// 1. Tipos de apoyo para mantener la integridad de los Niveles
export type ImpactoFinanciero = 
  | 'Costo de mercancía (COGS)' | 'Gasto Operativo' | 'Gasto Administrativo' 
  | 'Gasto Comercial' | 'Gasto Logístico' | 'Gasto Financiero' 
  | 'Nómina' | 'Inversión (CAPEX)' | 'Impuestos';

export type AreaFuncional = 
  | 'Ventas Ecommerce' | 'Ventas Mayoreo' | 'Logística' | 'Compras' 
  | 'Administración' | 'Marketing' | 'Dirección' | 'Producción' 
  | 'Sistemas' | 'Recursos Humanos';

export type CanalVenta = 
  | 'Mercado Libre' | 'Shopify' | 'Mayoreo' | 'Físico' 
  | 'Producción malla sombra' | 'General';

export type ClasificacionOperativa = 'Directo' | 'Semi-directo' | 'Compartido';

// 2. Interfaz unificada de Gastos Diarios
export interface GastoDiario {
  id: number;
  created_at?: string;
  fecha: string;
  empresa: 'INMATMEX' | 'COMERTAL' | 'DK' | 'MTM' | 'TAL' | 'Otro' | null;
  
  tipo_gasto: ImpactoFinanciero;
  area_funcional: AreaFuncional;
  categoria_especifica: string;
  
  canal_asociado: CanalVenta;
  clasificacion_operativa: ClasificacionOperativa;
  
  es_fijo: boolean; 
  es_recurrente: boolean;
  
  monto: number;
  responsable_id: string | null;
  comprobante_url: string | null;
  
  metodo_pago: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'OTRO';
  metodo_pago_especificar: string | null;
  
  banco: 'BBVA' | 'BANAMEX' | 'MERCADO PAGO' | 'SANTANDER' | 'BANORTE' | 'OTRO' | null;
  banco_especificar: string | null;
  
  cuenta: 'FISCAL' | 'NO FISCAL' | 'CAJA CHICA' | 'OTRO' | null;
  cuenta_especificar: string | null;
  
  descripcion: string | null;
  notas: string | null;
}

export interface Presupuesto {
  id: number;
  created_at?: string;
  user_id?: string;
  fecha_inicio: string; 
  fecha_fin: string;
  tipo: 'Ingreso' | 'Egreso';
  categoria: string;
  categoria_especificar: string | null;
  monto: number;
  notas: string | null;
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

export interface catalogo_madre {
  sku: string;
  nombre_madre: string | null;
  company: string | null;
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

export interface publicaciones_por_sku {
  sku: string;
  publicaciones: number;
}
