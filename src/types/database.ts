export interface Usuario {
    id: number;
    nombre: string;
    email: string;
}

export interface ventas {
    numero_venta: string;
    fecha_venta: string;
    estado: string;
    descripcion_estado: string;
    es_paquete_varios: boolean | null;
    pertenece_kit: boolean | null;
    unidades: number;
    ingreso_productos: number;
    cargo_venta_impuestos: number;
    ingreso_envio: number | null;
    costo_envio: number ;
    costo_medidas_peso: number;
    cargo_diferencia_peso: number | null;
    anulaciones_reembolsos: number | null;
    total: number;
    venta_publicidad: boolean | null;
    sku: string;
    item_id: string;
    company: string;
    title: string;
    variante: string;
    price: number;
    tipo_publicacion: string;
    factura_adjunta: string;
    datos_personales_empresa: string;
    tipo_numero_documento: string;
    direccion_fiscal: string;
    tipo_contribuyente: string;
    cfdi: string;
    tipo_usuario: string;
    regimen_fiscal: string;
    comprador: string;
    negocio: boolean;
    ife: string;
    domicilio_entrega: string;
    municipio_alcaldia: string;
    estado_comprador: string;
    codigo_postal: string;
    pais: string;
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
    reclamo_abierto: boolean | null;
    reclamo_cerrado: boolean | null;
    con_mediacion: boolean | null;
    created_at: string;
    id: number; // Keep id optional for cases where it might exist
  }
  

export interface publicaciones {
    item_id: string;         // ID de la publicación (ML)
    sku: string;// PK (uuid o text) → OK
    product_number: string;
    variation_id: string;
    title: string;
    status: string;
    nombre_madre: string; 
    price: number;
    company: string;
    created_at: string;      // timestamptz
  }

export interface publicaciones_por_sku{
  sku: string | null;
  publicaciones: number | null;
}

export interface skuxpublicaciones{
  sku: string | null;
  item_id: string | null;
  nombre_madre: string;

}

export interface catalogo_madre{
  sku: string;
  nombre_madre: string;
}

export interface skus_unicos{
  sku: string | null;
  nombre_madre: string;
  tiempo_produccion: number;
  landed_cost: number | null;
  piezas_por_sku: number | null;
  sbm: string | null;
}

export interface categorias_madre{
  sku: string;
  landed_cost: number;
  tiempo_preparacion: number | null;
  tiempo_recompra: number | null;
  proveedor: string | null;
  piezas_por_sku: number | null;
  piezas_por_contenedor: number | null;
  bodega: string |null; 
  bloque: string | null;
}
