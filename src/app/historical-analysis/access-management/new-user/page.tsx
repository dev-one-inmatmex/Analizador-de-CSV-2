'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function AddNewUserPage() {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Añadir Nuevo Usuario</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center gap-4 p-4 md:gap-8 md:p-10">
        <form className="w-full max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle>Información del Usuario</CardTitle>
              <CardDescription>Completa el formulario para invitar a un nuevo miembro al equipo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name">Nombre Completo</Label>
                <Input id="full-name" placeholder="Ej: Juan Pérez" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" type="email" placeholder="Ej: juan.perez@example.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol de Usuario</Label>
                <Select defaultValue="operador">
                  <SelectTrigger id="role" aria-label="Seleccionar rol">
                    <SelectValue placeholder="Seleccionar un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrador">Administrador</SelectItem>
                    <SelectItem value="analista">Analista</SelectItem>
                    <SelectItem value="operador">Operador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Link href="/historical-analysis/access-management" passHref>
                    <Button variant="outline">Cancelar</Button>
                </Link>
                <Button type="submit">Guardar y Enviar Invitación</Button>
            </CardFooter>
          </Card>
        </form>
      </main>
    </>
  );
}
