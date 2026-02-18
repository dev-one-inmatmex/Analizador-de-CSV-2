export interface Usuario {
    id: number;
    nombre: string;
    email: string;
} 

export interface Finanzas {
  id: number;
  created_at?: string; // Incluido por el default now() de Supabase
  fecha: string;
  empresa: 'DK' | 'MTM' | 'TAL' | 'Otro' | null;
  categoria: string;
  subcategoria: string | null;
  monto: number;
  capturista: string | null; // UUID del usuario
  
  // Cambiado: Ahora solo gasto o compra
  tipo_transaccion: 'gasto' | 'compra';
  
  // Nuevo: Campo de descripción
  descripcion: string | null;

  // Actualizado: Se agrega 'Transferencia'
  metodo_pago: 'Efectivo' | 'Tarjeta' | 'Cash' | 'Transferencia' | 'Otro';
  metodo_pago_especificar: string | null;

  // Nuevos Campos: Bancos
  banco: 'BBVA' | 'BANAMEX' | 'MERCADO PAGO' | 'SANTANDER' | 'BANORTE' | 'OTRO' | null;
  banco_especificar: string | null;

  // Nuevos Campos: Cuentas
  cuenta: 'TOLEXAL' | 'TAL' | 'MTM' | 'DOMESKA' | 'CAJA' | 'OTRO' | null;
  cuenta_especificar: string | null;

  notas: string | null;
}

export interface Finanzas2 {
  id: number;
  created_at?: string; 
  fecha: string;
  empresa: 'DK' | 'MTM' | 'TAL' | 'Otro' | null;
  
  // Cambiado específicamente para esta tabla
  tipo_transaccion: 'venta' | 'ingreso';
  
  descripcion: string | null;
  categoria: string;
  subcategoria: string | null;
  monto: number;
  capturista: string | null;

  // Métodos de pago incluyendo 'Transferencia'
  metodo_pago: 'Efectivo' | 'Tarjeta' | 'Cash' | 'Transferencia' | 'Otro';
  metodo_pago_especificar: string | null;

  // Catálogo de Bancos
  banco: 'BBVA' | 'BANAMEX' | 'MERCADO PAGO' | 'SANTANDER' | 'BANORTE' | 'OTRO' | null;
  banco_especificar: string | null;

  // Catálogo de Cuentas
  cuenta: 'TOLEXAL' | 'TAL' | 'MTM' | 'DOMESKA' | 'CAJA' | 'OTRO' | null;
  cuenta_especificar: string | null;

  notas: string | null;
}

export interface Presupuesto {
  id: number;
  created_at?: string;
  user_id?: string;
  
  // Temporalidad definida por el formulario
  fecha_inicio: string; 
  fecha_fin: string;
  
  // Clasificación del flujo
  tipo: 'Ingreso' | 'Egreso';
  
  // Categorización con campo de respaldo
  categoria: string;
  categoria_especificar: string | null;

  // Datos financieros
  monto: number;
  notas: string | null;
}

/* export interface diccionario_skus{
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
} */

export interface sku_m {
  sku_mdr: string;
  cat_mdr: string | null;
  piezas_por_sku: number | null;
  sku: string | null;
  piezas_xcontenedor: number | null;
  bodega: string | null;
  bloque: number | null;
  landed_cost: number;
}

export interface publi_tienda {
  num_publi: string | null;
  sku: string;
  num_producto: string | null;
  titulo: string | null;
  status: string | null;
  cat_mdr: string | null;
  costo: number | null;
  tienda: string | null;
  created_at?: string | null;
}

export interface publi_xsku {
  sku: string;
  num_publicaciones: number | null;
}

export interface publicaciones_por_sku {
  sku: string;
  publicaciones: number;
}

export interface sku_alterno{
  sku: string;
  sku_mdr: string | null;
}

export interface sku_costos{
  id: string;
  sku_mdr: string;
  landed_cost: number;
  fecha_desde: string;
  proveedor: string | null;
  piezas_xcontenedor: number | null;
  sku: string | null;
  esti_time: number | null;
}

export interface ml_sales{
// Identificadores y Auditoría
  id?: string; // En Firebase suele ser el ID del documento (string)  

  // Datos principales de la venta
num_venta: string | null;
fecha_venta: string | null;
status: string | null;
desc_status: string | null;
paquete_varios: boolean;
pertenece_kit: boolean;
unidades: number | null;

// Datos Financieros
ing_xunidad: number | null;
cargo_venta: number | null;
ing_xenvio: number | null;
costo_envio: number | null;
costo_enviomp: number | null;
cargo_difpeso: number | null;
anu_reembolsos: number | null;
total: number | null;
venta_xpublicidad: boolean;

// Publicación y Producto
sku: string | null;
num_publi: string | null;
tienda: string | null;
tit_pub: string | null;
variante: string | null;
price: number | null;
tip_publi: string | null;

// Facturación y Datos Fiscales
factura_a: string | null;
datos_poe: string | null;
tipo_ndoc: string | null;
direccion: string | null;
t_contribuyente: string | null;
cfdi: string | null;
t_usuario: string | null;
r_fiscal: string | null;
comprador: string | null;

// Comprador y Ubicación
negocio: boolean;
ife: string | null;
domicilio: string | null;
mun_alcaldia: string | null;
estado: string | null;
c_postal: string | null;
pais: string | null;

// Seguimiento y Entregas (Nivel 1)
f_entrega: string | null;
f_camino: string | null;
f_entregado: string | null;
transportista: string | null;
num_seguimiento: string | null;
url_seguimiento: string | null;

// Seguimiento y Entregas (Nivel 2)
unidades_2: number | null;
f_entrega2: string | null;
f_camino2: string | null;
f_entregado2: string | null;
transportista2: string | null;
num_seguimiento2: string | null;
url_seguimiento2: string | null;

// Auditoría y Resultados
revisado_xml: string | null;
f_revision3: string | null;
d_afavor: string | null;
resultado: string | null;
destino: string | null;
motivo_resul: string | null;
unidades_3: number | null;

// Resoluciones y Reclamos
r_abierto: boolean;
r_cerrado: boolean | null;
c_mediacion: boolean;
}