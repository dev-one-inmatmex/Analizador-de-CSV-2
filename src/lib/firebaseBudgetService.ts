import { collection, doc, setDoc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig";
import type { ResumenSeguimientoPresupuesto, cat_categoria_macro } from "@/types/database";

// 1. PROPONER / EDITAR (Respeta tus botones de Nuevo Presupuesto / Ajustar)
export async function guardarPresupuestoFirebase(
  categoriaMacroId: number, 
  monto: number, 
  mes: number, 
  anio: number
): Promise<void> {
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
  const docId = `macro_${categoriaMacroId}_${mes}_${anio}`;
  const presupuestoRef = doc(db, "presupuestos_macro", docId);

  await updateDoc(presupuestoRef, {
    monto_asignado: 0,
    updated_at: new Date().toISOString()
  });
}

// 3. EL MOTOR DE CÁLCULO (Entrega los datos exactamente como los pide tu UI)
// Nota: Adaptado para usar los gastos ya cargados en la UI (de Supabase) para mantener sincronía
export async function obtenerDashboardPresupuestos(
  mes: number, 
  anio: number, 
  catalogoCategorias: cat_categoria_macro[],
  gastosMensuales: any[] // Inyectamos los gastos que ya tiene el componente
): Promise<ResumenSeguimientoPresupuesto[]> {
  
  // A. Consultar las metas del mes actual en Firestore
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

  // B. Calcular el ejecutado basado en los gastos inyectados (¡REGLA DE ORO!)
  const ejecutadoPorCategoria: Record<number, number> = {};
  gastosMensuales.forEach(gasto => {
    if (['GASTO', 'COMPRA'].includes(gasto.tipo_transaccion) && gasto.categoria_macro) {
      ejecutadoPorCategoria[gasto.categoria_macro] = (ejecutadoPorCategoria[gasto.categoria_macro] || 0) + (Number(gasto.monto) || 0);
    }
  });

  // C. Retornar la estructura perfecta para Tailwind
  return catalogoCategorias.map(cat => {
    const presupuesto = metasPorCategoria[cat.id] || 0;
    const ejecutado = ejecutadoPorCategoria[cat.id] || 0;
    
    return {
      id: cat.id,
      nombre: cat.nombre,
      presupuesto: presupuesto,
      ejecutado: ejecutado,
      disponible: presupuesto - ejecutado,
      progreso: presupuesto > 0 ? (ejecutado / presupuesto) * 100 : 0
    };
  });
}