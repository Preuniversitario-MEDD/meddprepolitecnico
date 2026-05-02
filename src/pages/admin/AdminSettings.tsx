import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { APP_INFO } from '@/App';
import { Info } from 'lucide-react';

interface RoleRow {
  id: string;
  user_id: string;
  role: string;
  profile?: { nombre: string; apellidos: string; cedula: string } | null;
}

export default function AdminSettings() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const { toast } = useToast();

  useEffect(() => { loadRoles(); }, []);

  async function loadRoles() {
    const { data } = await supabase.from('user_roles').select('*');
    if (!data) return setRoles([]);

    // Fetch profiles for display
    const userIds = [...new Set(data.map(r => r.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('user_id, nombre, apellidos, cedula').in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    setRoles(data.map(r => ({ ...r, profile: profileMap.get(r.user_id) || null })));
  }

  async function updateRole(row: RoleRow) {
    if (!['admin', 'estudiante'].includes(editRole)) {
      toast({ title: 'Error', description: 'El rol debe ser "admin" o "estudiante"', variant: 'destructive' });
      return;
    }
    // Only update the role column, never the id or user_id
    const { error } = await supabase.from('user_roles').update({ role: editRole as 'admin' | 'estudiante' }).eq('id', row.id);
    if (error) {
      toast({ title: 'Error al actualizar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Rol actualizado correctamente' });
    }
    setEditingId(null);
    loadRoles();
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-display font-bold">Roles de Usuario</h1>
      <p className="text-sm text-muted-foreground">
        Haz doble clic en un rol para editarlo. Solo se permiten <strong>admin</strong> o <strong>estudiante</strong>.

      <Card className="card-elevated overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-foreground">Cédula</th>
                  <th className="text-left p-3 font-medium text-foreground">Nombre</th>
                  <th className="text-left p-3 font-medium text-foreground">User ID</th>
                  <th className="text-left p-3 font-medium text-foreground">Rol</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3 font-mono text-xs text-foreground">
                      {row.profile?.cedula || '—'}
                    </td>
                    <td className="p-3 text-foreground">
                      {row.profile ? `${row.profile.nombre} ${row.profile.apellidos}` : '—'}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground" title={row.user_id}>
                      {row.user_id.slice(0, 8)}…
                    </td>
                    <td className="p-3">
                      {editingId === row.id ? (
                        <div className="flex gap-2 items-center">
                          <Select value={editRole} onValueChange={setEditRole}>
                            <SelectTrigger className="h-8 w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">admin</SelectItem>
                              <SelectItem value="estudiante">estudiante</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => updateRole(row)}>✓</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>✗</Button>
                        </div>
                      ) : (
                        <span
                          className={`cursor-pointer px-2 py-1 rounded text-xs font-medium ${
                            row.role === 'admin'
                              ? 'bg-neon-violet/20 text-[hsl(var(--neon-violet))]'
                              : 'bg-primary/10 text-primary'
                          }`}
                          onDoubleClick={() => {
                            setEditingId(row.id);
                            setEditRole(row.role);
                          }}
                          title="Doble clic para editar"
                        >
                          {row.role}
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))}
                {roles.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No hay registros</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
