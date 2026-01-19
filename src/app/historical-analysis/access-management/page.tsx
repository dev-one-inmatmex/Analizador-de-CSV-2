'use client';

import { ArrowLeft, Users, UserPlus, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- MOCK DATA ---
const usersData = [
  { id: 'usr_001', name: 'Ana García', email: 'ana.garcia@example.com', role: 'Administrador', status: 'Activo', lastLogin: 'Hoy, 9:30 AM' },
  { id: 'usr_002', name: 'Carlos Reyes', email: 'carlos.reyes@example.com', role: 'Analista', status: 'Activo', lastLogin: 'Ayer, 3:15 PM' },
  { id: 'usr_003', name: 'Laura Fernández', email: 'laura.fernandez@example.com', role: 'Operador', status: 'Activo', lastLogin: 'Hace 3 días' },
  { id: 'usr_004', name: 'Pedro Morales', email: 'pedro.morales@example.com', role: 'Operador', status: 'Inactivo', lastLogin: 'Hace 2 semanas' },
];

const rolesData = {
    'Administrador': ['Ventas', 'Inventario', 'Operaciones', 'Productos', 'Tendencias', 'Mayor/Menor', 'Accesos', 'Check Virtual'],
    'Analista': ['Ventas', 'Inventario', 'Operaciones', 'Productos', 'Tendencias', 'Mayor/Menor'],
    'Operador': ['Check Virtual', 'Inventario (vista)'],
};

export default function AccessManagementPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/historical-analysis" passHref>
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Volver</span></Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Gestión de Accesos y Roles</h1>
        </div>
        <Button><UserPlus className="mr-2 h-4 w-4" /> Añadir Nuevo Usuario</Button>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <Tabs defaultValue="users">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="roles">Roles y Permisos</TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Usuarios</CardTitle>
                <CardDescription>Administra los usuarios de la plataforma, sus roles y su estado.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último Acceso</TableHead>
                      <TableHead><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'Activo' ? 'secondary' : 'outline'}>{user.status}</Badge>
                        </TableCell>
                        <TableCell>{user.lastLogin}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Editar Rol</DropdownMenuItem>
                              <DropdownMenuItem>Reenviar Invitación</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Desactivar Usuario</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="roles">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(rolesData).map(([role, permissions]) => (
                <Card key={role}>
                    <CardHeader>
                        <CardTitle>{role}</CardTitle>
                        <CardDescription>Este rol tiene acceso a {permissions.length} módulos.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        {permissions.map((perm) => (
                            <div key={perm} className="flex items-center justify-between rounded-md border p-3 text-sm">
                               <span>{perm}</span>
                               <Badge variant="secondary">Permitido</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
