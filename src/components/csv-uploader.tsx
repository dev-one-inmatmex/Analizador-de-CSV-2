'use client';

import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, File as FileIcon, X, Loader2, Database, RefreshCcw, 
  CheckCircle, FileSpreadsheet, Layers, ArrowRight, ArrowLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const TABLE_SCHEMAS: Record<string, { pk: string; columns: string[] }> = {
    gastos_diarios: { 
        pk: 'id', 
        columns: [
            'id', 'fecha', 'empresa', 'tipo_transaccion', 'tipo_gasto_impacto', 
            'area_funcional', 'categoria_macro', 'subcategoria_especifica', 
            'canal_asociado', 'clasificacion_operativa', 'es_fijo', 
            'es_recurrente', 'monto', 'metodo_pago', 'metodo_pago_especificar', 
            'banco', 'banco_especificar', 'cuenta', 'cuenta_especificar', 
            'responsable', 'descripcion', 'notas'
        ] 
    },
    ml_sales: { 
        pk: 'num_venta', 
        columns: [
            'num_venta', 'fecha_venta', 'status', 'desc_status', 'paquete_varios', 
            'pertenece_kit', 'unidades', 'ing_xunidad', 'cargo_venta', 'ing_xenvio', 
            'costo_envio', 'costo_enviomp', 'cargo_difpeso', 'anu_reembolsos', 'total', 
            'venta_xpublicidad', 'sku', 'num_publi', 'tienda', 'tit_pub', 'variante', 
            'price', 'tip_publi', 'factura_a', 'datos_poe', 'tipo_ndoc', 'direccion', 
            't_contribuyente', 'cfdi', 't_usuario', 'r_fiscal', 'comprador', 'negocio', 
            'ife', 'domicilio', 'mun_alcaldia', 'estado', 'c_postal', 'pais', 'f_entrega', 
            'f_camino', 'f_entregado', 'transportista', 'num_seguimiento', 'url_seguimiento', 
            'unidades_2', 'f_entrega2', 'f_camino2', 'f_entregado2', 'transportista2', 
            'num_seguimiento2', 'url_seguimiento2', 'revisado_xml', 'f_revision3', 
            'd_afavor', 'resultado', 'destino', 'motivo_resul', 'unidades_3', 
            'r_abierto', 'r_cerrado', 'c_mediacion'
        ] 
    },
    sku_m: { pk: 'sku_mdr', columns: ['sku_mdr', 'cat_mdr', 'piezas_por_sku', 'sku', 'piezas_xcontenedor', 'bodega', 'bloque', 'landed_cost'] },
    sku_costos: { pk: 'id', columns: ['id', 'sku_mdr', 'landed_cost', 'fecha_desde', 'proveedor', 'piezas_xcontenedor', 'sku', 'esti_time'] },
    sku_alterno: { pk: 'sku', columns: ['sku', 'sku_mdr'] },
    catalogo_madre: { pk: 'sku', columns: ['sku', 'nombre_madre', 'company'] },
    publi_tienda: { pk: 'num_publi', columns: ['num_publi', 'sku', 'num_producto', 'titulo', 'status', 'cat_mdr', 'costo', 'tienda'] },
};

const IGNORE_COLUMN_VALUE = '--ignore-this-column--';

