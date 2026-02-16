export interface Usuario {
    id: number;
    nombre: string;
    email: string;
}

export interface ventas {
    numero_venta: string;
    fecha_venta: string | null;
    estado: string | null;
    descripcion_estado: string | null;
    es_paquete_varios: string | null;
    pertenece_kit: string | null;
    unidades: number | null;
    ingreso_productos: number | null;
    cargo_venta_impuestos: number | null;
    ingreso_envio: number | null;
    costo_envio: number | null;
    costo_medidas_peso: number | null;
    cargo_diferencia_peso: number | null;
    anulaciones_reembolsos: number | null;
    total: number | null;
    venta_publicidad: boolean | null;
    sku: string | null;
    item_id: string;
    company: string | null;
    title: string | null;
    variante: string | null;
    price: number | null;
    tipo_publicacion: string | null;
    factura_adjunta: string | null;
    datos_personales_empresa: string | null;
    tipo_numero_documento: string | null;
    direccion_fiscal: string | null;
    tipo_contribuyente: string | null;
    cfdi: string | null;
    tipo_usuario: string | null;
    regimen_fiscal: string | null;
    comprador: string | null;
    negocio: string | null;
    ife: string | null;
    domicilio_entrega: string | null;
    municipio_alcaldia: string | null;
    estado_comprador: string | null;
    codigo_postal: string | null;
    pais: string | null;
    forma_entrega_envio: string | null;
    fecha_en_camino_envio: string | null;
    fecha_entregado_envio: string | null;
    transportista_envio: string | null;
    numero_seguimiento_envio: string | null;
    url_seguimiento_envio: string | null;
    unidades_envio: number | null;
    forma_entrega: string | null;
    fecha_en_camino: string | null;
    fecha_entregado: string | null;
    transportista: string | null;
    numero_seguimiento: string | null;
    url_seguimiento: string | null;
    revisado_por_ml: boolean | null;
    fecha_revision: string | null;
    dinero_a_favor: number | null;
    resultado: string | null;
    destino: string | null;
    motivo_resultado: string | null;
    unidades_reclamo: number | null;
    reclamo_abierto: string | null;
    reclamo_cerrado: string | null;
    con_mediacion: string | null;
}
  
export interface skuxpublicaciones{
  sku: string;
  item_id: string | null;
  nombre_madre: string | null;

}

export interface catalogo_madre{
  sku: string;
  nombre_madre: string;
  company?: string | null;
}

export interface skus_unicos{
  sku: string | null;
  nombre_madre: string;
  tiempo_de_preparacion: number | null;
  landed_cost: number | null;
  de_recompra: number | null;
  proveedor: string | null;
  piezas_por_contenedor: number | null;
}

export interface categorias_madre{
  sku: string;
  nombre_madre: string;
  categoria_madre: string;
  landed_cost: number | null;
  tiempo_preparacion: number | null;
  piezas_por_sku: number | null;
  piezas_por_contenedor: number | null;
  bodega: string |null; 
  bloque: string | null;
}

export interface finanzas{
  id: number;
  fecha: string;
  empresa: string | null;
  categoria: string;
  subcategoria: string | null;
  monto: number;
  capturista: string | null;
  tipo_transaccion: 'gasto' | 'ingreso';
  metodo_pago: 'Efectivo' | 'Tarjeta' | 'Cash' | 'Otro';
  notas: string | null;
}

export interface diccionario_skus{
  sku: string;
  categoria_madre: string | null;
  nombre_madre: string | null;
  landed_cost: number | null;
  presentacion_master_1: string | null;
  piezas_por_master: number | null;
  codigo_en_siggo: string | null;
  nombre_en_siggo: string | null;
  rock_en_siggo: number | null;
  piezas_totales: number | null;
  estado_en_siggo: string | null;
  presentacion_master_2: string | null;
  presentacion_en_master_3: string | null;
  presentacion_en_master_4: string | null;
  bodega: string | null;
  bloque: string | null;
}

export interface sales_excel {
  id: number;
  nde_venta: number | null; //numero de venta
  sale_date: string | null; //fecha de venta
  sku: string | null; 
  nde_pub: string | null; //número de publicación
  tienda: string | null; 
  tit_pub: string | null; //título de la publicación
  variante: string | null;
  comprador: string | null;
  municipio: string | null;
  estado: string | null;
}

export interface ml_sales {
  id: number;
  num_venta: string | null;
  fecha_venta: string | null;
  unidades: number | null;
  ing_xunidad: number | null;
  cargo_venta: number | null;
  ing_xenvio: number | null;
  costo_envio: number | null;
  cargo_difpeso: number | null;
  anu_reembolsos: number | null;
  total: number | null;
  venta_xpublicidad: boolean | null;
  sku: string | null;
  num_publi: string | null;
  tienda: string | null;
  tip_publi: string | null;
  total_final: number | null;
  profit: number | null;
  status: string | null;
}

export interface sku_m {
  sku_mdr: string;
  cat_mdr: string | null;
  esti_time: number | null;
  piezas_por_sku: number | null;
  sku: string | null;
}

export interface sku_alterno {
  sku: string; // Not null (Primary Key)
  sku_mdr: string | null; // Foreign Key a sku_m
}

export interface sku_costos {
  id: number;
  sku_mdr: string; // Not null (Foreign Key)
  landed_cost: number; // Numeric(12,2)
  fecha_desde: string; // Timestamp with time zone
  proveedor: string | null;
  piezas_xcontenedor: number | null;
}

export interface publi_tienda {
  num_publi: string | null;
  sku: string; // Not null (Foreign Key)
  num_producto: string | null;
  titulo: string | null;
  status: string | null;
  cat_mdr: string | null;
  costo: number | null;
  tienda: string | null;
  created_at?: string | null;
}

export interface publi_xsku {
  sku: string; // Not null (Foreign Key)
  num_publicaciones: number | null;
}
