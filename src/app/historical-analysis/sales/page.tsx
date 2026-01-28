'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ventas as VentasType } from '@/types/database';

export default function VentasPage() {
  const [ventasData, setVentasData] = useState<VentasType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVentas = async () => {
      setLoading(true);
      setError(null);
      
      if (!supabase) {
        setError("Supabase client is not available. Check your configuration.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .order('fecha_venta', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching ventas:', error);
        setError(error.message);
        setVentasData([]);
      } else if (data) {
        setVentasData(data as VentasType[]);
      }
      
      setLoading(false);
    };

    fetchVentas();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Cargando ventas...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }
  
  if (ventasData.length === 0) {
    return <div className="p-8 text-center text-gray-500">No se encontraron ventas.</div>;
  }

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Historial de Ventas</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ventasData.map((ventas) => (
           <div
              key={ventas.id}
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
                    ${(ventas.precio_unitario || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Totales */}
              <div className="mt-4 border-t pt-4 flex items-center justify-between">
                <p className="text-gray-500 text-sm">
                  {new Date(ventas.fecha_venta).toLocaleDateString('es-MX')}
                </p>

                <p className="text-lg font-bold text-green-600">
                  ${(ventas.total || 0).toLocaleString('es-MX', {
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
      </div>
    </main>
  );
}
