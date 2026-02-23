'use client';

import React, { useState, useMemo } from 'react';
import { 
  UploadCloud, Loader2, Database, RefreshCcw, 
  CheckCircle, FileSpreadsheet, Layers, ArrowRight, ArrowLeft, Eye, PlayCircle, AlertTriangle,
  PlusCircle, Edit3, MinusCircle, Save, FileText, Undo2
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const TABLE_SCHEMAS: Record<string, { pk: string; columns: string[] }> = {
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
    gastos_diarios: { 
        pk: 'id', 
        columns: [
            'id', 'fecha', 'empresa', 'tipo_transaccion', 'tipo_gasto_impacto', 
            'area_funcional', 'categoria_macro', 'subcategoria_especifica', 
            'canal_asociado', 'clasificacion_operativa', 'es_fijo', 
            'es_recurrente', 'monto', 'metodo_pago', 'banco', 'cuenta', 
            'responsable', 'descripcion', 'notas'
        ] 
    },
    sku_m: { 
        pk: 'sku_mdr', 
        columns: ['sku_mdr', 'cat_mdr', 'piezas_por_sku', 'sku', 'piezas_xcontenedor', 'bodega', 'bloque', 'landed_cost'] 
    },
    sku_costos: { 
        pk: 'id', 
        columns: ['id', 'sku_mdr', 'landed_cost', 'fecha_desde', 'proveedor', 'piezas_xcontenedor', 'sku', 'esti_time'] 
    },
    publi_tienda: { 
        pk: 'num_publi', 
        columns: ['num_publi', 'sku', 'num_producto', 'titulo', 'status', 'cat_mdr', 'costo', 'tienda'] 
    },
    publi_xsku: { 
        pk: 'sku', 
        columns: ['sku', 'num_publicaciones'] 
    },
};

const IGNORE_COLUMN_VALUE = '--ignore-this-column--';

function parseValue(key: string, value: any): any {
    if (value === undefined || value === null || String(value).trim() === '' || String(value).toLowerCase() === 'null') return null;
    const str = String(value).trim();
    
    const numericFields = [
        'monto', 'total', 'unidades', 'price', 'landed_cost', 'costo_envio', 
        'piezas_por_sku', 'num_publicaciones', 'piezas_totales', 'esti_time', 
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

type Step = 'upload' | 'converting' | 'sheet-selection' | 'table-selection' | 'mapping' | 'analyzing' | 'preview' | 'syncing' | 'results';

export default function CsvUploader() {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [sheets, setSheets] = useState<string[]>([]);
    const [conversionProgress, setConversionProgress] = useState(0);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[][]>([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [headerMap, setHeaderMap] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    
    const [categorizedData, setCategorizedData] = useState<{
        new: any[],
        update: any[],
        unchanged: any[]
    }>({ new: [], update: [], unchanged: [] });

    const [syncResult, setSyncResult] = useState<{
        inserted: any[], 
        updated: any[], 
        unchanged: any[],
        errors: { batch: number, msg: string }[]
    } | null>(null);

    const handleTableSelect = (table: string) => {
        setSelectedTable(table);
        const schema = TABLE_SCHEMAS[table];
        const map: Record<number, string> = {};
        const usedColumns = new Set<string>();

        headers.forEach((h, i) => {
            const cleanHeader = h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            const match = schema.columns.find(c => {
                const cleanCol = c.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                return (cleanCol === cleanHeader || c.toLowerCase() === h.toLowerCase().replace(/\s/g, '_')) && !usedColumns.has(c);
            });

            if (match) {
                map[i] = match;
                usedColumns.add(match);
            } else {
                map[i] = IGNORE_COLUMN_VALUE;
            }
        });

        setHeaderMap(map);
        setCurrentStep('mapping');
    };

    const usedDbColumns = useMemo(() => {
        return new Set(Object.values(headerMap).filter(v => v !== IGNORE_COLUMN_VALUE));
    }, [headerMap]);

    const activeDbColumns = useMemo(() => {
        return Array.from(usedDbColumns);
    }, [usedDbColumns]);

    const performAnalysis = async () => {
        setIsLoading(true);
        setCurrentStep('analyzing');
        const schema = TABLE_SCHEMAS[selectedTable];
        
        try {
            // 1. Convertir todas las filas en objetos mapeados
            const allRecords = rawRows.map(row => {
                const obj: any = {};
                headers.forEach((_, headerIndex) => {
                    const colName = headerMap[headerIndex];
                    if (colName && colName !== IGNORE_COLUMN_VALUE) {
                        obj[colName] = parseValue(colName, row[headerIndex]);
                    }
                });
                return obj;
            });

            // 2. Extraer PKs para consulta
            const pks = allRecords.map(r => r[schema.pk]).filter(Boolean);
            
            // 3. Consultar datos existentes en lotes
            const existingDataMap = new Map<string, any>();
            const FETCH_BATCH_SIZE = 500;
            if (supabase) {
                for (let i = 0; i < pks.length; i += FETCH_BATCH_SIZE) {
                    const pkBatch = pks.slice(i, i + FETCH_BATCH_SIZE);
                    const { data } = await supabase.from(selectedTable).select('*').in(schema.pk, pkBatch);
                    data?.forEach(row => existingDataMap.set(String(row[schema.pk]), row));
                }
            }

            // 4. Clasificación Diferencial (Deep Compare)
            const newRecs: any[] = [];
            const updateRecs: any[] = [];
            const unchangedRecs: any[] = [];

            allRecords.forEach(record => {
                const pkValue = String(record[schema.pk]);
                const existing = existingDataMap.get(pkValue);

                if (!existing) {
                    newRecs.push(record);
                } else {
                    let isDifferent = false;
                    for (const col of activeDbColumns) {
                        const newVal = record[col];
                        const oldVal = existing[col];
                        
                        // Comparación simple de valores (convertidos a string para normalizar nulls/empty)
                        if (String(newVal ?? '') !== String(oldVal ?? '')) {
                            isDifferent = true;
                            break;
                        }
                    }

                    if (isDifferent) updateRecs.push(record);
                    else unchangedRecs.push(record);
                }
            });

            setCategorizedData({ new: newRecs, update: updateRecs, unchanged: unchangedRecs });
            setCurrentStep('preview');
        } catch (e: any) {
            toast({ title: 'Error de análisis', description: e.message, variant: 'destructive' });
            setCurrentStep('mapping');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async (mode: 'new' | 'update' | 'all') => {
        setIsLoading(true);
        setCurrentStep('syncing');
        const schema = TABLE_SCHEMAS[selectedTable];
        
        let recordsToProcess: any[] = [];
        if (mode === 'new') recordsToProcess = categorizedData.new;
        else if (mode === 'update') recordsToProcess = categorizedData.update;
        else recordsToProcess = [...categorizedData.new, ...categorizedData.update];

        const inserted: any[] = [];
        const updated: any[] = [];
        const unchanged: any[] = [...categorizedData.unchanged];
        const errors: { batch: number, msg: string }[] = [];

        if (supabase && recordsToProcess.length > 0) {
            const SYNC_BATCH_SIZE = 50;
            for (let i = 0; i < recordsToProcess.length; i += SYNC_BATCH_SIZE) {
                const batch = recordsToProcess.slice(i, i + SYNC_BATCH_SIZE);
                const { error } = await supabase.from(selectedTable).upsert(batch, { onConflict: schema.pk });
                
                if (error) {
                    errors.push({ batch: Math.floor(i / SYNC_BATCH_SIZE) + 1, msg: error.message });
                } else {
                    // Si el modo era 'all' o combinados, repartimos para el reporte final
                    batch.forEach(r => {
                        const isNew = categorizedData.new.some(n => n[schema.pk] === r[schema.pk]);
                        if (isNew) inserted.push(r);
                        else updated.push(r);
                    });
                }
            }
        }

        setSyncResult({ inserted, updated, unchanged, errors });
        setCurrentStep('results');
        setIsLoading(false);
    };

    const processFile = (f: File) => {
        const isExcel = f.name.endsWith('.xlsx') || f.name.endsWith('.xls');
        if (isExcel) {
            setCurrentStep('converting');
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

    const reset = () => {
        setWorkbook(null);
        setSheets([]);
        setHeaders([]);
        setRawRows([]);
        setConversionProgress(0);
        setSelectedTable('');
        setHeaderMap({});
        setCategorizedData({ new: [], update: [], unchanged: [] });
        setSyncResult(null);
        setCurrentStep('upload');
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
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
                        <CardDescription className="mt-2">¿En qué tabla de la base de datos deseas guardar la información?</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 pb-12">
                        <div className="max-w-md mx-auto space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre de Tabla (DB)</Label>
                            <Select onValueChange={handleTableSelect} value={selectedTable}>
                                <SelectTrigger className="h-14 border-slate-200 shadow-sm text-base font-bold bg-white rounded-xl">
                                    <SelectValue placeholder="Selecciona la tabla destino..." />
                                </SelectTrigger>
                                <SelectContent className="border-none shadow-2xl rounded-xl">
                                    {Object.keys(TABLE_SCHEMAS).map(table => (
                                        <SelectItem key={table} value={table} className="py-3 font-bold uppercase text-xs">{table}</SelectItem>
                                    ))}
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
                                                    <span className="text-[10px] text-muted-foreground font-medium">Ejemplo: {rawRows[0]?.[i] || 'Vacío'}</span>
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
                                                        {TABLE_SCHEMAS[selectedTable].columns.map(c => {
                                                            const isAlreadyUsed = usedDbColumns.has(c) && headerMap[i] !== c;
                                                            return (
                                                                <SelectItem 
                                                                    key={c} 
                                                                    value={c} 
                                                                    disabled={isAlreadyUsed}
                                                                    className={cn("text-[10px] font-bold uppercase py-2.5", isAlreadyUsed && "opacity-30")}
                                                                >
                                                                    {c.replace(/_/g, ' ')} {isAlreadyUsed && '(Ya asignada)'}
                                                                </SelectItem>
                                                            );
                                                        })}
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
                        <Button onClick={performAnalysis} className="w-full h-16 font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 rounded-xl">
                            <Eye className="mr-3 h-6 w-6" /> Iniciar Análisis Diferencial
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 'analyzing' && (
                <Card className="border-none shadow-xl bg-white text-center p-20">
                    <CardContent className="space-y-6">
                        <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Analizando Archivo</h3>
                            <p className="text-muted-foreground font-medium">Comparando {rawRows.length} registros con la base de datos...</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep === 'preview' && (
                <Card className="border-none shadow-2xl bg-white animate-in slide-in-from-bottom-4 duration-500 overflow-hidden relative">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 px-8 py-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-primary/10 text-primary uppercase text-[9px] font-black tracking-widest border-none px-2">Análisis de Integridad</Badge>
                                <CardTitle className="text-xl font-black uppercase tracking-tighter">Paso 3: Resultados del Análisis</CardTitle>
                            </div>
                            <CardDescription>Revisa los cambios detectados y elige qué acción sincronizar con la base de datos.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={reset} className="font-bold text-[10px] uppercase border-slate-200">
                            <Undo2 className="mr-2 h-3 w-3" /> Empezar de Nuevo
                        </Button>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                        <Tabs defaultValue="nuevos" className="w-full">
                            <div className="px-8 bg-muted/10 border-b">
                                <TabsList className="h-14 w-full bg-transparent p-0 gap-8 justify-start">
                                    <TabsTrigger value="nuevos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-full font-bold uppercase text-[11px] tracking-tighter transition-all">
                                        Nuevos ({categorizedData.new.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="actualizar" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-full font-bold uppercase text-[11px] tracking-tighter transition-all">
                                        A Actualizar ({categorizedData.update.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="sin-cambios" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-full font-bold uppercase text-[11px] tracking-tighter transition-all">
                                        Sin Cambios ({categorizedData.unchanged.length})
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {['nuevos', 'actualizar', 'sin-cambios'].map((tab) => (
                                <TabsContent key={tab} value={tab} className="mt-0">
                                    <ScrollArea className="h-[450px] w-full border-b">
                                        <div className="min-w-full inline-block align-middle">
                                            <Table className="border-collapse">
                                                <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
                                                    <TableRow className="h-12 border-b">
                                                        {activeDbColumns.map((col) => (
                                                            <TableHead key={col} className="border-r last:border-r-0 font-black text-[10px] uppercase tracking-wider px-4 h-12 whitespace-nowrap bg-white">
                                                                {col}
                                                            </TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(tab === 'nuevos' ? categorizedData.new : tab === 'actualizar' ? categorizedData.update : categorizedData.unchanged).length > 0 ? (
                                                        (tab === 'nuevos' ? categorizedData.new : tab === 'actualizar' ? categorizedData.update : categorizedData.unchanged).map((row, rowIndex) => (
                                                            <TableRow key={rowIndex} className="h-12 hover:bg-muted/5 group transition-colors">
                                                                {activeDbColumns.map((col) => (
                                                                    <TableCell key={col} className="border-r last:border-r-0 px-4 text-[10px] font-medium max-w-[250px] truncate group-hover:whitespace-normal group-hover:break-all">
                                                                        {String(row[col] ?? '-')}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={activeDbColumns.length} className="h-32 text-center text-muted-foreground font-bold uppercase text-xs">
                                                                No se encontraron registros en esta categoría.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        <ScrollBar orientation="horizontal" />
                                    </ScrollArea>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>

                    <CardFooter className="p-8 bg-slate-50 flex flex-col gap-6">
                        <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                            <Button 
                                onClick={() => handleSync('new')} 
                                className="h-14 px-8 bg-[#3E6053] hover:bg-[#2D4A3F] text-white font-bold uppercase text-[11px] tracking-widest rounded-xl shadow-lg flex-1"
                                disabled={isLoading || categorizedData.new.length === 0}
                            >
                                <Database className="mr-2 h-5 w-5" /> Insertar Nuevos
                            </Button>
                            <Button 
                                onClick={() => handleSync('update')} 
                                className="h-14 px-8 bg-[#3E6053] hover:bg-[#2D4A3F] text-white font-bold uppercase text-[11px] tracking-widest rounded-xl shadow-lg flex-1"
                                disabled={isLoading || categorizedData.update.length === 0}
                            >
                                <RefreshCcw className="mr-2 h-5 w-5" /> Actualizar Duplicados
                            </Button>
                            <Button 
                                onClick={() => handleSync('all')} 
                                className="h-14 px-8 bg-[#3E6053] hover:bg-[#2D4A3F] text-white font-bold uppercase text-[11px] tracking-widest rounded-xl shadow-lg flex-1"
                                disabled={isLoading || (categorizedData.new.length === 0 && categorizedData.update.length === 0)}
                            >
                                <Save className="mr-2 h-5 w-5" /> Aplicar Todo
                            </Button>
                        </div>
                    </CardFooter>

                    {/* Notification summarizing the analysis */}
                    <div className="absolute bottom-4 right-4 bg-white border border-slate-100 rounded-xl shadow-2xl p-5 max-w-sm animate-in slide-in-from-right-4 z-20">
                        <h4 className="font-black text-sm mb-1 uppercase tracking-tight">Análisis Completo</h4>
                        <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                            Se encontraron <span className="font-bold text-primary">{categorizedData.new.length}</span> registros nuevos, 
                            <span className="font-bold text-primary"> {categorizedData.update.length}</span> para actualizar, 
                            y <span className="font-bold text-primary">{categorizedData.unchanged.length}</span> sin cambios.
                        </p>
                    </div>
                </Card>
            )}

            {currentStep === 'syncing' && (
                <Card className="border-none shadow-xl bg-white text-center p-20 animate-pulse">
                    <CardContent className="space-y-6">
                        <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Inyectando Datos</h3>
                            <p className="text-muted-foreground font-medium">Sincronizando registros con la tabla {selectedTable}...</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep === 'results' && syncResult && (
                <div className="space-y-6 animate-in zoom-in-95 duration-300 w-full">
                    <Card className="border-none shadow-2xl overflow-hidden rounded-3xl">
                        <div className={cn(
                            "p-12 text-white text-center",
                            syncResult.errors.length > 0 ? "bg-amber-600" : "bg-[#2D5A4C]"
                        )}>
                            <div className="mx-auto h-20 w-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
                                {syncResult.errors.length > 0 ? <AlertTriangle className="h-12 w-12 text-white" /> : <CheckCircle className="h-12 w-12 text-white" />}
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">
                                {syncResult.errors.length > 0 ? 'Sincronización con Advertencias' : '¡Sincronización Completada!'}
                            </h2>
                            <p className="text-white/80 font-bold uppercase tracking-widest text-sm">Resumen de Auditoría: {rawRows.length} registros analizados</p>
                        </div>
                        <CardContent className="p-8 bg-white space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                                <div className="p-6 rounded-2xl bg-green-50 border border-green-100">
                                    <div className="flex justify-center mb-2"><PlusCircle className="h-5 w-5 text-green-600" /></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1">Inyectados (Nuevos)</p>
                                    <p className="text-4xl font-black text-green-800">{syncResult.inserted.length}</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100">
                                    <div className="flex justify-center mb-2"><Edit3 className="h-5 w-5 text-blue-600" /></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Sobrescritos (Existentes)</p>
                                    <p className="text-4xl font-black text-blue-800">{syncResult.updated.length}</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="flex justify-center mb-2"><MinusCircle className="h-5 w-5 text-slate-400" /></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Sin Cambios</p>
                                    <p className="text-4xl font-black text-slate-600">{syncResult.unchanged.length}</p>
                                </div>
                            </div>

                            <Tabs defaultValue="nuevos" className="w-full">
                                <TabsList className="grid w-full grid-cols-3 bg-muted/20 p-1 h-12">
                                    <TabsTrigger value="nuevos" className="font-bold text-xs uppercase tracking-tight">Nuevos ({syncResult.inserted.length})</TabsTrigger>
                                    <TabsTrigger value="actualizados" className="font-bold text-xs uppercase tracking-tight">Actualizados ({syncResult.updated.length})</TabsTrigger>
                                    <TabsTrigger value="sin-cambios" className="font-bold text-xs uppercase tracking-tight">Ignorados ({syncResult.unchanged.length})</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="nuevos" className="mt-4 border rounded-xl overflow-hidden bg-white">
                                    <ScrollArea className="h-[300px]">
                                        <Table>
                                            <TableHeader className="bg-muted/10 sticky top-0 z-10"><TableRow className="h-10">
                                                {activeDbColumns.map(col => <TableHead key={col} className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{col}</TableHead>)}
                                            </TableRow></TableHeader>
                                            <TableBody>
                                                {syncResult.inserted.length > 0 ? syncResult.inserted.map((r, i) => (
                                                    <TableRow key={i} className="h-10 hover:bg-green-50/30">
                                                        {activeDbColumns.map(col => <TableCell key={col} className="text-[9px] font-medium whitespace-nowrap">{String(r[col] ?? '-')}</TableCell>)}
                                                    </TableRow>
                                                )) : <TableRow><TableCell colSpan={activeDbColumns.length} className="text-center py-10 text-muted-foreground text-xs font-bold uppercase italic">No se inyectaron registros nuevos</TableCell></TableRow>}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="actualizados" className="mt-4 border rounded-xl overflow-hidden bg-white">
                                    <ScrollArea className="h-[300px]">
                                        <Table>
                                            <TableHeader className="bg-muted/10 sticky top-0 z-10"><TableRow className="h-10">
                                                {activeDbColumns.map(col => <TableHead key={col} className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{col}</TableHead>)}
                                            </TableRow></TableHeader>
                                            <TableBody>
                                                {syncResult.updated.length > 0 ? syncResult.updated.map((r, i) => (
                                                    <TableRow key={i} className="h-10 hover:bg-blue-50/30">
                                                        {activeDbColumns.map(col => <TableCell key={col} className="text-[9px] font-medium whitespace-nowrap">{String(r[col] ?? '-')}</TableCell>)}
                                                    </TableRow>
                                                )) : <TableRow><TableCell colSpan={activeDbColumns.length} className="text-center py-10 text-muted-foreground text-xs font-bold uppercase italic">No hubo actualizaciones</TableCell></TableRow>}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="sin-cambios" className="mt-4 border rounded-xl overflow-hidden bg-white">
                                    <ScrollArea className="h-[300px]">
                                        <Table>
                                            <TableHeader className="bg-muted/10 sticky top-0 z-10"><TableRow className="h-10">
                                                {activeDbColumns.map(col => <TableHead key={col} className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{col}</TableHead>)}
                                            </TableRow></TableHeader>
                                            <TableBody>
                                                {syncResult.unchanged.length > 0 ? syncResult.unchanged.map((r, i) => (
                                                    <TableRow key={i} className="h-10 opacity-60">
                                                        {activeDbColumns.map(col => <TableCell key={col} className="text-[9px] font-medium whitespace-nowrap">{String(r[col] ?? '-')}</TableCell>)}
                                                    </TableRow>
                                                )) : <TableRow><TableCell colSpan={activeDbColumns.length} className="text-center py-10 text-muted-foreground text-xs font-bold uppercase italic">Todos los registros fueron procesados</TableCell></TableRow>}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                            
                            {syncResult.errors.length > 0 && (
                                <div className="mt-8 space-y-4">
                                    <div className="flex items-center justify-between ml-1">
                                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-700">Detalle de Errores Técnicos:</h3>
                                        <Badge variant="destructive" className="text-[10px] font-black uppercase tracking-widest">{syncResult.errors.length} anomalías</Badge>
                                    </div>
                                    <div className="border rounded-2xl p-4 bg-slate-50 space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
                                        {syncResult.errors.map((err, i) => (
                                            <div key={i} className="p-5 rounded-xl bg-white border border-red-100 shadow-sm animate-in fade-in slide-in-from-left-2 duration-300">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0" />
                                                    <div className="space-y-1.5">
                                                        <p className="font-black text-destructive text-[11px] uppercase tracking-tighter leading-none">Error en Lote #{err.batch}</p>
                                                        <p className="text-slate-600 text-xs font-medium leading-relaxed">{err.msg}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mt-10">
                                <Button variant="outline" className="h-14 font-black uppercase text-xs border-slate-200 rounded-xl" onClick={reset}>
                                    <RefreshCcw className="mr-2 h-4 w-4" /> Procesar otro archivo
                                </Button>
                                <Button className="h-14 font-black uppercase text-xs rounded-xl shadow-lg" onClick={() => window.location.reload()}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Finalizar y salir
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
