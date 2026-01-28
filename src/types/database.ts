
export interface Usuario {
    id: number;
    nombre: string;
    email: string;
}

export interface ventas {
    id: number;
    numero_venta: number;
    fecha_venta: string;
    estado: string;
    descripcion_estado: string;
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
    sku: string;
    numero_publicacion: string;
    tienda_oficial: string;
    titulo_publicacion: string;
    variante: string;
    precio_unitario: number;
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
    forma_entrega: string;
    fecha_en_camino: string;
    fecha_entregado: string;
    transportista: string;
    numero_seguimiento: string;
    url_seguimiento: string;
    unidades_envio: number;
    revisado_por_ml: boolean;
    fecha_revision: string;
    dinero_a_favor: number;
    resultado: string;
    destino: string;
    motivo_resultado: string;
    unidades_reclamo: number;
    reclamo_abierto: boolean;
    reclamo_cerrado: boolean;
    con_mediacion: boolean;
    created_at: string;
}

export interface publicaciones { 
    id: string;
    sku: string;
    item_id: string;
    product_number: string;
    variation_id: string;
    title: string;
    status: string;
    category: string;
    price: number;
    company: string;
    created_at: string;
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
