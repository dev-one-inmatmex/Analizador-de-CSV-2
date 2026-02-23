'use client';

import React, { useState, useMemo } from 'react';
import { 
  UploadCloud, Loader2, Database, RefreshCcw, 
  CheckCircle, FileSpreadsheet, Layers, ArrowRight, ArrowLeft, Eye, PlayCircle, AlertTriangle,
  PlusCircle, Edit3, MinusCircle, Save, FileText, Undo2, X
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
        // Limpiamos símbolos de moneda y separadores de miles
        const num = parseFloat(str.replace(/[$\s]/g, '').replace(/,/g, '').replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? null : num;
    }

    const booleanFields = [
        'negocio', 'venta_xpublicidad', 'paquete_varios', 'pertenece_kit', 
        'r_abierto', 'r_cerrado', 'c_mediacion', 'es_fijo', 'es_recurrente'
    ];
    if (booleanFields.includes(key)) {
        const v = str.toLowerCase();
        return ['true', '1', 'si', 'sí', 'verdadero', 'yes'].includes(v);
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
    
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncCount, setSyncCount] = useState(0);
    const [totalToSync, setTotalToSync] = useState(0);

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
            const allRecords = rawRows.map(row => {
                const obj: any = {};
                headers.forEach((_, headerIndex) => {
                    const colName = headerMap[headerIndex];
                    if (colName && colName !== IGNORE_COLUMN_VALUE) {
                        obj[colName] = parseValue(colName, row[headerIndex]);
                    }
                });
                return obj;
            }).filter(r => !!r[schema.pk]); // Evitamos filas sin llave primaria

            const pks = allRecords.map(r => r[schema.pk]).filter(Boolean);
            const existingDataMap = new Map<string, any>();
            const FETCH_BATCH_SIZE = 500;
            
            if (supabase) {
                for (let i = 0; i < pks.length; i += FETCH_BATCH_SIZE) {
                    const pkBatch = pks.slice(i, i + FETCH_BATCH_SIZE);
                    const { data } = await supabase.from(selectedTable).select('*').in(schema.pk, pkBatch);
                    data?.forEach(row => existingDataMap.set(String(row[schema.pk]), row));
                }
            }

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
                        
                        // Comparación robusta tratando nulls y strings
                        const sNew = newVal === null ? '' : String(newVal);
                        const sOld = oldVal === null ? '' : String(oldVal);
                        
                        if (sNew !== sOld) {
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

        const total = recordsToProcess.length;
        setTotalToSync(total);
        setSyncCount(0);
        setSyncProgress(0);

        const inserted: any[] = [];
        const updated: any[] = [];
        const unchanged: any[] = [...categorizedData.unchanged];
        const errors: { batch: number, msg: string }[] = [];

        if (supabase && total > 0) {
            const SYNC_BATCH_SIZE = 50;
            for (let i = 0; i < total; i += SYNC_BATCH_SIZE) {
                const batch = recordsToProcess.slice(i, i + SYNC_BATCH_SIZE);
                const { error } = await supabase.from(selectedTable).upsert(batch, { onConflict: schema.pk });
                
                if (error) {
                    errors.push({ batch: Math.floor(i / SYNC_BATCH_SIZE) + 1, msg: error.message });
                } else {
                    batch.forEach(r => {
                        const isNew = categorizedData.new.some(n => n[schema.pk] === r[schema.pk]);
                        if (isNew) inserted.push(r);
                        else updated.push(r);
                    });
                }
                
                const currentProcessed = Math.min(i + SYNC_BATCH_SIZE, total);
                setSyncCount(currentProcessed);
                setSyncProgress(Math.round((currentProcessed / total) * 100));
            }
        }

        setSyncResult({ inserted, updated, unchanged, errors });
        setCurrentStep('results');
        setIsLoading(false);
    };

    const processFile = (f: File) => {
        const isExcel = f.name.endsWith('.xlsx') || f.name.endsWith('.xls');
        const isCsv = f.name.endsWith('.csv');

        if (isExcel || isCsv) {
            setCurrentStep('converting');
            let progress = 0;
            const interval = setInterval(() => {
                progress += 20;
                if (progress >= 100) {
                    clearInterval(interval);
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const data = new Uint8Array(e.target?.result as ArrayBuffer);
                        try {
                            const wb = XLSX.read(data, { 
                                type: 'array',
                                codepage: 1252 // Para compatibilidad con acentos en CSV de Windows
                            });
                            setWorkbook(wb);
                            setSheets(wb.SheetNames);
                            
                            if (isCsv) {
                                // Los CSV usualmente tienen una sola hoja "Sheet1"
                                handleSheetSelect(wb.SheetNames[0], wb);
                            } else {
                                setCurrentStep('sheet-selection');
                            }
                        } catch (err: any) {
                            toast({ title: 'Error de lectura', description: 'No se pudo procesar el archivo: ' + err.message, variant: 'destructive' });
                            setCurrentStep('upload');
                        }
                    };
                    reader.readAsArrayBuffer(f);
                } else {
                    setConversionProgress(progress);
                }
            }, 100);
        } else {
            toast({ title: 'Formato no soportado', description: 'Por favor sube un archivo CSV o Excel.', variant: 'destructive' });
        }
    };

    const handleSheetSelect = (sheetName: string, customWb?: XLSX.WorkBook) => {
        const targetWb = customWb || workbook;
        if (!targetWb) return;
        
        const worksheet = targetWb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];
        
        // Filtramos filas que son totalmente nulas
        const validRows = json.filter(row => row.some(cell => cell !== null && cell !== ''));
        
        if (validRows.length === 0) {
            toast({ title: 'Página vacía', description: 'La página seleccionada no contiene datos válidos.', variant: 'destructive' });
            return;
        }
        
        setHeaders(validRows[0].map(h => String(h || '')));
        setRawRows(validRows.slice(1));
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
        setSyncProgress(0);
        setSyncCount(0);
        setTotalToSync(0);
        setCurrentStep('upload');
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            {currentStep === 'upload' && (
                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="text-2xl font-black uppercase tracking-tighter text-primary">Cargar Archivo Maestro</CardTitle>
                        <CardDescription>Sube un reporte de Mercado Libre o Siggo (.csv, .xlsx) para iniciar la sincronización.</CardDescription>
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
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Soporta reportes CSV y libros Excel</p>
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
                            <h3 className="text-xl font-black uppercase tracking-tighter">Procesando Archivo</h3>
                            <p className="text-sm text-muted-foreground font-medium">Extrayendo estructura de datos técnica ({conversionProgress}%)</p>
                        </div>
                        <Progress value={conversionProgress} className="h-3 w-full bg-slate-100" />
                    </CardContent>
                </Card>
            )}

            {currentStep === 'sheet-selection' && (
                <Card className="border-none shadow-xl bg-white animate-in fade-in slide-in-from-bottom-4 relative">
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Layers className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black uppercase tracking-tighter">Selector de Página</CardTitle>
                                <CardDescription>Elige la hoja del libro Excel que deseas procesar para el mapeo.</CardDescription>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={reset} className="rounded-full h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                            <X className="h-5 w-5" />
                        </Button>
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
                                    <ArrowRight className="h-3 w-3" /> Extraer celdas
                                </div>
                            </Button>
                        ))}
                    </CardContent>
                </Card>
            )}

            {currentStep === 'table-selection' && (
                <Card className="border-none shadow-xl bg-white animate-in fade-in slide-in-from-right-4 relative">
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-white">
                                    <Database className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-xl font-black uppercase tracking-tighter">Destino de Datos</CardTitle>
                            </div>
                            <CardDescription className="mt-2 ml-[52px]">Selecciona la tabla técnica de destino en la base de datos.</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={reset} className="rounded-full h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                            <X className="h-5 w-5" />
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-8 pb-12">
                        <div className="max-w-md mx-auto space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tabla de Destino (Supabase)</Label>
                            <Select onValueChange={handleTableSelect} value={selectedTable}>
                                <SelectTrigger className="h-14 border-slate-200 shadow-sm text-base font-bold bg-white rounded-xl">
                                    <SelectValue placeholder="Selecciona el destino técnico..." />
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
                        <Button variant="ghost" onClick={() => setCurrentStep(workbook && sheets.length > 1 ? 'sheet-selection' : 'upload')} className="text-xs font-bold uppercase">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 'mapping' && (
                <Card className="border-none shadow-2xl bg-white animate-in zoom-in-95 duration-300 overflow-hidden relative">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 px-8 py-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-primary/10 text-primary uppercase text-[9px] font-black tracking-widest border-none px-2">Configuración de Atribución</Badge>
                                <CardTitle className="text-xl font-black uppercase tracking-tighter">Mapeo de Columnas: {selectedTable}</CardTitle>
                            </div>
                            <CardDescription>Vincula los encabezados del archivo con los campos reales de la base de datos.</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={reset} className="rounded-full h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                            <X className="h-5 w-5" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[500px] overflow-y-auto">
                            <Table>
                                <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-sm">
                                    <TableRow className="border-b-0 h-12">
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest px-8">Origen (Archivo)</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Destino (BD)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {headers.map((h, i) => (
                                        <TableRow key={i} className="hover:bg-muted/5 h-16 border-b-slate-100 last:border-b-0">
                                            <TableCell className="px-8">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-xs text-slate-700 uppercase">{h || 'S/N'}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium">Valor: {String(rawRows[0]?.[i] ?? 'Vacío')}</span>
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
                                                                <SelectItem key={c} value={c} disabled={isAlreadyUsed} className={cn("text-[10px] font-bold uppercase py-2.5", isAlreadyUsed && "opacity-30")}>
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
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-primary">Comparando con Base de Datos</h3>
                            <p className="text-muted-foreground font-medium">Detectando cambios en {rawRows.length} registros...</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep === 'preview' && (
                <Card className="border-none shadow-2xl bg-white animate-in slide-in-from-bottom-4 duration-500 overflow-hidden relative">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 px-8 py-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-primary/10 text-primary uppercase text-[9px] font-black tracking-widest border-none px-2">Auditoría de Integridad</Badge>
                                <CardTitle className="text-xl font-black uppercase tracking-tighter">Resultados del Análisis</CardTitle>
                            </div>
                            <CardDescription>Visualiza los datos exactamente como se registrarán en <strong>{selectedTable}</strong>.</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={reset} className="rounded-full h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                            <X className="h-5 w-5" />
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
                                        Con Cambios ({categorizedData.update.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="sin-cambios" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-full font-bold uppercase text-[11px] tracking-tighter transition-all">
                                        Al Día ({categorizedData.unchanged.length})
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
                                                                    <TableCell key={col} className="border-r last:border-r-0 px-4 text-[10px] font-medium max-w-[250px] truncate">
                                                                        {String(row[col] ?? '-')}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow><TableCell colSpan={activeDbColumns.length} className="h-32 text-center text-muted-foreground font-bold uppercase text-xs">Sin registros en esta categoría.</TableCell></TableRow>
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
                            <Button onClick={() => handleSync('new')} className="h-14 px-8 bg-[#3E6053] hover:bg-[#2D4A3F] text-white font-bold uppercase text-[11px] tracking-widest rounded-xl shadow-lg flex-1" disabled={isLoading || categorizedData.new.length === 0}>
                                <Database className="mr-2 h-5 w-5" /> Inyectar Nuevos
                            </Button>
                            <Button onClick={() => handleSync('update')} className="h-14 px-8 bg-[#3E6053] hover:bg-[#2D4A3F] text-white font-bold uppercase text-[11px] tracking-widest rounded-xl shadow-lg flex-1" disabled={isLoading || categorizedData.update.length === 0}>
                                <RefreshCcw className="mr-2 h-5 w-5" /> Actualizar Cambios
                            </Button>
                            <Button onClick={() => handleSync('all')} className="h-14 px-8 bg-[#3E6053] hover:bg-[#2D4A3F] text-white font-bold uppercase text-[11px] tracking-widest rounded-xl shadow-lg flex-1" disabled={isLoading || (categorizedData.new.length === 0 && categorizedData.update.length === 0)}>
                                <Save className="mr-2 h-5 w-5" /> Sincronizar Todo
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 'syncing' && (
                <Card className="border-none shadow-xl bg-white text-center p-20">
                    <CardContent className="space-y-8">
                        <div className="relative mx-auto h-24 w-24">
                            <Loader2 className="h-24 w-24 animate-spin text-primary opacity-20" />
                            <Database className="h-10 w-10 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="space-y-4 max-w-md mx-auto">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-primary">Sincronización en Curso</h3>
                                <p className="text-muted-foreground font-medium">Inyectando datos en la tabla <strong>{selectedTable}</strong></p>
                            </div>
                            
                            <div className="space-y-3">
                                <Progress value={syncProgress} className="h-4 w-full bg-slate-100" />
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-primary">{syncProgress}% Completado</span>
                                    <span className="text-muted-foreground">Registros: {syncCount} / {totalToSync}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep === 'results' && syncResult && (
                <div className="space-y-6 animate-in zoom-in-95 duration-300 w-full">
                    <Card className="border-none shadow-2xl overflow-hidden rounded-3xl relative">
                        <div className={cn("p-12 text-white text-center", syncResult.errors.length > 0 ? "bg-amber-600" : "bg-[#2D5A4C]")}>
                            <Button variant="ghost" size="icon" onClick={reset} className="absolute top-6 right-6 rounded-full h-10 w-10 text-white hover:bg-white/20">
                                <X className="h-6 w-6" />
                            </Button>
                            <div className="mx-auto h-20 w-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
                                {syncResult.errors.length > 0 ? <AlertTriangle className="h-12 w-12 text-white" /> : <CheckCircle className="h-12 w-12 text-white" />}
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">
                                {syncResult.errors.length > 0 ? 'Auditoría con Advertencias' : '¡Sincronización Exitosa!'}
                            </h2>
                            <p className="text-white/80 font-bold uppercase tracking-widest text-sm">Destino: {selectedTable} • {rawRows.length} registros analizados</p>
                        </div>
                        <CardContent className="p-8 bg-white space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                                <div className="p-6 rounded-2xl bg-green-50 border border-green-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1">Inyectados</p>
                                    <p className="text-4xl font-black text-green-800">{syncResult.inserted.length}</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Sobrescritos</p>
                                    <p className="text-4xl font-black text-blue-800">{syncResult.updated.length}</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Sin Cambios</p>
                                    <p className="text-4xl font-black text-slate-600">{syncResult.unchanged.length}</p>
                                </div>
                            </div>

                            {syncResult.errors.length > 0 && (
                                <div className="space-y-4">
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
                                    <RefreshCcw className="mr-2 h-4 w-4" /> Nuevo Reporte
                                </Button>
                                <Button className="h-14 font-black uppercase text-xs rounded-xl shadow-lg" onClick={() => window.location.reload()}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Finalizar Auditoría
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}