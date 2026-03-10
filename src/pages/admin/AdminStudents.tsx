import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Trash2, Ban, CheckCircle, KeyRound, Search, Edit, Eye, BookOpen, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AvatarUpload from '@/components/AvatarUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import CourseManager from '@/components/admin/CourseManager';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'> & { colegio?: string };

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
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Profile | null>(null);
  const [form, setForm] = useState({ nombre: '', apellidos: '', cedula: '', fechaNacimiento: '', colegio: '' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) {
      setStudents(data as Profile[]);
      // Load course assignments for each student
      const { data: allAssignments } = await supabase.from('curso_estudiantes').select('user_id, curso_id');
      const { data: allCursos } = await supabase.from('cursos').select('id, titulo');
      if (allAssignments && allCursos) {
        const map: Record<string, { id: string; titulo: string }[]> = {};
        for (const a of allAssignments) {
          const curso = allCursos.find(c => c.id === a.curso_id);
          if (curso) {
            if (!map[a.user_id]) map[a.user_id] = [];
            map[a.user_id].push(curso);
          }
        }
        setStudentCursos(map);
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
      body: { action: 'register', cedula: form.cedula, password: '123*789*h', nombre: form.nombre, apellidos: form.apellidos }
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

    toast({ title: '¡Éxito!', description: `Estudiante ${form.nombre} agregado. Cédula: ${form.cedula}, Clave: 123*789*h` });
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
    await supabase.functions.invoke('admin-users', { body: { action: 'reset_password', userId: student.user_id, newPassword: '123*789*h' } });
    toast({ title: 'Contraseña reiniciada', description: `Nueva clave temporal: 123*789*h` });
  }

  async function saveEdit() {
    if (!editStudent) return;
    const usuario = generateUsuario(form.nombre, form.apellidos);
    await supabase.from('profiles').update({
      nombre: form.nombre,
      apellidos: form.apellidos,
      fecha_nacimiento: form.fechaNacimiento || null,
      usuario,
      colegio: form.colegio,
    } as any).eq('id', editStudent.id);
    toast({ title: 'Actualizado', description: `Datos de ${form.nombre} actualizados` });
    setEditStudent(null);
    loadStudents();
  }

  const filtered = students.filter(s =>
    `${s.nombre} ${s.apellidos} ${s.cedula} ${s.usuario} ${(s as any).colegio || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-display font-bold">Estudiantes</h1>
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
                  <p>Credenciales: <span className="font-mono text-foreground">{form.cedula || '___'}</span> / <span className="font-mono text-foreground">123*789*h</span></p>
                </div>
              )}
              <Button onClick={addStudent} disabled={loading} className="w-full gradient-primary text-primary-foreground">
                {loading ? 'Creando...' : 'Crear Estudiante'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
    </div>
  );
}
