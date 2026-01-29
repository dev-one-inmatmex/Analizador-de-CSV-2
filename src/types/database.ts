
export interface Usuario {
    id: number;
    nombre: string;
    email: string;
}

export interface ventas {
    id?: number;
    _venta: number;
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
    numero_publicacion?: string | null;
    tienda_oficial?: string | null;
    titulo_publicacion?: string | null;
    variante?: string | null;
    precio_unitario?: number | null;
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
  }
  

export interface publicaciones {
    id: string;              // PK (uuid o text) → OK
    item_id: string;         // ID de la publicación (ML)
    sku: string;
    product_number: string | null;
    variation_id: string | null;
    title: string;
    status: string;
    category: string; 
    price: number;
    company: string;
    created_at: string;      // timestamptz
  }
  

export interface productos_madre {
    id: number;
    id_producto_madre: number;
    nombre_madre: string;
    costo: number;
    tiempo_preparacion:string;
    observaciones: string;
    fecha_registro: string;
}

export interface skus {
    id: number;
    sku: string;
    variacion: string;
    id_producto_madre: number;
    costo: number;
    fecha_registro: string;
    tiempo_preparacion: number;
}

export type SkuWithProduct = skus & {
  productos_madre: productos_madre | null;
};
