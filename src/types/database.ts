export interface skus {
    id: number;
    sku: string;
    producto_madre_id: number;
    origen: string;
    fecha_registro: string;
}

export interface producto_madre{
    id: number;
    nombre_madre: string;
    costo: number;
    tiempo_preparacion:number;
    fecha_registro: string;
}

export interface Usuario {
    id: number;
    nombre: string;
    email: string;
}

export type SkuWithProduct = skus & {
  productos_madre: producto_madre | null;
};
