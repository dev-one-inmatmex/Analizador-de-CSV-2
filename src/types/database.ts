
export interface Usuario {
    id: number;
    nombre: string;
    email: string;
}

export interface ventas {
    numero_venta: number;
    fecha_venta: string;
    estado: string | null;
    descripcion_estado: string | null;
    es_paquete_varios: boolean;
    pertenece_kit: boolean;
    unidades: number;
    ingreso_productos: number;
    cargo_venta_impuestos: number;
    ingreso_envio: number;
    costo_envio: number;
    costo_medidas_peso: number;
    cargo_diferencia_peso: number;
    anulaciones_reembolsos: number;
    total: number;
    venta_publicidad: boolean;
    sku: string | null;
    numero_publicacion: string | null;
    tienda_oficial: string | null;
    titulo_publicacion: string | null;
    variante: string | null;
    precio_unitario: number;
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
    negocio: boolean;
    ife: string | null;
    domicilio_entrega: string | null;
    municipio_alcaldia: string | null;
    estado_comprador: string | null;
    codigo_postal: string | null;
    pais: string | null;
    forma_entrega: string | null;
    fecha_en_camino: string | null;
    fecha_entregado: string | null;
    transportista: string | null;
    numero_seguimiento: string | null;
    url_seguimiento: string | null;
    unidades_envio: number;
    revisado_por_ml: boolean;
    fecha_revision: string | null;
    dinero_a_favor: number;
    resultado: string | null;
    destino: string | null;
    motivo_resultado: string | null;
    unidades_reclamo: number;
    reclamo_abierto: boolean;
    reclamo_cerrado: boolean;
    con_mediacion: boolean;
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
