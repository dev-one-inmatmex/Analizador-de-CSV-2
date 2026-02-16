import { SidebarTrigger } from '@/components/ui/sidebar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wrench } from 'lucide-react';

export default function OperationsDashboardPage() {
    return (
        <>
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
                <div className="flex items-center gap-4">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold tracking-tight">Dashboard de Gastos</h1>
                </div>
            </header>
            <main className="flex flex-1 items-center justify-center p-4">
                <Alert className="max-w-md">
                    <Wrench className="h-4 w-4" />
                    <AlertTitle>En Construcción</AlertTitle>
                    <AlertDescription>
                        El dashboard de gastos está siendo desarrollado.
                    </AlertDescription>
                </Alert>
            </main>
        </>
    )
}
