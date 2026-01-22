export interface skus {
    id: number;
    sku: string;
    id_producto_madre: number;
    variacion: string | null;
    costo: number;
    tiempo_preparacion: number; 
    fecha_registro: string;
}

export interface productos_madre {
    id: number;
    nombre_madre: string;
    costo: number;
    tiempo_preparacion: number;
    fecha_registro: string;
}

export interface Usuario {
    id: number;
    nombre: string;
    email: string;
}

export type SkuWithProduct = skus & {
  productos_madre: productos_madre | null;
};
