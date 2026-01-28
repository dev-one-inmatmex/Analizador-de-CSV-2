import { supabase } from '@/lib/supabaseClient';
import { ventas } from '@/types/database';

async function getVentas() {
  const { data, error } = await supabase
    .from('ventas') // Nombre exacto de tu tabla
    .select('*');

  if (error) {
    console.error('Error cargando usuarios:', error);
    return [];
  }

  return data as ventas[];
}

export default async function HomePage() {
  const ventas = await getVentas();

  return (
    <main className="min-h-screen p-10 bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Lista de Usuarios
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ventas.map((ventas) => (
          <div
          key={ventas.numero_venta}
          className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
        >
          {/* Encabezado */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-blue-600">
              Venta #{ventas.numero_venta}
            </h2>
        
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${
                ventas.estado === 'completada'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {ventas.estado ?? 'Sin estado'}
            </span>
          </div>
        
          {/* Producto */}
          <p className="mt-2 text-gray-700 font-medium">
            {ventas.titulo_publicacion ?? 'Producto sin título'}
          </p>
        
          <p className="text-sm text-gray-500">
            SKU: {ventas.sku ?? 'N/A'}
          </p>
        
          {/* Detalles principales */}
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <p className="text-gray-500">Comprador</p>
              <p className="font-medium">{ventas.comprador ?? 'No especificado'}</p>
            </div>
        
            <div>
              <p className="text-gray-500">Empresa</p>
              <p className="font-medium">{ventas.tienda_oficial ?? 'N/A'}</p>
            </div>
        
            <div>
              <p className="text-gray-500">Unidades</p>
              <p className="font-medium">{ventas.unidades}</p>
            </div>
        
            <div>
              <p className="text-gray-500">Precio unitario</p>
              <p className="font-medium">
                ${ventas.precio_unitario.toFixed(2)}
              </p>
            </div>
          </div>
        
          {/* Totales */}
          <div className="mt-4 border-t pt-4 flex items-center justify-between">
            <p className="text-gray-500 text-sm">
              {new Date(ventas.fecha_venta).toLocaleDateString('es-MX')}
            </p>
        
            <p className="text-lg font-bold text-green-600">
              ${ventas.total.toLocaleString('es-MX', {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        
          {/* Flags */}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {ventas.es_paquete_varios && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                Paquete
              </span>
            )}
            {ventas.venta_publicidad && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                Publicidad
              </span>
            )}
            {ventas.negocio && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                Negocio
              </span>
            )}
            {ventas.reclamo_abierto && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                Reclamo abierto
              </span>
            )}
          </div>
        </div>
        
        ))}
        
        {ventas.length === 0 && (
          <p className="text-gray-500">No hay ventas encontradas.</p>
        )}
      </div>
    </main>
  )
};