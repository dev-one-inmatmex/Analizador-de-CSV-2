import { Timestamp } from "next/dist/server/lib/cache-handlers/types";

export interface skus {
    id: number;
    sku: string;
    producto_madre_id: number;
    origen: string;
    fechaa_registro: Timestamp;
}

export interface producto_madre{
    id: number;
    nombre_madre: string;
    costo: number;
    tiempo_preparacion:number;
    fecha_registro: Timestamp;

}