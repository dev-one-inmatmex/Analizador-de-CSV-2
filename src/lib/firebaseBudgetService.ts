import { collection, doc, setDoc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig";
import type { ResumenSeguimientoPresupuesto, cat_categoria_macro } from "@/types/database";

/**
 * @fileOverview Servicio de Presupuestos en Firebase.
 * Sigue la REGLA DE ORO: Solo lee presupuestos de Firebase y procesa gastos de Supabase.
 */

// 1. PROPONER / EDITAR (Respeta tus botones de Nuevo Presupuesto / Ajustar)
export async function guardarPresupuestoFirebase(
  categoriaMacroId: number, 
  monto: number, 
  mes: number, 
  anio: number
): Promise<void> {
  if (!db) return;
  
  // El ID predecible hace que Firebase actualice si existe, o cree si no existe (Upsert)
  const docId = `macro_${categoriaMacroId}_${mes}_${anio}`;
  const presupuestoRef = doc(db, "presupuestos_macro", docId);

  await setDoc(presupuestoRef, {
    categoria_macro_id: categoriaMacroId,
    monto_asignado: monto,
    mes,
    anio,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

// 2. ELIMINAR (Pone la meta en 0 para no romper tu historial visual)
export async function eliminarPresupuestoFirebase(
  categoriaMacroId: number, 
  mes: number, 
  anio: number
): Promise<void> {
  if (!db) return;
  const docId = `macro_${categoriaMacroId}_${mes}_${anio}`;
  const presupuestoRef = doc(db, "presupuestos_macro", docId);

  await updateDoc(presupuestoRef, {
    monto_asignado: 0,
    updated_at: new Date().toISOString()
  });
}

// 3. EL MOTOR DE CÁLCULO (Optimizado para carga instantánea)
// REGLA DE ORO: No consultamos gastos en Firebase, usamos los ya cargados de Supabase.
export async function obtenerDashboardPresupuestos(
  mes: number, 
  anio: number, 
  catalogoCategorias: cat_categoria_macro[],
  gastosMensuales: any[] 
): Promise<ResumenSeguimientoPresupuesto[]> {
  
  if (!db) return [];

  try {
    // A. Consultar las metas del mes actual en Firestore (Operación ligera)
    const qPresupuestos = query(
      collection(db, "presupuestos_macro"), 
      where("mes", "==", mes), 
      where("anio", "==", anio)
    );
    const snapPresupuestos = await getDocs(qPresupuestos);
    
    const metasPorCategoria: Record<number, number> = {};
    snapPresupuestos.forEach(doc => {
      const data = doc.data();
      metasPorCategoria[data.categoria_macro_id] = data.monto_asignado;
    });

    // B. Calcular el ejecutado basándonos exclusivamente en los datos inyectados
    // Esto hace que la carga sea instantánea al no ir a la red por los gastos.
    const ejecutadoPorCategoria: Record<number, number> = {};
    
    // Filtramos los gastos por el mes y año específicos para el cálculo de presupuesto
    gastosMensuales.forEach(gasto => {
      if (!gasto.fecha) return;
      
      const fechaGasto = new Date(gasto.fecha);
      const mesGasto = fechaGasto.getUTCMonth() + 1;
      const anioGasto = fechaGasto.getUTCFullYear();

      if (
        mesGasto === mes && 
        anioGasto === anio &&
        ['GASTO', 'COMPRA'].includes(gasto.tipo_transaccion) && 
        gasto.categoria_macro
      ) {
        ejecutadoPorCategoria[gasto.categoria_macro] = (ejecutadoPorCategoria[gasto.categoria_macro] || 0) + (Number(gasto.monto) || 0);
      }
    });

    // C. Retornar la estructura exacta para la UI
    return catalogoCategorias.map(cat => {
      const presupuesto = metasPorCategoria[cat.id] || 0;
      const ejecutado = ejecutadoPorCategoria[cat.id] || 0;
      
      return {
        id: cat.id,
        nombre: cat.nombre,
        presupuesto: presupuesto,
        ejecutado: ejecutado,
        disponible: presupuesto - ejecutado,
        progreso: presupuesto > 0 ? Math.min(100, (ejecutado / presupuesto) * 100) : 0
      };
    });
  } catch (error) {
    console.error("Error en motor de presupuestos:", error);
    return [];
  }
}