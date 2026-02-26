import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * @fileOverview Servicio aislado de Firebase para la gestión de presupuestos mensuales (v2).
 * Utiliza IDs compuestos predecibles para evitar duplicados y asegurar ediciones infalibles.
 */

const COLECCION = "presupuestos_mensuales_v2";

/**
 * Guarda o edita una meta presupuestaria en Firebase.
 */
export async function guardarPresupuestoFirebase(macroId: number, monto: number, mes: number, anio: number): Promise<void> {
  // EL SECRETO: Un ID predecible para realizar un UPSERT (Crear o Editar sin duplicar)
  const docId = `cat_${macroId}_mes_${mes}_anio_${anio}`;
  const docRef = doc(db, COLECCION, docId);

  await setDoc(docRef, {
    categoria_macro_id: macroId,
    monto,
    mes,
    anio,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

/**
 * Elimina una meta presupuestaria en Firebase.
 */
export async function eliminarPresupuestoFirebase(macroId: number, mes: number, anio: number): Promise<void> {
  const docId = `cat_${macroId}_mes_${mes}_anio_${anio}`;
  const docRef = doc(db, COLECCION, docId);
  await deleteDoc(docRef);
}

/**
 * Obtiene las metas presupuestarias de un mes y año específicos.
 * Devuelve un diccionario mapeando ID de categoría macro a su monto.
 */
export async function obtenerMetasFirebase(mes: number, anio: number): Promise<Record<number, number>> {
  const q = query(
    collection(db, COLECCION),
    where("mes", "==", mes),
    where("anio", "==", anio)
  );
  
  const snapshot = await getDocs(q);
  const metas: Record<number, number> = {};
  
  snapshot.forEach(documento => {
    const data = documento.data();
    metas[data.categoria_macro_id] = data.monto;
  });
  
  return metas;
}