import { redirect } from 'next/navigation';

export default function SkuDictionaryPage() {
    // Redirigir a inventario_master ya que diccionario_skus ya no existe
    redirect('/historical-analysis/major-minor-sales');
}
