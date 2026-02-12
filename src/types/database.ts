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
    created_at: string;
    id: number; // Keep id optional for cases where it might exist
  }
  

export interface publicaciones {
    item_id: string | null;         // ID de la publicación (ML)
    sku: string;// PK (uuid o text) → OK
    product_number: string | null;
    variation_id: string | null;
    title: string | null;
    status: string | null;
    nombre_madre: string | null; 
    price: number | null;
    company: string | null;
  }

export interface publicaciones_por_sku{
  sku: string;
  publicaciones: number | null;
}

export interface skuxpublicaciones{
  sku: string;
  item_id: string | null;
  nombre_madre: string | null;

}

export interface catalogo_madre{
  sku: string;
  nombre_madre: string;
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
  tiempo_recompra: number | null;
  proveedor: string | null;
  piezas_por_sku: number | null;
  piezas_por_contenedor: number | null;
  bodega: string |null; 
  bloque: string | null;
}

export interface gastos_diarios{
  id: number;
  fecha: string | null;
  empresa: string | null;
  tipo_gasto: string | null;
  monto: number | null;
  capturista: string | null;
}

export interface filtrado_por_categorias{
  sku: string;
  categoria_madre: string | null;
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