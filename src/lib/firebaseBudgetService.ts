import { collection, doc, setDoc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig";
import type { cat_categoria_macro } from "@/types/database";

/**
 * @fileOverview Servicio de Presupuestos en Firebase.
 * Optimizado para alto rendimiento: solo maneja persistencia de metas.
 */

// 1. PROPONER / EDITAR (Upsert)
export async function guardarPresupuestoFirebase(
  categoriaMacroId: number, 
  monto: number, 
  mes: number, 
  anio: number
): Promise<void> {
  if (!db) throw new Error("No hay conexión con Firestore.");
  
  const docId = `macro_${categoriaMacroId}_${mes}_${anio}`;
  const presupuestoRef = doc(db, "presupuestos_macro", docId);

  try {
    await setDoc(presupuestoRef, {
      categoria_macro_id: categoriaMacroId,
      monto_asignado: monto,
      mes,
      anio,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error al guardar en Firebase:", error);
    throw error;
  }
}

// 2. ELIMINAR (Pone la meta en 0)
export async function eliminarPresupuestoFirebase(
  categoriaMacroId: number, 
  mes: number, 
  anio: number
): Promise<void> {
  if (!db) return;
  const docId = `macro_${categoriaMacroId}_${mes}_${anio}`;
  const presupuestoRef = doc(db, "presupuestos_macro", docId);

  try {
    await updateDoc(presupuestoRef, {
      monto_asignado: 0,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error al eliminar presupuesto:", error);
    throw error;
  }
}

// 3. OBTENER METAS (Optimizado para carga única)
export async function obtenerMetasFirebase(
  mes: number, 
  anio: number
): Promise<Record<number, number>> {
  if (!db) return {};

  try {
    const qPresupuestos = query(
      collection(db, "presupuestos_macro"), 
      where("mes", "==", mes), 
      where("anio", "==", anio)
    );
    const snapPresupuestos = await getDocs(qPresupuestos);
    
    const metasPorCategoria: Record<number, number> = {};
    snapPresupuestos.forEach(doc => {
      const data = doc.data();
      metasPorCategoria[data.categoria_macro_id] = Number(data.monto_asignado) || 0;
    });

    return metasPorCategoria;
  } catch (error) {
    console.error("Error al obtener metas de Firebase:", error);
    return {};
  }
}
