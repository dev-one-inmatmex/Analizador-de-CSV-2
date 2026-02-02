export interface Usuario {
    id: number;
    nombre: string;
    email: string;
}

export interface ventas {
    numero_venta?: string;
    fecha_venta?: string | null;
    estado?: string | null;
    descripcion_estado?: string | null;
    es_paquete_varios?: boolean | null;
    pertenece_kit?: boolean | null;
    unidades?: number | null;
    ingreso_productos?: number | null;
    cargo_venta_impuestos?: number | null;
    ingreso_envio?: number | null;
    costo_envio?: number | null;
    costo_medidas_peso?: number | null;
    cargo_diferencia_peso?: number | null;
    anulaciones_reembolsos?: number | null;
    total?: number | null;
    venta_publicidad?: boolean | null;
    sku?: string | null;
    item_id?: string | null;
    company?: string | null;
    title?: string | null;
    variante?: string | null;
    price?: number | null;
    tipo_publicacion?: string | null;
    factura_adjunta?: string | null;
    datos_personales_empresa?: string | null;
    tipo_numero_documento?: string | null;
    direccion_fiscal?: string | null;
    tipo_contribuyente?: string | null;
    cfdi?: string | null;
    tipo_usuario?: string | null;
    regimen_fiscal?: string | null;
    comprador?: string | null;
    negocio?: boolean | null;
    ife?: string | null;
    domicilio_entrega?: string | null;
    municipio_alcaldia?: string | null;
    estado_comprador?: string | null;
    codigo_postal?: string | null;
    pais?: string | null;
    forma_entrega_envio?: string | null;
    fecha_en_camino_envio?: string | null;
    fecha_entregado_envio?: string | null;
    transportista_envio?: string | null;
    numero_seguimiento_envio?: string | null;
    url_seguimiento_envio?: string | null;
    unidades_envio?: number | null;
    forma_entrega?: string | null;
    fecha_en_camino?: string | null;
    fecha_entregado?: string | null;
    transportista?: string | null;
    numero_seguimiento?: string | null;
    url_seguimiento?: string | null;
    revisado_por_ml?: boolean | null;
    fecha_revision?: string | null;
    dinero_a_favor?: number | null;
    resultado?: string | null;
    destino?: string | null;
    motivo_resultado?: string | null;
    unidades_reclamo?: number | null;
    reclamo_abierto?: boolean | null;
    reclamo_cerrado?: boolean | null;
    con_mediacion?: boolean | null;
    created_at?: string;
    id?: number; // Keep id optional for cases where it might exist
  }
  

export interface publicaciones {
    id: string;              // PK (uuid o text) → OK
    item_id: string;         // ID de la publicación (ML)
    sku: string | null;
    product_number: string | null;
    variation_id: string | null;
    title: string;
    status: string | null;
    category: string | null; 
    price: number;
    company: string | null;
    created_at: string;      // timestamptz
  }
  

export interface publicaciones_por_sku{
  sku?: string | null;
  publicaciones?: number | null;
}

export interface skuxpublicaciones{
  sku: string | null;
  publicacion_id: string | null;
  nombre_madre: string | null;
}

export interface catalogo_madre{
  sku?: string | null;
  nombre_madre: string | null;
  company?: string | null;
}

export interface skus_unicos{
  sku: string | null;
  nombre_madre: string | null;
  tiempo_produccion: number;
  landed_cost: number | null;
  piezas_por_sku: number | null;
  sbm: string | null;
  category: string | null;
}