function parseValue(key: string, value: any): any {
    if (value === undefined || value === null || String(value).trim() === '' || String(value).toLowerCase() === 'null') return null;
    const str = String(value).trim();
    
    const numericFields = [
        'monto', 'total', 'unidades', 'price', 'landed_cost', 'costo_envio', 
        'piezas_por_sku', 'rock_en_siggo', 'piezas_totales', 'esti_time', 
        'piezas_xcontenedor', 'bloque', 'costo', 'ing_xunidad', 'cargo_venta',
        'ing_xenvio', 'costo_enviomp', 'cargo_difpeso', 'anu_reembolsos', 'unidades_2', 'unidades_3'
    ];
    
    if (numericFields.includes(key)) {
        const num = parseFloat(str.replace(/,/g, '').replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? null : num;
    }

    const booleanFields = [
        'negocio', 'venta_xpublicidad', 'paquete_varios', 'pertenece_kit', 
        'r_abierto', 'r_cerrado', 'c_mediacion', 'es_fijo', 'es_recurrente'
    ];
    if (booleanFields.includes(key)) {
        const v = str.toLowerCase();
        return ['true', '1', 'si', 'sí', 'verdadero'].includes(v);
    }

    return str;
}

type Step = 'upload' | 'converting' | 'sheet-selection' | 'table-selection' | 'mapping' | 'syncing' | 'results';

export default function CsvUploader() {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [sheets, setSheets] = useState<string[]>([]);
    const [conversionProgress, setConversionProgress] = useState(0);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[][]>([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [headerMap, setHeaderMap] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [syncResult, setSyncResult] = useState<{inserted: number, updated: number, errors: any[]} | null>(null);

    const processFile = (f: File) => {
        setFile(f);
        const isExcel = f.name.endsWith('.xlsx') || f.name.endsWith('.xls');
        
        if (isExcel) {
            setCurrentStep('converting');
            // Simular progreso de conversión
            let progress = 0;
            const interval = setInterval(() => {
                progress += 15;
                if (progress >= 100) {
                    clearInterval(interval);
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const data = new Uint8Array(e.target?.result as ArrayBuffer);
                        const wb = XLSX.read(data, { type: 'array' });
                        setWorkbook(wb);
                        setSheets(wb.SheetNames);
                        setCurrentStep('sheet-selection');
                    };
                    reader.readAsArrayBuffer(f);
                } else {
                    setConversionProgress(progress);
                }
            }, 100);
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '');
                if (lines.length === 0) {
                    toast({ title: 'Archivo vacío', description: 'El archivo CSV no contiene datos.', variant: 'destructive' });
                    return;
                }
                const rows = lines.map(line => line.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
                setHeaders(rows[0]);
                setRawRows(rows.slice(1));
                setCurrentStep('table-selection');
            };
            reader.readAsText(f, 'windows-1252');
        }
    };

    const handleSheetSelect = (sheetName: string) => {
        if (!workbook) return;
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (json.length === 0) {
            toast({ title: 'Hoja vacía', description: 'La página seleccionada no tiene datos.', variant: 'destructive' });
            return;
        }
        setHeaders(json[0].map(h => String(h)));
        setRawRows(json.slice(1));
        setCurrentStep('table-selection');
    };

    const handleTableSelect = (table: string) => {
        setSelectedTable(table);
        const schema = TABLE_SCHEMAS[table];
        const map: Record<number, string> = {};
        headers.forEach((h, i) => {
            const cleanHeader = h.toLowerCase().replace(/\s/g, '_');
            const match = schema.columns.find(c => c.toLowerCase() === cleanHeader);
            map[i] = match || IGNORE_COLUMN_VALUE;
        });
        setHeaderMap(map);
        setCurrentStep('mapping');
    };

    const handleSync = async () => {
        setIsLoading(true);
        setCurrentStep('syncing');
        const schema = TABLE_SCHEMAS[selectedTable];
        let processed = 0, errors: any[] = [];

        const BATCH_SIZE = 50;
        for (let i = 0; i < rawRows.length; i += BATCH_SIZE) {
            const batch = rawRows.slice(i, i + BATCH_SIZE);
            const records = batch.map(row => {
                const obj: any = {};
                headers.forEach((_, headerIndex) => {
                    const colName = headerMap[headerIndex];
                    if (colName !== IGNORE_COLUMN_VALUE) {
                        obj[colName] = parseValue(colName, row[headerIndex]);
                    }
                });
                return obj;
            });

            const { error } = await supabase!.from(selectedTable).upsert(records, { onConflict: schema.pk });
            
            if (error) {
                errors.push({ batch: Math.floor(i / BATCH_SIZE) + 1, msg: error.message });
            } else {
                processed += records.length;
            }
        }

        setSyncResult({ inserted: 0, updated: processed, errors });
        setCurrentStep('results');
        setIsLoading(false);
    };

    const reset = () => {
        setFile(null);
        setWorkbook(null);
        setSheets([]);
        setHeaders([]);
        setRawRows([]);
        setConversionProgress(0);
        setCurrentStep('upload');
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {currentStep === 'upload' && (
                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="text-2xl font-black uppercase tracking-tighter">Cargar Archivo Maestro</CardTitle>
                        <CardDescription>Sube un archivo .csv o .xlsx para iniciar la auditoría de datos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div 
                            className="border-2 border-dashed border-primary/20 p-16 text-center rounded-2xl hover:bg-primary/5 hover:border-primary/40 transition-all cursor-pointer group" 
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            <div className="mx-auto h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <UploadCloud className="h-10 w-10 text-primary" />
                            </div>
                            <p className="mt-2 text-lg font-black uppercase tracking-tight text-slate-700">Arrastra o selecciona un archivo</p>
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Soporta CSV, Excel (.xlsx, .xls)</p>
                            <input id="file-input" type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={e => e.target.files && processFile(e.target.files[0])} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep === 'converting' && (
                <Card className="border-none shadow-xl bg-white animate-in zoom-in-95">
                    <CardContent className="p-12 text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="relative h-20 w-20 flex items-center justify-center">
                                <Loader2 className="h-20 w-20 animate-spin text-primary opacity-20" />
                                <FileSpreadsheet className="h-10 w-10 text-primary absolute" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Procesando Libro Excel</h3>
                            <p className="text-sm text-muted-foreground font-medium">Convirtiendo páginas a formato de auditoría ({conversionProgress}%)</p>
                        </div>
                        <Progress value={conversionProgress} className="h-3 w-full bg-slate-100" />
                    </CardContent>
                </Card>
            )}

            {currentStep === 'sheet-selection' && (
                <Card className="border-none shadow-xl bg-white animate-in fade-in slide-in-from-bottom-4">
                    <CardHeader className="flex flex-row items-center gap-4 border-b pb-6">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Layers className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black uppercase tracking-tighter">Selección de Página Temporal</CardTitle>
                            <CardDescription>Elige la hoja del archivo que deseas extraer para el mapeo.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-6">
                        {sheets.map((sheet) => (
                            <Button 
                                key={sheet} 
                                variant="outline" 
                                className="h-24 flex flex-col gap-2 border-slate-200 hover:border-primary hover:bg-primary/5 hover:ring-4 hover:ring-primary/5 transition-all text-left items-start p-4 rounded-xl group"
                                onClick={() => handleSheetSelect(sheet)}
                            >
                                <span className="font-black text-xs uppercase tracking-tight w-full truncate text-slate-700 group-hover:text-primary">{sheet}</span>
                                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                    <ArrowRight className="h-3 w-3" /> Extraer datos
                                </div>
                            </Button>
                        ))}
                    </CardContent>
                    <CardFooter className="bg-muted/5 py-4 border-t">
                        <Button variant="ghost" size="sm" onClick={reset} className="text-xs font-bold text-muted-foreground uppercase">
                            <RefreshCcw className="mr-2 h-3 w-3" /> Cancelar y subir otro
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 'table-selection' && (
                <Card className="border-none shadow-xl bg-white animate-in fade-in slide-in-from-right-4">
                    <CardHeader className="border-b pb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-white">
                                <Database className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-xl font-black uppercase tracking-tighter">Destino de Sincronización</CardTitle>
                        </div>
                        <CardDescription className="mt-2">¿En qué tabla de la base de datos deseas guardar la información extraída?</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 pb-12">
                        <div className="max-w-md mx-auto space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tabla de Destino</Label>
                            <Select onValueChange={handleTableSelect}>
                                <SelectTrigger className="h-14 border-slate-200 shadow-sm text-base font-bold bg-white rounded-xl">
                                    <SelectValue placeholder="Selecciona una tabla..." />
                                </SelectTrigger>
                                <SelectContent className="border-none shadow-2xl rounded-xl">
                                    <SelectItem value="ml_sales" className="py-3 font-bold uppercase text-xs">Ventas Consolidadas (ml_sales)</SelectItem>
                                    <SelectItem value="gastos_diarios" className="py-3 font-bold uppercase text-xs">Gastos Financieros (BI)</SelectItem>
                                    <SelectItem value="sku_m" className="py-3 font-bold uppercase text-xs">Catálogo Maestro (sku_m)</SelectItem>
                                    <SelectItem value="sku_costos" className="py-3 font-bold uppercase text-xs">Historial de Costos (Auditoría)</SelectItem>
                                    <SelectItem value="catalogo_madre" className="py-3 font-bold uppercase text-xs">Productos Madre</SelectItem>
                                    <SelectItem value="publi_tienda" className="py-3 font-bold uppercase text-xs">Publicaciones Activas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t py-4">
                        <Button variant="ghost" onClick={() => setCurrentStep(workbook ? 'sheet-selection' : 'upload')} className="text-xs font-bold uppercase">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 'mapping' && (
                <Card className="border-none shadow-2xl bg-white animate-in zoom-in-95 duration-300 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 px-8 py-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-primary/10 text-primary uppercase text-[9px] font-black tracking-widest hover:bg-primary/10 border-none px-2">Fase de Mapeo</Badge>
                                <CardTitle className="text-xl font-black uppercase tracking-tighter">Configuración de Columnas</CardTitle>
                            </div>
                            <CardDescription>Vincula las columnas de tu archivo con los campos reales de <strong>{selectedTable}</strong>.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setCurrentStep('table-selection')} className="font-bold text-[10px] uppercase border-slate-200">Cambiar Tabla</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[500px] overflow-y-auto">
                            <Table>
                                <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-sm">
                                    <TableRow className="border-b-0 h-12">
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest px-8">Columna del Archivo</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Campo en Base de Datos</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {headers.map((h, i) => (
                                        <TableRow key={i} className="hover:bg-muted/5 h-16 border-b-slate-100 last:border-b-0">
                                            <TableCell className="px-8">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-xs text-slate-700 uppercase">{h}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium">Ejemplo: {rawRows[0]?.[i] || 'Vacio'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-8">
                                                <Select value={headerMap[i]} onValueChange={v => setHeaderMap({...headerMap, [i]: v})}>
                                                    <SelectTrigger className={cn(
                                                        "h-10 text-[11px] rounded-lg transition-all", 
                                                        headerMap[i] === IGNORE_COLUMN_VALUE 
                                                            ? "opacity-40 border-dashed" 
                                                            : "font-black text-primary border-primary/30 bg-primary/5"
                                                    )}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-none shadow-2xl">
                                                        <SelectItem value={IGNORE_COLUMN_VALUE} className="text-[10px] italic font-bold">-- IGNORAR ESTA COLUMNA --</SelectItem>
                                                        {TABLE_SCHEMAS[selectedTable].columns.map(c => (
                                                            <SelectItem key={c} value={c} className="text-[10px] font-bold uppercase py-2.5">{c.replace(/_/g, ' ')}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="p-8 border-t bg-slate-50">
                        <Button onClick={handleSync} className="w-full h-16 font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 rounded-xl" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <Database className="mr-3 h-6 w-6" />}
                            Iniciar Sincronización Directa
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 'syncing' && (
                <Card className="border-none shadow-xl bg-white text-center p-20 animate-pulse">
                    <CardContent className="space-y-6">
                        <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Inyectando Datos</h3>
                            <p className="text-muted-foreground font-medium">Guardando registros en la tabla {selectedTable}...</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep === 'results' && syncResult && (
                <div className="space-y-6 animate-in zoom-in-95 duration-300 max-w-3xl mx-auto">
                    <Card className="border-none shadow-2xl overflow-hidden rounded-3xl">
                        <div className="bg-[#2D5A4C] p-12 text-white text-center">
                            <div className="mx-auto h-20 w-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle className="h-12 w-12 text-white" />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">¡Operación Exitosa!</h2>
                            <p className="text-white/80 font-bold uppercase tracking-widest text-sm">Auditoría de sincronización completada</p>
                        </div>
                        <CardContent className="p-12 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-center">
                                <div className="p-6 rounded-2xl bg-muted/30 border border-muted-foreground/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Registros Auditados</p>
                                    <p className="text-4xl font-black text-slate-800">{syncResult.updated}</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Tabla Destino</p>
                                    <p className="text-xl font-black text-[#2D5A4C] uppercase tracking-tighter truncate">{selectedTable}</p>
                                </div>
                            </div>
                            
                            {syncResult.errors.length > 0 && (
                                <Alert variant="destructive" className="mb-8 border-none bg-red-50">
                                    <AlertTitle className="font-black uppercase text-xs">Se detectaron {syncResult.errors.length} anomalías</AlertTitle>
                                    <AlertDescription className="text-[10px] font-medium opacity-80">
                                        Algunos registros no pudieron ser procesados por conflictos de esquema o duplicados.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <Button variant="outline" className="h-14 font-black uppercase text-xs border-slate-200 rounded-xl" onClick={reset}>Procesar otro archivo</Button>
                                <Button className="h-14 font-black uppercase text-xs rounded-xl shadow-lg" onClick={() => window.location.reload()}>Finalizar y salir</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
