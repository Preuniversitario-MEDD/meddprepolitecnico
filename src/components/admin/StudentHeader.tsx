import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Smartphone, Tablet, Monitor } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

function getDeviceIcon(type: string) {
  if (type === 'phone') return <Smartphone className="w-4 h-4" />;
  if (type === 'tablet') return <Tablet className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

function isOnline(lastSeen: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000;
}

export default function StudentHeader({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const initials = (profile.nombre?.[0] || '') + (profile.apellidos?.[0] || '');

  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
      <Avatar className="w-12 h-12">
        {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
        <AvatarFallback className="bg-primary/20 text-primary">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-display font-bold truncate">{profile.nombre} {profile.apellidos}</h1>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>📋 {profile.cedula}</span>
          <span>🔑 {profile.usuario}</span>
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${isOnline(profile.last_seen_at) ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
            {getDeviceIcon(profile.device_type || '')}
            {profile.last_seen_at ? new Date(profile.last_seen_at).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
          </span>
          {profile.ip_address && <span>🌐 {profile.ip_address}</span>}
        </div>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full ${profile.activo ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'}`}>
        {profile.activo ? 'Activo' : 'Bloqueado'}
      </span>
    </div>
  );
}
