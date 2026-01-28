// app/components/ProductList.tsx
'use client' // Importante para usar hooks

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Definimos un tipo simple si no generaste los automáticos
type Producto = {
  id: number
  nombre: string
  precio: number
}

export default function getVentas() {
  const [productos, setProductos] = useState<Producto[]>([])

  useEffect(() => {
    const fetchProductos = async () => {
      const { data, error } = await supabase
        .from('productos') // TypeScript aquí sabrá si 'productos' existe
        .select('id, nombre, precio') // Y aquí te autocompleta las columnas
      
      if (data) setProductos(data)
    }

    fetchProductos()
  }, [])

  return (
    <div className="flex flex-col gap-2">
      {productos.map((prod) => (
        <div key={prod.id} className="border-b border-gray-200 p-2 text-slate-700">
          {prod.nombre} - <span className="font-bold">${prod.precio}</span>
        </div>
      ))}
    </div>
  )
}
