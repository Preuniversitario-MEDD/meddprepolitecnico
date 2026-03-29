import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Eye, Clock, Zap, BookOpen, AlertTriangle, TrendingUp, ArrowLeft, HelpCircle, Download, FileSpreadsheet, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ExamConfig {
  tipo: string;
  label: string;
  sessions: number[];
  puntaje_aprobacion: number;
}

interface ExamResultRow {
  id: string;
  user_id: string;
  tipo: string;
  puntaje: number;
  aprobado: boolean;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  respuestas: any[];
  profile?: { nombre: string; apellidos: string };
}

interface TopicAnalysis {
  sesionNumero: number;
  sesionTitulo: string;
  total: number;
  correctas: number;
  porcentaje: number;
  estado: 'dominado' | 'en_proceso' | 'requiere_retroalimentacion';
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  examTipo: string | null;
  configs: ExamConfig[];
}

export default function ExamResultsDialog({ open, onOpenChange, examTipo, configs }: Props) {
  const [results, setResults] = useState<ExamResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ExamResultRow | null>(null);
  const [questionDetails, setQuestionDetails] = useState<any[]>([]);
  const [topicAnalysis, setTopicAnalysis] = useState<TopicAnalysis[]>([]);
  const [sesionesMap, setSesionesMap] = useState<Record<string, { numero: number; titulo: string }>>({});

  useEffect(() => {
    if (open && examTipo) loadResults();
    if (!open) { setSelectedResult(null); setQuestionDetails([]); }
  }, [open, examTipo]);

  async function loadResults() {
    setLoading(true);
    const [{ data: exams }, { data: sesiones }] = await Promise.all([
      supabase.from('examenes').select('*').eq('tipo', examTipo!).order('fecha', { ascending: false }),
      supabase.from('sesiones').select('id, numero, titulo').order('numero'),
    ]);

    const sesMap: Record<string, { numero: number; titulo: string }> = {};
    (sesiones || []).forEach((s: any) => { sesMap[s.id] = { numero: s.numero, titulo: s.titulo }; });
    setSesionesMap(sesMap);

    if (exams && exams.length > 0) {
      const userIds = [...new Set(exams.map((e: any) => e.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, nombre, apellidos').in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setResults(exams.map((e: any) => ({
        ...e,
        respuestas: Array.isArray(e.respuestas) ? e.respuestas : [],
        profile: profileMap.get(e.user_id),
      })));
    } else {
      setResults([]);
    }
    setLoading(false);
  }

  async function viewExamDetail(result: ExamResultRow) {
    setSelectedResult(result);

    if (result.respuestas && result.respuestas.length > 0) {
      const questionIds = result.respuestas.map((r: any) => r.questionId);
      const { data: questions } = await supabase.from('quiz_preguntas')
        .select('id, pregunta, opciones, respuesta_correcta, sesion_id, imagen_url')
        .in('id', questionIds);

      if (questions) {
        const qMap = new Map(questions.map(q => [q.id, q]));
        const details = result.respuestas.map((r: any) => {
          const q = qMap.get(r.questionId);
          return { ...r, question: q || null };
        });
        setQuestionDetails(details);

        const topicMap = new Map<string, { total: number; correctas: number }>();
        details.forEach((d: any) => {
          if (d.question?.sesion_id) {
            const sid = d.question.sesion_id;
            const curr = topicMap.get(sid) || { total: 0, correctas: 0 };
            curr.total++;
            if (d.correct) curr.correctas++;
            topicMap.set(sid, curr);
          }
        });

        const analysis: TopicAnalysis[] = Array.from(topicMap.entries()).map(([sid, data]) => {
          const ses = sesionesMap[sid] || { numero: 0, titulo: 'Desconocida' };
          const pct = data.total > 0 ? Math.round((data.correctas / data.total) * 100) : 0;
          return {
            sesionNumero: ses.numero,
            sesionTitulo: ses.titulo,
            total: data.total,
            correctas: data.correctas,
            porcentaje: pct,
            estado: (pct >= 80 ? 'dominado' : pct >= 50 ? 'en_proceso' : 'requiere_retroalimentacion') as TopicAnalysis['estado'],
          };
        }).sort((a, b) => a.sesionNumero - b.sesionNumero);
        setTopicAnalysis(analysis);
      }
    }
  }

  const cfg = configs.find(c => c.tipo === examTipo);
  const isFinal = examTipo === 'exam_final';
  const maxScore = isFinal ? 1000 : 100;

  function calcAvgSpeed(r: ExamResultRow) {
    if (!r.hora_inicio || !r.hora_fin) return null;
    const start = new Date(r.hora_inicio).getTime();
    const end = new Date(r.hora_fin).getTime();
    const totalSec = (end - start) / 1000;
    const answered = r.respuestas?.length || 1;
    return Math.round(totalSec / answered);
  }

  function formatDuration(r: ExamResultRow) {
    if (!r.hora_inicio || !r.hora_fin) return '—';
    const start = new Date(r.hora_inicio).getTime();
    const end = new Date(r.hora_fin).getTime();
    const mins = Math.floor((end - start) / 60000);
    const secs = Math.floor(((end - start) % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  // --- Export functions ---
  function exportResultsCSV() {
    if (results.length === 0) return;
    const headers = ['Estudiante', 'Puntaje', 'Max', 'Estado', 'Fecha', 'Hora Inicio', 'Hora Fin', 'Duración', 'Vel. Promedio (s)'];
    const rows = results.map(r => {
      const avgSpeed = calcAvgSpeed(r);
      return [
        r.profile ? `${r.profile.nombre} ${r.profile.apellidos}` : r.user_id.slice(0, 8),
        r.puntaje,
        maxScore,
        r.aprobado ? 'Aprobado' : 'Reprobado',
        new Date(r.fecha).toLocaleDateString('es-EC'),
        r.hora_inicio ? new Date(r.hora_inicio).toLocaleTimeString('es-EC') : '',
        r.hora_fin ? new Date(r.hora_fin).toLocaleTimeString('es-EC') : '',
        formatDuration(r),
        avgSpeed ?? '',
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    downloadFile(csv, `resultados_${examTipo}.csv`, 'text/csv');
  }

  function exportDetailCSV(result: ExamResultRow) {
    if (questionDetails.length === 0) return;
    const studentName = result.profile ? `${result.profile.nombre} ${result.profile.apellidos}` : 'Estudiante';
    const headers = ['#', 'Pregunta', 'Sesión', 'Respuesta Correcta', 'Estado'];
    const rows = questionDetails.map((d: any, idx: number) => {
      const q = d.question;
      if (!q) return [idx + 1, 'N/A', '', '', ''].join(',');
      const sesInfo = sesionesMap[q.sesion_id];
      const opciones = (q.opciones as string[]) || [];
      const isBlank = d.answer === undefined || d.answer === null || d.answer === -1;
      const estado = isBlank ? 'No contestada' : d.correct ? 'Correcta' : 'Errónea';
      return [
        idx + 1,
        `"${(q.pregunta || '').replace(/"/g, '""')}"`,
        sesInfo ? `S${sesInfo.numero}: ${sesInfo.titulo}` : '',
        `"${opciones[q.respuesta_correcta] || ''}"`,
        estado,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    downloadFile(csv, `detalle_${examTipo}_${studentName.replace(/\s/g, '_')}.csv`, 'text/csv');
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob(['\ufeff' + content], { type: `${type};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- PDF Export ---
  function exportDetailPDF(result: ExamResultRow) {
    if (questionDetails.length === 0) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = margin;

    const studentName = result.profile ? `${result.profile.nombre} ${result.profile.apellidos}` : 'Estudiante';
    const avgSpeed = calcAvgSpeed(result);
    const blankQs = questionDetails.filter((d: any) => isBlank(d));
    const answeredQs = questionDetails.filter((d: any) => !isBlank(d));
    const correctQs = answeredQs.filter((d: any) => d.correct);
    const incorrectQs = answeredQs.filter((d: any) => !d.correct);

    const addNewPageIfNeeded = (needed: number) => {
      if (y + needed > pageH - 15) {
        doc.addPage();
        y = margin;
      }
    };

    // Header bar
    doc.setFillColor(90, 50, 150);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Reporte de Examen - ${cfg?.label || examTipo}`, margin, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(studentName, margin, 20);
    doc.text(`Fecha: ${new Date(result.fecha).toLocaleDateString('es-EC')}`, pageW - margin, 20, { align: 'right' });
    y = 36;

    // Summary metrics table
    doc.setTextColor(50, 50, 50);
    (doc as any).autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Puntaje', 'Estado', 'Duración', 'Vel. Promedio', 'Precisión', 'Hora Inicio', 'Hora Fin']],
      body: [[
        `${result.puntaje}/${maxScore}`,
        result.aprobado ? 'Aprobado' : 'Reprobado',
        formatDuration(result),
        avgSpeed ? `${avgSpeed}s/preg` : '—',
        `${questionDetails.length > 0 ? Math.round((correctQs.length / questionDetails.length) * 100) : 0}%`,
        result.hora_inicio ? new Date(result.hora_inicio).toLocaleTimeString('es-EC') : '—',
        result.hora_fin ? new Date(result.hora_fin).toLocaleTimeString('es-EC') : '—',
      ]],
      theme: 'grid',
      headStyles: { fillColor: [90, 50, 150], fontSize: 8, halign: 'center' },
      bodyStyles: { fontSize: 9, halign: 'center' },
      styles: { cellPadding: 3 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Summary counts
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(230, 255, 240);
    doc.roundedRect(margin, y, contentW / 3 - 2, 12, 2, 2, 'F');
    doc.setTextColor(34, 139, 34);
    doc.text(`✓ Correctas: ${correctQs.length}`, margin + 4, y + 7);

    doc.setFillColor(255, 243, 224);
    doc.roundedRect(margin + contentW / 3, y, contentW / 3 - 2, 12, 2, 2, 'F');
    doc.setTextColor(200, 120, 0);
    doc.text(`○ En blanco: ${blankQs.length}`, margin + contentW / 3 + 4, y + 7);

    doc.setFillColor(255, 230, 230);
    doc.roundedRect(margin + (contentW / 3) * 2, y, contentW / 3, 12, 2, 2, 'F');
    doc.setTextColor(200, 50, 50);
    doc.text(`✗ Erróneas: ${incorrectQs.length}`, margin + (contentW / 3) * 2 + 4, y + 7);
    y += 18;

    // Topic analysis
    if (topicAnalysis.length > 0) {
      addNewPageIfNeeded(20);
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Análisis por Tema', margin, y);
      y += 5;

      const topicRows = topicAnalysis.map(t => {
        const estado = t.estado === 'dominado' ? '✓ Dominado' : t.estado === 'en_proceso' ? '▸ En proceso' : '✗ Requiere retroalimentación';
        return [`S${t.sesionNumero}: ${t.sesionTitulo}`, `${t.correctas}/${t.total}`, `${t.porcentaje}%`, estado];
      });
      (doc as any).autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Tema', 'Aciertos', '%', 'Estado']],
        body: topicRows,
        theme: 'striped',
        headStyles: { fillColor: [90, 50, 150], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        styles: { cellPadding: 2.5 },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 3) {
            const val = data.cell.raw as string;
            if (val.startsWith('✓')) data.cell.styles.textColor = [34, 139, 34];
            else if (val.startsWith('▸')) data.cell.styles.textColor = [200, 120, 0];
            else data.cell.styles.textColor = [200, 50, 50];
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Question sections helper
    const renderSection = (title: string, questions: any[], colorRGB: number[]) => {
      if (questions.length === 0) return;
      addNewPageIfNeeded(18);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colorRGB[0], colorRGB[1], colorRGB[2]);
      doc.text(title, margin, y);
      y += 5;

      const rows = questions.map((d: any) => {
        const q = d.question;
        if (!q) return ['—', '—', '—', '—'];
        const opciones = (q.opciones as string[]) || [];
        const sesInfo = sesionesMap[q.sesion_id];
        const globalIdx = questionDetails.indexOf(d) + 1;
        const correctAnswer = opciones[q.respuesta_correcta] ? `${String.fromCharCode(65 + q.respuesta_correcta)}. ${opciones[q.respuesta_correcta]}` : '—';
        const studentAnswer = isBlank(d) ? 'No contestó' :
          opciones[d.answer] ? `${String.fromCharCode(65 + d.answer)}. ${opciones[d.answer]}` : '—';
        return [
          `${globalIdx}. ${q.pregunta}`,
          sesInfo ? `S${sesInfo.numero}` : '—',
          studentAnswer,
          correctAnswer,
        ];
      });

      (doc as any).autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Pregunta', 'Sesión', 'Respuesta del estudiante', 'Respuesta correcta']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: colorRGB, fontSize: 7.5 },
        bodyStyles: { fontSize: 7, valign: 'top' },
        columnStyles: {
          0: { cellWidth: contentW * 0.4 },
          1: { cellWidth: contentW * 0.08, halign: 'center' },
          2: { cellWidth: contentW * 0.26 },
          3: { cellWidth: contentW * 0.26 },
        },
        styles: { cellPadding: 2, overflow: 'linebreak' },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    };

    renderSection(`Preguntas Correctas (${correctQs.length})`, correctQs, [34, 139, 34]);
    renderSection(`Preguntas En Blanco (${blankQs.length})`, blankQs, [200, 140, 0]);
    renderSection(`Preguntas Erróneas (${incorrectQs.length})`, incorrectQs, [200, 50, 50]);

    // Footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' });
      doc.text('MeddPrep Politécnico — Reporte generado automáticamente', pageW / 2, pageH - 4, { align: 'center' });
    }

    doc.save(`Examen_${cfg?.label || examTipo}_${studentName.replace(/\s/g, '_')}.pdf`);
  }

  // Classify questions - handle both old format (no answer field) and new format
  function isBlank(d: any) {
    // New format: answer field exists
    if ('answer' in d) {
      return d.answer === undefined || d.answer === null || d.answer === -1;
    }
    // Old format: no answer field, use correct to determine if answered
    // If correct is explicitly true or false (and question exists), it was answered
    // Old format only saved answered questions, so if it exists it was answered
    return false;
  }

  function isCorrect(d: any) {
    return d.correct === true;
  }

  // Detail view
  if (selectedResult) {
    const avgSpeed = calcAvgSpeed(selectedResult);
    const totalQ = questionDetails.length;
    const blankQuestions = questionDetails.filter((d: any) => isBlank(d));
    const answeredQuestions = questionDetails.filter((d: any) => !isBlank(d));
    const correctQuestions = answeredQuestions.filter((d: any) => d.correct);
    const incorrectQuestions = answeredQuestions.filter((d: any) => !d.correct);
    const correctCount = correctQuestions.length;
    const blankCount = blankQuestions.length;
    const incorrectCount = incorrectQuestions.length;
    const dominados = topicAnalysis.filter(t => t.estado === 'dominado');
    const enProceso = topicAnalysis.filter(t => t.estado === 'en_proceso');
    const retroalimentacion = topicAnalysis.filter(t => t.estado === 'requiere_retroalimentacion');

    const renderQuestionCard = (d: any, globalIdx: number) => {
      const q = d.question;
      if (!q) return null;
      const opciones = (q.opciones as string[]) || [];
      const sesInfo = sesionesMap[q.sesion_id];
      const blank = isBlank(d);
      const borderColor = blank
        ? 'border-[hsl(var(--neon-orange))]'
        : d.correct
          ? 'border-[hsl(var(--neon-mint))]'
          : 'border-destructive';
      const badgeClasses = blank
        ? 'bg-[hsl(var(--neon-orange))]/20 text-[hsl(var(--neon-orange))]'
        : d.correct
          ? 'bg-[hsl(var(--neon-mint))]/20 text-[hsl(var(--neon-mint))]'
          : 'bg-destructive/20 text-destructive';
      const icon = blank
        ? <HelpCircle className="w-4 h-4 text-[hsl(var(--neon-orange))] shrink-0" />
        : d.correct
          ? <CheckCircle className="w-4 h-4 text-[hsl(var(--neon-mint))] shrink-0" />
          : <XCircle className="w-4 h-4 text-destructive shrink-0" />;

      return (
        <Card key={globalIdx} className={`border-l-4 ${borderColor}`}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start gap-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badgeClasses}`}>
                {globalIdx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground leading-snug">{q.pregunta}</p>
                {sesInfo && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    S{sesInfo.numero}: {sesInfo.titulo}
                  </p>
                )}
              </div>
              {icon}
            </div>
            {q.imagen_url && <img src={q.imagen_url} alt="" className="rounded max-h-28 object-contain" />}
            <div className="space-y-1">
              {opciones.map((op: string, i: number) => {
                const isCorrectOpt = i === q.respuesta_correcta;
                const isStudentAnswer = !blank && d.answer === i;
                let classes = 'border-border bg-card';
                if (isCorrectOpt) classes = 'border-[hsl(var(--neon-mint))] bg-[hsl(var(--neon-mint))]/10';
                else if (isStudentAnswer && !d.correct) classes = 'border-[hsl(var(--neon-pink))] bg-[hsl(var(--neon-pink))]/15';
                return (
                  <div key={i} className={`p-2 rounded-lg border text-[11px] flex items-center gap-2 ${classes}`}>
                    {isCorrectOpt
                      ? <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--neon-mint))] shrink-0" />
                      : isStudentAnswer && !d.correct
                        ? <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                        : <span className="w-3.5 shrink-0" />
                    }
                    <span><span className="font-semibold mr-1">{String.fromCharCode(65 + i)}.</span>{op}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      );
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedResult(null); setQuestionDetails([]); }} className="mr-1 h-7 w-7 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="truncate flex-1">
                {selectedResult.profile ? `${selectedResult.profile.nombre} ${selectedResult.profile.apellidos}` : 'Estudiante'}
              </span>
              <div className="flex gap-1.5 ml-auto">
                <Button size="sm" variant="outline" onClick={() => exportDetailPDF(selectedResult)} className="h-7 text-xs gap-1">
                  <FileText className="w-3.5 h-3.5" /> PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportDetailCSV(selectedResult)} className="h-7 text-xs gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4 pr-4 pb-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className={`border ${selectedResult.aprobado ? 'border-[hsl(var(--neon-mint))]/40' : 'border-destructive/40'}`}>
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Puntaje</p>
                    <p className={`text-2xl font-bold ${selectedResult.aprobado ? 'text-[hsl(var(--neon-mint))]' : 'text-destructive'}`}>
                      {selectedResult.puntaje}<span className="text-sm text-muted-foreground">/{maxScore}</span>
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-[hsl(var(--neon-blue))]/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Duración</p>
                    <p className="text-2xl font-bold text-[hsl(var(--neon-blue))]">{formatDuration(selectedResult)}</p>
                  </CardContent>
                </Card>
                <Card className="border border-[hsl(var(--neon-violet))]/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vel. promedio</p>
                    <p className="text-2xl font-bold text-[hsl(var(--neon-violet))]">{avgSpeed ? `${avgSpeed}s` : '—'}</p>
                  </CardContent>
                </Card>
                <Card className="border border-[hsl(var(--neon-orange))]/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Precisión</p>
                    <p className="text-2xl font-bold text-[hsl(var(--neon-orange))]">{totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0}%</p>
                  </CardContent>
                </Card>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <Card><CardContent className="p-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[hsl(var(--neon-blue))]" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Hora inicio</p>
                    <p className="text-sm font-medium">{selectedResult.hora_inicio ? new Date(selectedResult.hora_inicio).toLocaleTimeString('es-EC') : '—'}</p>
                  </div>
                </CardContent></Card>
                <Card><CardContent className="p-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[hsl(var(--neon-orange))]" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Hora fin</p>
                    <p className="text-sm font-medium">{selectedResult.hora_fin ? new Date(selectedResult.hora_fin).toLocaleTimeString('es-EC') : '—'}</p>
                  </div>
                </CardContent></Card>
              </div>

              {/* Topic analysis */}
              {topicAnalysis.length > 0 && (
                <Card className="neon-border">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-display font-bold text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[hsl(var(--neon-violet))]" /> Análisis por Tema
                    </h4>

                    {dominados.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[hsl(var(--neon-mint))] flex items-center gap-1.5 mb-1.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Temas Dominados
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {dominados.map(t => (
                            <Badge key={t.sesionNumero} className="text-[10px] bg-[hsl(var(--neon-mint))]/15 text-[hsl(var(--neon-mint))] border border-[hsl(var(--neon-mint))]/30 hover:bg-[hsl(var(--neon-mint))]/25">
                              S{t.sesionNumero}: {t.sesionTitulo} ({t.porcentaje}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {enProceso.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[hsl(var(--neon-orange))] flex items-center gap-1.5 mb-1.5">
                          <TrendingUp className="w-3.5 h-3.5" /> Temas en Proceso
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {enProceso.map(t => (
                            <Badge key={t.sesionNumero} className="text-[10px] bg-[hsl(var(--neon-orange))]/15 text-[hsl(var(--neon-orange))] border border-[hsl(var(--neon-orange))]/30 hover:bg-[hsl(var(--neon-orange))]/25">
                              S{t.sesionNumero}: {t.sesionTitulo} ({t.porcentaje}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {retroalimentacion.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-destructive flex items-center gap-1.5 mb-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Requieren Retroalimentación
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {retroalimentacion.map(t => (
                            <Badge key={t.sesionNumero} className="text-[10px] bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25">
                              S{t.sesionNumero}: {t.sesionTitulo} ({t.porcentaje}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Tabbed question review */}
              <div className="space-y-2">
                <h4 className="font-display font-bold text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[hsl(var(--neon-blue))]" /> Preguntas del Examen ({totalQ})
                </h4>

                <Tabs defaultValue="todas" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 h-9">
                    <TabsTrigger value="todas" className="text-[11px] gap-1 data-[state=active]:bg-[hsl(var(--neon-violet))]/20 data-[state=active]:text-[hsl(var(--neon-violet))]">
                      <BookOpen className="w-3 h-3" />
                      Todas ({totalQ})
                    </TabsTrigger>
                    <TabsTrigger value="correctas" className="text-[11px] gap-1 data-[state=active]:bg-[hsl(var(--neon-mint))]/20 data-[state=active]:text-[hsl(var(--neon-mint))]">
                      <CheckCircle className="w-3 h-3" />
                      Correctas ({correctCount})
                    </TabsTrigger>
                    <TabsTrigger value="blanco" className="text-[11px] gap-1 data-[state=active]:bg-[hsl(var(--neon-orange))]/20 data-[state=active]:text-[hsl(var(--neon-orange))]">
                      <HelpCircle className="w-3 h-3" />
                      En blanco ({blankCount})
                    </TabsTrigger>
                    <TabsTrigger value="incorrectas" className="text-[11px] gap-1 data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive">
                      <XCircle className="w-3 h-3" />
                      Erróneas ({incorrectCount})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="todas" className="mt-3">
                    <ScrollArea className="h-[40vh]">
                      <div className="space-y-2 pr-3">
                        {questionDetails.map((d: any, idx: number) => renderQuestionCard(d, idx))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="correctas" className="mt-3">
                    <ScrollArea className="h-[40vh]">
                      <div className="space-y-2 pr-3">
                        {correctQuestions.length > 0
                          ? correctQuestions.map((d: any, idx: number) => renderQuestionCard(d, questionDetails.indexOf(d)))
                          : <p className="text-center text-muted-foreground text-sm py-6">No hay preguntas correctas</p>
                        }
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="blanco" className="mt-3">
                    <ScrollArea className="h-[40vh]">
                      <div className="space-y-2 pr-3">
                        {blankQuestions.length > 0
                          ? blankQuestions.map((d: any) => renderQuestionCard(d, questionDetails.indexOf(d)))
                          : <p className="text-center text-muted-foreground text-sm py-6">No hay preguntas en blanco</p>
                        }
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="incorrectas" className="mt-3">
                    <ScrollArea className="h-[40vh]">
                      <div className="space-y-2 pr-3">
                        {incorrectQuestions.length > 0
                          ? incorrectQuestions.map((d: any) => renderQuestionCard(d, questionDetails.indexOf(d)))
                          : <p className="text-center text-muted-foreground text-sm py-6">No hay preguntas erróneas</p>
                        }
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  // List view
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-[hsl(var(--neon-violet))]" />
            <span className="flex-1">Resultados: {cfg?.label}</span>
            <Button size="sm" variant="outline" onClick={exportResultsCSV} className="h-7 text-xs gap-1" disabled={results.length === 0}>
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </Button>
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-center text-muted-foreground py-4">Cargando...</p>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Puntaje</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Vel/preg</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map(r => {
                  const avgSpeed = calcAvgSpeed(r);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">{r.profile ? `${r.profile.nombre} ${r.profile.apellidos}` : r.user_id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${r.aprobado ? 'text-[hsl(var(--neon-mint))]' : 'text-destructive'}`}>
                          {r.puntaje}/{maxScore}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${r.aprobado
                          ? 'bg-[hsl(var(--neon-mint))]/15 text-[hsl(var(--neon-mint))] border border-[hsl(var(--neon-mint))]/30'
                          : 'bg-destructive/15 text-destructive border border-destructive/30'
                        }`}>
                          {r.aprobado ? '✅ Aprobado' : '❌ Reprobado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(r.fecha).toLocaleDateString('es-EC')}</TableCell>
                      <TableCell className="text-xs text-[hsl(var(--neon-blue))]">
                        {r.hora_inicio ? new Date(r.hora_inicio).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-[hsl(var(--neon-orange))]">
                        {r.hora_fin ? new Date(r.hora_fin).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-[hsl(var(--neon-violet))]">
                          {avgSpeed ? `${avgSpeed}s` : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => viewExamDetail(r)}
                          className="h-7 text-xs gap-1 border-[hsl(var(--neon-violet))]/40 text-[hsl(var(--neon-violet))] hover:bg-[hsl(var(--neon-violet))]/10">
                          <Eye className="w-3 h-3" /> Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {results.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sin resultados aún</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
