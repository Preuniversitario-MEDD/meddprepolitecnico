import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  userId: string;
  avatarUrl: string | null;
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  onUpload?: (url: string) => void;
  editable?: boolean;
}

const sizes = { sm: 'w-10 h-10', md: 'w-16 h-16', lg: 'w-24 h-24' };

export default function AvatarUpload({ userId, avatarUrl, initials, size = 'md', onUpload, editable = true }: Props) {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState(avatarUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Error', description: 'La imagen no debe superar 2MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) {
      toast({ title: 'Error', description: upErr.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const finalUrl = `${publicUrl}?t=${Date.now()}`;

    await supabase.from('profiles').update({ avatar_url: finalUrl }).eq('user_id', userId);
    setUrl(finalUrl);
    onUpload?.(finalUrl);
    toast({ title: '¡Avatar actualizado!' });
    setUploading(false);
  }

  return (
    <div className="relative group">
      <Avatar className={`${sizes[size]} border-2 border-border`}>
        <AvatarImage src={url || undefined} />
        <AvatarFallback className="gradient-neon text-primary-foreground font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>
      {editable && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </>
      )}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
