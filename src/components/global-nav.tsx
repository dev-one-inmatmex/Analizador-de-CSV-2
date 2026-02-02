'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import Link from 'next/link';

export default function GlobalNav() {
  const navLinks = [
    { href: '/', label: 'Analizador de Datos CSV' },    
    { href: '/historical-analysis/sales', label: 'Análisis de Ventas' },
    { href: '/historical-analysis/inventory', label: 'Análisis de Inventario' },
    { href: '/historical-analysis/operations', label: 'Análisis de Adquisiciones' },
    { href: '/historical-analysis/products', label: 'Análisis de Publicaciones' },
    { href: '/historical-analysis/sku-publication-count', label: 'SKUs por Publicación' },
    { href: '/historical-analysis/sku-publication-map', label: 'SKU a Producto Madre' },
    { href: '/historical-analysis/mother-catalog', label: 'Catálogo Madre' },
    { href: '/historical-analysis/trends-prediction', label: 'Predicción de Tendencias' },
    { href: '/historical-analysis/major-minor-sales', label: 'Ventas por Mayor y Menor' },
    { href: '/historical-analysis/access-management', label: 'Gestión de Accesos' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menú de navegación</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {navLinks.map((link) => (
          <DropdownMenuItem key={link.href} asChild>
            <Link href={link.href}>{link.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
