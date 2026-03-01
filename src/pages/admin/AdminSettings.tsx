import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface RoleRow {
  id: string;
  user_id: string;
  role: string;
}

export default function AdminSettings() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<{ role: string }>({ role: '' });
  const { toast } = useToast();

  useEffect(() => { loadRoles(); }, []);

  async function loadRoles() {
    const { data } = await supabase.from('user_roles').select('*');
    setRoles(data || []);
  }

  async function updateRole(id: string) {
    if (!['admin', 'estudiante'].includes(editValue.role)) {
      toast({ title: 'Error', description: 'El rol debe ser "admin" o "estudiante"', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('user_roles').update({ role: editValue.role as 'admin' | 'estudiante' }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Rol actualizado' });
    }
    setEditingId(null);
    loadRoles();
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-display font-bold">Ajustes — Roles de Usuario</h1>
      <p className="text-sm text-muted-foreground">Haz doble clic en un rol para editarlo. Solo se permiten los valores "admin" o "estudiante".</p>

      <Card className="card-elevated overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium">ID</th>
                  <th className="text-left p-3 font-medium">User ID</th>
                  <th className="text-left p-3 font-medium">Rol</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(row => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{row.id.slice(0, 8)}...</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{row.user_id.slice(0, 8)}...</td>
                    <td className="p-3">
                      {editingId === row.id ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            value={editValue.role}
                            onChange={e => setEditValue({ role: e.target.value })}
                            className="h-8 w-32"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') updateRole(row.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <Button size="sm" onClick={() => updateRole(row.id)}>✓</Button>
                        </div>
                      ) : (
                        <span
                          className={`cursor-pointer px-2 py-1 rounded text-xs font-medium ${
                            row.role === 'admin' ? 'bg-neon-violet/20 text-neon-violet' : 'bg-secondary/20 text-secondary'
                          }`}
                          onDoubleClick={() => {
                            setEditingId(row.id);
                            setEditValue({ role: row.role });
                          }}
                        >
                          {row.role}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
