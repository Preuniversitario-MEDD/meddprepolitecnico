import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Trash2, Ban, CheckCircle, KeyRound, Search, Edit, Eye, BookOpen, Users, BarChart3, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AvatarUpload from '@/components/AvatarUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import CourseManager from '@/components/admin/CourseManager';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import StudentStatsTab from '@/components/admin/StudentStatsTab';
import ConnectionsTab from '@/components/admin/ConnectionsTab';
import { validarCedulaEcuatoriana, sanitizeInput } from '@/lib/security';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'> & { colegio?: string };

const DEFAULT_STUDENT_PASSWORD = '123*789*h';

function generateUsuario(nombre: string, apellidos: string): string {
  const n = nombre.toLowerCase().replace(/\s+/g, ' ').trim().split(' ');
  const a = apellidos.toLowerCase().replace(/\s+/g, ' ').trim().split(' ');
  return (n[0] || '').slice(0, 2) + (n[1] || '').slice(0, 2) + (a[0] || '').slice(0, 3);
}

function calcAge(birth: string) {
  const b = new Date(birth);
  const now = new Date();
  let y = now.getFullYear() - b.getFullYear();
  let m = now.getMonth() - b.getMonth();
  let d = now.getDate() - b.getDate();
  if (d < 0) {
    m--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    d += prevMonth.getDate();
  }
  if (m < 0) { y--; m += 12; }
  return `${y}a ${m}m ${d}d`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminStudents() {
  const [students, setStudents] = useState<Profile[]>([]);
  const [studentCursos, setStudentCursos] = useState<Record<string, { id: string; titulo: string }[]>>({});
  const [studentCarreras, setStudentCarreras] = useState<Record<string, { nombre: string; universidad: string; porcentaje: number }>>({});
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Profile | null>(null);
  const [form, setForm] = useState({ nombre: '', apellidos: '', cedula: '', fechaNacimiento: '', colegio: '' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  const [allCursos, setAllCursos] = useState<{ id: string; titulo: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCursoId, setBulkCursoId] = useState<string>('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [quickAssignFor, setQuickAssignFor] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) {
      setStudents(data as Profile[]);
      // Load course assignments for each student
      const { data: cursosData } = await supabase.from('cursos').select('id, titulo').order('created_at', { ascending: false });
      if (cursosData) setAllCursos(cursosData);
      if (allAssignments && cursosData) {
        const map: Record<string, { id: string; titulo: string }[]> = {};
        for (const a of allAssignments) {
          const curso = cursosData.find(c => c.id === a.curso_id);
          if (curso) {
            if (!map[a.user_id]) map[a.user_id] = [];
            map[a.user_id].push(curso);
          }
        }
        setStudentCursos(map);
      }
      // Load top vocational career per student
      const { data: orientaciones } = await supabase
        .from('orientacion_vocacional')
        .select('user_id, top_carreras');
      if (orientaciones) {
        const carrMap: Record<string, { nombre: string; universidad: string; porcentaje: number }> = {};
        for (const o of orientaciones as any[]) {
          const top = Array.isArray(o.top_carreras) ? o.top_carreras[0] : null;
          if (top?.nombre) {
            carrMap[o.user_id] = {
              nombre: top.nombre,
              universidad: top.universidad || '',
              porcentaje: top.porcentaje || 0,
            };
          }
        }
        setStudentCarreras(carrMap);
      }
    }
  }


  async function addStudent() {
    if (!form.cedula || form.cedula.length !== 10) {
      toast({ title: 'Error', description: 'Cédula debe tener 10 dígitos', variant: 'destructive' });
      return;
    }
    if (!form.nombre.trim() || !form.apellidos.trim()) {
      toast({ title: 'Error', description: 'Nombre y apellidos son obligatorios', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const usuario = generateUsuario(form.nombre, form.apellidos);

    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'register', cedula: form.cedula, nombre: form.nombre, apellidos: form.apellidos }
    });

    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error || error?.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (data?.user) {
      await supabase.from('profiles').update({
        nombre: form.nombre,
        apellidos: form.apellidos,
        fecha_nacimiento: form.fechaNacimiento || null,
        usuario,
        primera_vez: true,
        colegio: form.colegio,
      } as any).eq('user_id', data.user.id);
    }

    toast({
      title: '¡Éxito!',
      description: `Estudiante ${form.nombre} creado. Cédula: ${form.cedula} · Clave temporal: ${DEFAULT_STUDENT_PASSWORD}`,
      duration: 20000,
    });
    setForm({ nombre: '', apellidos: '', cedula: '', fechaNacimiento: '', colegio: '' });
    setAddOpen(false);
    setLoading(false);
    loadStudents();
  }

  async function toggleActive(student: Profile) {
    await supabase.from('profiles').update({ activo: !student.activo }).eq('id', student.id);
    toast({ title: student.activo ? 'Bloqueado' : 'Activado', description: `${student.nombre} ${student.apellidos}` });
    loadStudents();
  }

  async function deleteStudent(student: Profile) {
    if (!confirm(`¿Eliminar a ${student.nombre} ${student.apellidos}?`)) return;
    await supabase.functions.invoke('admin-users', { body: { action: 'delete_user', userId: student.user_id } });
    toast({ title: 'Eliminado', description: `${student.nombre} eliminado` });
    loadStudents();
  }

  async function resetPassword(student: Profile) {
    if (!confirm(`¿Reiniciar contraseña de ${student.nombre}?`)) return;
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'reset_password', userId: student.user_id }
    });
    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Contraseña reiniciada',
      description: `Nueva clave temporal para ${student.nombre}: ${DEFAULT_STUDENT_PASSWORD}`,
      duration: 20000,
    });
  }

  async function saveEdit() {
    if (!editStudent) return;
    const nombreSan = sanitizeInput(form.nombre);
    const apellidosSan = sanitizeInput(form.apellidos);
    const colegioSan = sanitizeInput(form.colegio);
    const usuario = generateUsuario(nombreSan, apellidosSan);
    await supabase.from('profiles').update({
      nombre: nombreSan,
      apellidos: apellidosSan,
      fecha_nacimiento: form.fechaNacimiento || null,
      usuario,
      colegio: colegioSan,
    } as any).eq('id', editStudent.id);
    toast({ title: 'Actualizado', description: `Datos de ${nombreSan} actualizados` });
    setEditStudent(null);
    loadStudents();
  }

  const filtered = students.filter(s =>
    `${s.nombre} ${s.apellidos} ${s.cedula} ${s.usuario} ${(s as any).colegio || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-display font-bold">Estudiantes & Cursos</h1>
        {activeTab === 'students' && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground gap-2">
                <UserPlus className="w-4 h-4" /> Agregar Estudiante
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Nuevo Estudiante</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre(s)" /></div>
                <div><Label>Apellidos</Label><Input value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })} placeholder="Apellidos" /></div>
                <div><Label>Cédula (10 dígitos)</Label><Input value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value.replace(/\D/g, '').slice(0, 10) })} maxLength={10} /></div>
                <div><Label>Fecha de Nacimiento</Label><Input type="date" value={form.fechaNacimiento} onChange={e => setForm({ ...form, fechaNacimiento: e.target.value })} /></div>
                <div><Label>Colegio</Label><Input value={form.colegio} onChange={e => setForm({ ...form, colegio: e.target.value })} placeholder="Nombre del colegio" /></div>
                {form.nombre && form.apellidos && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Usuario: <span className="font-mono text-primary font-semibold">{generateUsuario(form.nombre, form.apellidos)}</span></p>
                    <p>La clave temporal por defecto es <code className="font-mono">123*789*h</code>. El estudiante deberá cambiarla en su primer ingreso.</p>
                  </div>
                )}
                <Button onClick={addStudent} disabled={loading} className="w-full gradient-primary text-primary-foreground">
                  {loading ? 'Creando...' : 'Crear Estudiante'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editStudent} onOpenChange={open => !open && setEditStudent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Editar Estudiante</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {editStudent && (
              <div className="flex justify-center">
                <AvatarUpload
                  userId={editStudent.user_id}
                  avatarUrl={editStudent.avatar_url}
                  initials={(editStudent.nombre?.[0] || '') + (editStudent.apellidos?.[0] || '')}
                  size="lg"
                  onUpload={() => loadStudents()}
                />
              </div>
            )}
            <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
            <div><Label>Apellidos</Label><Input value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })} /></div>
            <div><Label>Fecha de Nacimiento</Label><Input type="date" value={form.fechaNacimiento} onChange={e => setForm({ ...form, fechaNacimiento: e.target.value })} /></div>
            <div><Label>Colegio</Label><Input value={form.colegio} onChange={e => setForm({ ...form, colegio: e.target.value })} placeholder="Nombre del colegio" /></div>
            {form.nombre && form.apellidos && (
              <p className="text-sm text-muted-foreground">Usuario generado: <span className="font-mono text-primary font-semibold">{generateUsuario(form.nombre, form.apellidos)}</span></p>
            )}
            <Button onClick={saveEdit} className="w-full gradient-primary text-primary-foreground">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="students" className="gap-1"><Users className="w-4 h-4" /> <span className="hidden sm:inline">Estudiantes</span></TabsTrigger>
          <TabsTrigger value="courses" className="gap-1"><BookOpen className="w-4 h-4" /> <span className="hidden sm:inline">Cursos</span></TabsTrigger>
          <TabsTrigger value="stats" className="gap-1"><BarChart3 className="w-4 h-4" /> <span className="hidden sm:inline">Estadísticas</span></TabsTrigger>
          <TabsTrigger value="connections" className="gap-1"><Wifi className="w-4 h-4" /> <span className="hidden sm:inline">Conexiones</span></TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-3 mt-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, cédula, usuario o colegio..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>

          {/* Student List */}
          <div className="space-y-2">
            {filtered.map((student, i) => (
              <motion.div key={student.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className={`card-elevated ${!student.activo ? 'opacity-50' : ''}`}>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <AvatarUpload
                        userId={student.user_id}
                        avatarUrl={student.avatar_url}
                        initials={(student.nombre?.[0] || '') + (student.apellidos?.[0] || '')}
                        size="sm"
                        editable={false}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-foreground">{student.nombre} {student.apellidos}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span>📋 {student.cedula}</span>
                          <span>🔑 {student.usuario || '-'}</span>
                          {(student as any).colegio && <span>🏫 {(student as any).colegio}</span>}
                          {student.fecha_nacimiento && <span>🎂 {calcAge(student.fecha_nacimiento)}</span>}
                          <span>📅 {formatDate(student.created_at)}</span>
                          <span className={student.activo ? 'text-[hsl(var(--neon-mint))]' : 'text-destructive'}>
                            {student.activo ? '● Activo' : '● Bloqueado'}
                          </span>
                        </div>
                        {/* Carrera de interés */}
                        {studentCarreras[student.user_id] && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                            <span className="text-muted-foreground">🎯 Carrera de interés:</span>
                            <Badge variant="outline" className="text-[10px] gap-1 border-pink-500/40 text-pink-600 dark:text-pink-400">
                              {studentCarreras[student.user_id].nombre}
                              <span className="opacity-70">· {studentCarreras[student.user_id].universidad}</span>
                              <span className="font-mono">{studentCarreras[student.user_id].porcentaje}%</span>
                            </Badge>
                          </div>
                        )}
                        {studentCursos[student.user_id]?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {studentCursos[student.user_id].map(c => (
                              <Badge
                                key={c.id}
                                variant="outline"
                                className="text-[10px] cursor-pointer gap-1 border-[hsl(var(--neon-violet)/0.4)] text-[hsl(var(--neon-violet))] hover:bg-[hsl(var(--neon-violet)/0.1)]"
                                onClick={() => { setActiveTab('courses'); }}
                              >
                                <BookOpen className="w-3 h-3" /> {c.titulo}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" title="Ver como estudiante" onClick={() => navigate(`/admin/student-view/${student.user_id}`)}>
                          <Eye className="w-4 h-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => {
                          setEditStudent(student);
                          setForm({ nombre: student.nombre, apellidos: student.apellidos, cedula: student.cedula, fechaNacimiento: student.fecha_nacimiento || '', colegio: (student as any).colegio || '' });
                        }}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" title={student.activo ? 'Bloquear' : 'Activar'} onClick={() => toggleActive(student)}>
                          {student.activo ? <Ban className="w-4 h-4 text-destructive" /> : <CheckCircle className="w-4 h-4 text-[hsl(var(--neon-mint))]" />}
                        </Button>
                        <Button variant="ghost" size="icon" title="Reiniciar contraseña" onClick={() => resetPassword(student)}>
                          <KeyRound className="w-4 h-4 text-[hsl(var(--neon-orange))]" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Eliminar" onClick={() => deleteStudent(student)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">No hay estudiantes</p>}
          </div>
        </TabsContent>

        <TabsContent value="courses" className="mt-3">
          <CourseManager students={students} />
        </TabsContent>

        <TabsContent value="stats" className="mt-3">
          <StudentStatsTab students={students} />
        </TabsContent>

        <TabsContent value="connections" className="mt-3">
          <ConnectionsTab students={students as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
