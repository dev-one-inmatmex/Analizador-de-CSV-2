'use client';

import { ArrowLeft, Users, UserPlus, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

// --- MOCK DATA ---
const initialUsersData = [
  { id: 'usr_001', name: 'Ana García', email: 'ana.garcia@example.com', role: 'Administrador', status: 'Activo', lastLogin: 'Hoy, 9:30 AM' },
  { id: 'usr_002', name: 'Carlos Reyes', email: 'carlos.reyes@example.com', role: 'Analista', status: 'Activo', lastLogin: 'Ayer, 3:15 PM' },
  { id: 'usr_003', name: 'Laura Fernández', email: 'laura.fernandez@example.com', role: 'Operador', status: 'Activo', lastLogin: 'Hace 3 días' },
  { id: 'usr_004', name: 'Pedro Morales', email: 'pedro.morales@example.com', role: 'Operador', status: 'Inactivo', lastLogin: 'Hace 2 semanas' },
];

type User = typeof initialUsersData[0];

export default function AccessManagementPage() {
    const allPermissions = [
        { id: 'sales', label: 'Análisis de Ventas', description: 'Acceso completo al dashboard de ventas.' },
        { id: 'inventory', label: 'Análisis de Inventario', description: 'Ver y gestionar el inventario.' },
        { id: 'operations', label: 'Rendimiento Operativo', description: 'Monitorizar la eficiencia operativa.' },
        { id: 'products', label: 'Análisis de Productos', description: 'Analizar el ciclo de vida de productos.' },
        { id: 'trends', label: 'Predicción de Tendencias', description: 'Acceder a las predicciones de la IA.' },
        { id: 'major-minor', label: 'Ventas por Mayor y Menor', description: 'Segmentar y analizar ventas por volumen.' },
        { id: 'access-management', label: 'Gestión de Accesos', description: 'Administrar usuarios y roles (solo admin).' },
        { id: 'virtual-check', label: 'Check Virtual', description: 'Usar y gestionar el check virtual de procesos.' },
    ];
    const roles = ['Administrador', 'Analista', 'Operador'];

    const [users, setUsers] = React.useState<User[]>(initialUsersData);
    const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [newRole, setNewRole] = React.useState('');
    const [newName, setNewName] = React.useState('');
    const [newEmail, setNewEmail] = React.useState('');


    const [permissions, setPermissions] = React.useState<{ [key: string]: Set<string> }>({
        Administrador: new Set(allPermissions.map(p => p.id)),
        Analista: new Set(['sales', 'inventory', 'operations', 'products', 'trends', 'major-minor']),
        Operador: new Set(['virtual-check', 'inventory']),
    });

    const handlePermissionChange = (role: string, permissionId: string, checked: boolean) => {
        setPermissions(prev => {
            const newRolePermissions = new Set(prev[role]);
            if (checked) {
                newRolePermissions.add(permissionId);
            } else {
                newRolePermissions.delete(permissionId);
            }
            return {
                ...prev,
                [role]: newRolePermissions,
            };
        });
    };

    const handleEditUserClick = (user: User) => {
        setSelectedUser(user);
        setNewName(user.name);
        setNewEmail(user.email);
        setNewRole(user.role);
        setIsEditDialogOpen(true);
    };

    const handleUserUpdate = () => {
        if (selectedUser) {
            setUsers(users.map(u => u.id === selectedUser.id ? { ...u, name: newName, email: newEmail, role: newRole } : u));
            setIsEditDialogOpen(false);
            setSelectedUser(null);
        }
    };


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/historical-analysis" passHref>
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Volver</span></Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Gestión de Accesos y Roles</h1>
        </div>
        <Link href="/historical-analysis/access-management/new-user" passHref>
            <Button><UserPlus className="mr-2 h-4 w-4" /> Añadir Nuevo Usuario</Button>
        </Link>
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
                    {users.map((user) => (
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
                              <DropdownMenuItem onClick={() => handleEditUserClick(user)}>Editar Usuario</DropdownMenuItem>
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
            <Card>
                <CardHeader>
                    <CardTitle>Configuración de Roles y Permisos</CardTitle>
                    <CardDescription>
                    Activa o desactiva el acceso a los módulos para cada rol. Los cambios no se guardarán permanentemente en esta demo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table className="min-w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[350px] min-w-[350px]">Módulo / Permiso</TableHead>
                                    {roles.map(role => (
                                        <TableHead key={role} className="w-40 text-center">{role}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allPermissions.map(permission => (
                                    <TableRow key={permission.id}>
                                        <TableCell>
                                            <div className="font-medium">{permission.label}</div>
                                            <div className="text-sm text-muted-foreground">{permission.description}</div>
                                        </TableCell>
                                        {roles.map(role => (
                                            <TableCell key={role} className="text-center">
                                                <Switch
                                                    checked={permissions[role as keyof typeof permissions].has(permission.id)}
                                                    onCheckedChange={(checked) => handlePermissionChange(role, permission.id, checked)}
                                                    aria-label={`Permiso de ${permission.label} para ${role}`}
                                                    disabled={role === 'Administrador'}
                                                />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button>Guardar Cambios</Button>
                </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Usuario</DialogTitle>
                    <DialogDescription>
                        Modifica los datos y el rol para <span className="font-medium">{selectedUser?.name}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Nombre Completo</Label>
                        <Input id="edit-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-email">Correo Electrónico</Label>
                        <Input id="edit-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role-select">Rol de Usuario</Label>
                        <Select value={newRole} onValueChange={setNewRole}>
                            <SelectTrigger id="role-select">
                                <SelectValue placeholder="Seleccionar un rol" />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map(role => (
                                    <SelectItem key={role} value={role} disabled={role === 'Administrador'}>{role}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleUserUpdate}>Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
