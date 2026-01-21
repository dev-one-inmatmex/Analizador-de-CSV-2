'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import Link from 'next/link';

export default function GlobalNav() {
  const navLinks = [
    { href: '/', label: 'Analizador de CSV' },
    { href: '/historical-analysis', label: 'Menú de Análisis' },
    { href: '/historical-analysis/sales', label: 'Análisis de Ventas' },
    { href: '/historical-analysis/inventory', label: 'Análisis de Inventario' },
    { href: '/historical-analysis/operations', label: 'Rendimiento Operativo' },
    { href: '/historical-analysis/products', label: 'Análisis de Productos' },
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
        <DropdownMenuLabel>Navegación Rápida</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {navLinks.map((link) => (
          <Link href={link.href} passHref key={link.href}>
            <DropdownMenuItem asChild>
              <a>{link.label}</a>
            </DropdownMenuItem>
          </Link>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
