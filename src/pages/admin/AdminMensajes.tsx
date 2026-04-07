import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Plus, ArrowLeft, Search, Eye, Shield, Megaphone, Smartphone, Tablet, Monitor, CheckCheck, Trash2, CheckSquare, ChevronDown, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageAttachment } from '@/components/messaging/MessageAttachment';
import { FileUploadButton } from '@/components/messaging/FileUploadButton';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

interface Conversation {
  id: string;
  participants: { user_id: string; nombre: string; apellidos: string; avatar_url: string | null }[];
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
}

interface Message {
  id: string;
  conversacion_id: string;
  sender_id: string;
  contenido: string;
  leido: boolean;
  created_at: string;
  archivo_url?: string | null;
  archivo_nombre?: string | null;
  archivo_tipo?: string | null;
}

function groupMessagesByDay(messages: Message[]) {
  const groups: { date: string; label: string; messages: Message[] }[] = [];
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  for (const msg of messages) {
    const d = new Date(msg.created_at);
    const dateKey = d.toLocaleDateString('es');
    let label = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
    if (d.toDateString() === today.toDateString()) label = 'Hoy';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Ayer';

    const last = groups[groups.length - 1];
    if (last && last.date === dateKey) {
      last.messages.push(msg);
    } else {
      groups.push({ date: dateKey, label, messages: [msg] });
    }
  }
  return groups;
}

export default function AdminMensajes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { play: playNotification } = useNotificationSound();
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [searchConv, setSearchConv] = useState('');
  const [profileMap, setProfileMap] = useState<Map<string, any>>(new Map());
  const [presenceMap, setPresenceMap] = useState<Map<string, { last_seen_at: string; device_type: string; ip_address: string }>>(new Map());
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Bulk selection
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMsgs, setSelectedMsgs] = useState<Set<string>>(new Set());
  // Collapsed day groups
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  // Message search
  const [searchMsg, setSearchMsg] = useState('');

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (tab === 'mine') {
      const { data: myParts } = await supabase
        .from('conversacion_participantes')
        .select('conversacion_id')
        .eq('user_id', user.id);

      if (!myParts?.length) { setConversations([]); setLoading(false); return; }
      const convIds = myParts.map(p => p.conversacion_id);

      const { data: allParts } = await supabase
        .from('conversacion_participantes')
        .select('conversacion_id, user_id')
        .in('conversacion_id', convIds);

      const uids = [...new Set(allParts?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase.from('profiles').select('user_id, nombre, apellidos, avatar_url, last_seen_at, device_type, ip_address').in('user_id', uids);
      const pMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setProfileMap(pMap);
      setPresenceMap(new Map(profiles?.map(p => [p.user_id, { last_seen_at: p.last_seen_at || '', device_type: p.device_type || '', ip_address: p.ip_address || '' }]) || []));

      const convList: Conversation[] = convIds.map(cid => ({
        id: cid,
        participants: (allParts?.filter(p => p.conversacion_id === cid && p.user_id !== user.id) || []).map(p => {
          const prof = pMap.get(p.user_id);
          return { user_id: p.user_id, nombre: prof?.nombre || '', apellidos: prof?.apellidos || '', avatar_url: prof?.avatar_url || null };
        }),
      }));

      for (const conv of convList) {
        const { data: lastMsg } = await supabase.from('mensajes').select('contenido, created_at, archivo_nombre').eq('conversacion_id', conv.id).order('created_at', { ascending: false }).limit(1);
        if (lastMsg?.[0]) {
          conv.lastMessage = lastMsg[0].archivo_nombre ? `📎 ${lastMsg[0].archivo_nombre}` : lastMsg[0].contenido;
          conv.lastMessageAt = lastMsg[0].created_at;
        }
        const { count } = await supabase.from('mensajes').select('*', { count: 'exact', head: true })
          .eq('conversacion_id', conv.id).eq('leido', false).neq('sender_id', user.id);
        conv.unread = count || 0;
      }
      convList.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
      setConversations(convList);
    } else {
      const { data: allConvs } = await supabase.from('conversaciones').select('id').order('updated_at', { ascending: false });
      if (!allConvs?.length) { setConversations([]); setLoading(false); return; }

      const convIds = allConvs.map(c => c.id);
      const { data: allParts } = await supabase.from('conversacion_participantes').select('conversacion_id, user_id').in('conversacion_id', convIds);
      const uids = [...new Set(allParts?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase.from('profiles').select('user_id, nombre, apellidos, avatar_url, last_seen_at, device_type, ip_address').in('user_id', uids);
      const pMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setProfileMap(pMap);
      setPresenceMap(new Map(profiles?.map(p => [p.user_id, { last_seen_at: p.last_seen_at || '', device_type: p.device_type || '', ip_address: p.ip_address || '' }]) || []));

      const convList: Conversation[] = convIds.map(cid => ({
        id: cid,
        participants: (allParts?.filter(p => p.conversacion_id === cid) || []).map(p => {
          const prof = pMap.get(p.user_id);
          return { user_id: p.user_id, nombre: prof?.nombre || '', apellidos: prof?.apellidos || '', avatar_url: prof?.avatar_url || null };
        }),
      }));

      for (const conv of convList) {
        const { data: lastMsg } = await supabase.from('mensajes').select('contenido, created_at, archivo_nombre').eq('conversacion_id', conv.id).order('created_at', { ascending: false }).limit(1);
        if (lastMsg?.[0]) {
          conv.lastMessage = lastMsg[0].archivo_nombre ? `📎 ${lastMsg[0].archivo_nombre}` : lastMsg[0].contenido;
          conv.lastMessageAt = lastMsg[0].created_at;
        }
      }
      convList.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
      setConversations(convList);
    }
    setLoading(false);
  }, [user, tab]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (!selectedConv || !user) return;
    const load = async () => {
      const { data } = await supabase.from('mensajes').select('*').eq('conversacion_id', selectedConv).order('created_at', { ascending: true });
      setMessages(data || []);

      await supabase.from('mensajes').update({ leido: true })
        .eq('conversacion_id', selectedConv)
        .neq('sender_id', user.id)
        .eq('leido', false);

      setConversations(prev => prev.map(c => c.id === selectedConv ? { ...c, unread: 0 } : c));
    };
    load();

    const channel = supabase
      .channel(`admin-msg-${selectedConv}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `conversacion_id=eq.${selectedConv}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages(prev => [...prev, msg]);
          if (msg.sender_id !== user.id) {
            playNotification();
            supabase.from('mensajes').update({ leido: true }).eq('id', msg.id);
          }
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'mensajes', filter: `conversacion_id=eq.${selectedConv}` },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConv, user]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const uploadFile = async (file: File): Promise<{ url: string; nombre: string; tipo: string } | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('message-attachments').upload(path, file);
    if (error) { toast({ title: 'Error al subir archivo', description: error.message, variant: 'destructive' }); return null; }
    const { data: { publicUrl } } = supabase.storage.from('message-attachments').getPublicUrl(path);
    return { url: publicUrl, nombre: file.name, tipo: file.type };
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachedFile) || !selectedConv || !user) return;
    const { data: myPart } = await supabase.from('conversacion_participantes').select('id').eq('conversacion_id', selectedConv).eq('user_id', user.id).limit(1);
    if (!myPart?.length) { toast({ title: 'Solo lectura', description: 'No eres participante de esta conversación', variant: 'destructive' }); return; }

    setSending(true);
    let fileData: { url: string; nombre: string; tipo: string } | null = null;
    if (attachedFile) {
      fileData = await uploadFile(attachedFile);
      if (!fileData) { setSending(false); return; }
    }

    await supabase.from('mensajes').insert({
      conversacion_id: selectedConv,
      sender_id: user.id,
      contenido: newMessage.trim() || (fileData ? fileData.nombre : ''),
      archivo_url: fileData?.url || null,
      archivo_nombre: fileData?.nombre || null,
      archivo_tipo: fileData?.tipo || null,
    });
    setNewMessage('');
    setAttachedFile(null);
    setSending(false);
  };

  const deleteMessage = async (msgId: string) => {
    const { error } = await supabase.from('mensajes').delete().eq('id', msgId);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el mensaje', variant: 'destructive' });
    } else {
      setMessages(prev => prev.filter(m => m.id !== msgId));
    }
  };

  const bulkDelete = async (filter: 'all' | 'sent' | 'received') => {
    if (!user || selectedMsgs.size === 0) return;
    const idsToDelete = [...selectedMsgs].filter(id => {
      const msg = messages.find(m => m.id === id);
      if (!msg) return false;
      if (filter === 'sent') return msg.sender_id === user.id;
      if (filter === 'received') return msg.sender_id !== user.id;
      return true;
    });

    if (idsToDelete.length === 0) return;

    for (const id of idsToDelete) {
      await supabase.from('mensajes').delete().eq('id', id);
    }
    setMessages(prev => prev.filter(m => !idsToDelete.includes(m.id)));
    setSelectedMsgs(new Set());
    setSelectMode(false);
    toast({ title: 'Eliminados', description: `${idsToDelete.length} mensaje(s) eliminado(s)` });
  };

  const startNewConversation = async (targetUserId: string) => {
    if (!user) return;
    const { data: myConvs } = await supabase.from('conversacion_participantes').select('conversacion_id').eq('user_id', user.id);
    if (myConvs?.length) {
      const { data: existing } = await supabase.from('conversacion_participantes').select('conversacion_id').eq('user_id', targetUserId).in('conversacion_id', myConvs.map(c => c.conversacion_id));
      if (existing?.length) { setSelectedConv(existing[0].conversacion_id); setShowNewChat(false); return; }
    }
    const { data: conv } = await supabase.from('conversaciones').insert({}).select().single();
    if (!conv) return;
    await supabase.from('conversacion_participantes').insert([
      { conversacion_id: conv.id, user_id: user.id },
      { conversacion_id: conv.id, user_id: targetUserId },
    ]);
    setSelectedConv(conv.id);
    setShowNewChat(false);
    fetchConversations();
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('user_id, nombre, apellidos, avatar_url, cedula').neq('user_id', user?.id || '').eq('activo', true);
    setUsers(data || []);
    setShowNewChat(true);
    setSearchUser('');
  };

  const selectedConversation = conversations.find(c => c.id === selectedConv);

  const getChatTitle = () => {
    if (!selectedConversation) return 'Chat';
    if (tab === 'all') {
      return selectedConversation.participants.map(p => `${p.nombre} ${p.apellidos}`).join(' ↔ ');
    }
    const other = selectedConversation.participants[0];
    return other ? `${other.nombre} ${other.apellidos}` : 'Chat';
  };

  const filteredUsers = users.filter(u => `${u.nombre} ${u.apellidos} ${u.cedula}`.toLowerCase().includes(searchUser.toLowerCase()));

  const getSenderName = (senderId: string) => {
    const prof = profileMap.get(senderId);
    return prof ? `${prof.nombre} ${prof.apellidos}` : '';
  };

  const getDeviceIcon = (type: string) => {
    if (type === 'phone') return <Smartphone className="w-3 h-3" />;
    if (type === 'tablet') return <Tablet className="w-3 h-3" />;
    return <Monitor className="w-3 h-3" />;
  };

  const isOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000;
  };

  const formatLastSeen = (lastSeen: string) => {
    if (!lastSeen) return 'Nunca';
    const d = new Date(lastSeen);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getParticipantPresence = () => {
    if (!selectedConversation) return null;
    const others = selectedConversation.participants.filter(p => p.user_id !== user?.id);
    return others.map(p => {
      const presence = presenceMap.get(p.user_id);
      return { ...p, ...(presence || { last_seen_at: '', device_type: '', ip_address: '' }) };
    });
  };

  const [adminIsParticipant, setAdminIsParticipant] = useState(false);
  useEffect(() => {
    if (!selectedConv || !user) { setAdminIsParticipant(false); return; }
    supabase.from('conversacion_participantes').select('id').eq('conversacion_id', selectedConv).eq('user_id', user.id).limit(1)
      .then(({ data }) => setAdminIsParticipant(!!(data && data.length > 0)));
  }, [selectedConv, user]);

  const [showBulk, setShowBulk] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);

  const sendBulkMessage = async () => {
    if (!bulkMessage.trim() || !user) return;
    setSendingBulk(true);
    try {
      const { data: students } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('activo', true)
        .neq('user_id', user.id);

      if (!students?.length) { toast({ title: 'Sin destinatarios', description: 'No hay estudiantes activos' }); setSendingBulk(false); return; }

      for (const student of students) {
        const { data: myConvs } = await supabase
          .from('conversacion_participantes')
          .select('conversacion_id')
          .eq('user_id', user.id);

        let convId: string | null = null;

        if (myConvs?.length) {
          const { data: existing } = await supabase
            .from('conversacion_participantes')
            .select('conversacion_id')
            .eq('user_id', student.user_id)
            .in('conversacion_id', myConvs.map(c => c.conversacion_id));
          if (existing?.length) convId = existing[0].conversacion_id;
        }

        if (!convId) {
          const { data: conv } = await supabase.from('conversaciones').insert({}).select().single();
          if (!conv) continue;
          await supabase.from('conversacion_participantes').insert([
            { conversacion_id: conv.id, user_id: user.id },
            { conversacion_id: conv.id, user_id: student.user_id },
          ]);
          convId = conv.id;
        }

        await supabase.from('mensajes').insert({
          conversacion_id: convId,
          sender_id: user.id,
          contenido: bulkMessage.trim(),
        });
      }

      toast({ title: 'Enviado', description: `Mensaje enviado a ${students.length} estudiantes` });
      setBulkMessage('');
      setShowBulk(false);
      fetchConversations();
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo enviar el mensaje masivo', variant: 'destructive' });
    }
    setSendingBulk(false);
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);

  // Filter conversations by search
  const displayedConversations = conversations.filter(conv => {
    if (!searchConv.trim()) return true;
    const name = conv.participants.map(p => `${p.nombre} ${p.apellidos}`).join(' ').toLowerCase();
    const matchesName = name.includes(searchConv.toLowerCase());
    const matchesMsg = (conv.lastMessage || '').toLowerCase().includes(searchConv.toLowerCase());
    return matchesName || matchesMsg;
  });

  // Filter messages by search
  const filteredMessages = useMemo(() => {
    if (!searchMsg.trim()) return messages;
    return messages.filter(m => m.contenido.toLowerCase().includes(searchMsg.toLowerCase()));
  }, [messages, searchMsg]);

  const dayGroups = useMemo(() => groupMessagesByDay(filteredMessages), [filteredMessages]);

  const toggleDay = (date: string) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  const toggleMsgSelect = (id: string) => {
    setSelectedMsgs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const allIds = filteredMessages.map(m => m.id);
    setSelectedMsgs(new Set(allIds));
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen flex">
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-border bg-card`}>
        <div className="p-4 border-b border-border space-y-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Mensajes
              {totalUnread > 0 && (
                <Badge variant="destructive" className="h-5 w-5 p-0 text-xs flex items-center justify-center rounded-full">{totalUnread}</Badge>
              )}
            </h2>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setShowBulk(true)} title="Mensaje masivo"><Megaphone className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" onClick={loadUsers}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>
          <Tabs value={tab} onValueChange={v => { setTab(v as any); setSelectedConv(null); }}>
            <TabsList className="w-full">
              <TabsTrigger value="mine" className="flex-1"><MessageSquare className="w-3 h-3 mr-1" />Mis chats</TabsTrigger>
              <TabsTrigger value="all" className="flex-1"><Eye className="w-3 h-3 mr-1" />Todos</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o mensaje..." value={searchConv} onChange={e => setSearchConv(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
        </div>

        {showNewChat && (
          <div className="p-3 border-b border-border space-y-2 bg-accent/30">
            <p className="text-xs font-medium text-foreground">Nueva conversación</p>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Escribe un nombre..." value={searchUser} onChange={e => setSearchUser(e.target.value)} className="pl-9" autoFocus />
            </div>
            {searchUser.trim().length > 0 && (
              <ScrollArea className="max-h-48">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Sin resultados</p>
                ) : (
                  filteredUsers.map(u => (
                    <button key={u.user_id} onClick={() => startNewConversation(u.user_id)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent text-left transition-colors">
                      <Avatar className="w-8 h-8">
                        {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                        <AvatarFallback className="text-xs bg-primary/20 text-primary">{(u.nombre?.[0] || '') + (u.apellidos?.[0] || '')}</AvatarFallback>
                      </Avatar>
                      <div><p className="text-sm font-medium text-foreground">{u.nombre} {u.apellidos}</p><p className="text-xs text-muted-foreground">{u.cedula}</p></div>
                    </button>
                  ))
                )}
              </ScrollArea>
            )}
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowNewChat(false)}>Cancelar</Button>
          </div>
        )}

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
          ) : displayedConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No hay conversaciones</div>
          ) : (
            displayedConversations.map(conv => {
              const displayName = tab === 'all'
                ? conv.participants.map(p => `${p.nombre} ${p.apellidos}`).join(' ↔ ')
                : conv.participants[0] ? `${conv.participants[0].nombre} ${conv.participants[0].apellidos}` : 'Usuario';
              const initials = conv.participants[0] ? (conv.participants[0].nombre?.[0] || '') + (conv.participants[0].apellidos?.[0] || '') : '?';
              const presence = conv.participants[0] ? presenceMap.get(conv.participants[0].user_id) : null;
              return (
                <button key={conv.id} onClick={() => { setSelectedConv(conv.id); setSelectMode(false); setSelectedMsgs(new Set()); setSearchMsg(''); }}
                  className={`w-full flex items-center gap-3 p-3 border-b border-border/50 hover:bg-accent/50 transition-colors ${selectedConv === conv.id ? 'bg-accent' : ''}`}>
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      {conv.participants[0]?.avatar_url && <AvatarImage src={conv.participants[0].avatar_url} />}
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">{initials}</AvatarFallback>
                    </Avatar>
                    {presence && isOnline(presence.last_seen_at) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || 'Sin mensajes'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {(conv.unread || 0) > 0 && (
                      <Badge variant="destructive" className="h-5 w-5 p-0 text-xs flex items-center justify-center rounded-full">{conv.unread}</Badge>
                    )}
                    {tab === 'all' && <Eye className="w-3 h-3 text-muted-foreground" />}
                  </div>
                </button>
              );
            })
          )}
        </ScrollArea>
      </div>

      <div className={`${selectedConv ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-background`}>
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="p-3 border-b border-border flex items-center gap-3">
              <button onClick={() => setSelectedConv(null)} className="md:hidden p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm text-foreground truncate block">{getChatTitle()}</span>
                {(() => {
                  const presences = getParticipantPresence();
                  if (!presences?.length) return null;
                  return (
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {presences.map(p => (
                        <TooltipProvider key={p.user_id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <span className={`w-1.5 h-1.5 rounded-full ${isOnline(p.last_seen_at) ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                                {getDeviceIcon(p.device_type)}
                                <span>{formatLastSeen(p.last_seen_at)}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              <p><strong>{p.nombre} {p.apellidos}</strong></p>
                              <p>IP: {p.ip_address || 'Desconocida'}</p>
                              <p>Dispositivo: {p.device_type || 'Desconocido'}</p>
                              <p>Última conexión: {p.last_seen_at ? new Date(p.last_seen_at).toLocaleString('es') : 'Nunca'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSearchMsg(prev => prev ? '' : ' ')} title="Buscar en mensajes">
                  <Search className="w-4 h-4" />
                </Button>
                <Button
                  variant={selectMode ? 'secondary' : 'ghost'}
                  size="icon" className="h-8 w-8"
                  onClick={() => { setSelectMode(!selectMode); setSelectedMsgs(new Set()); }}
                  title="Seleccionar mensajes"
                >
                  <CheckSquare className="w-4 h-4" />
                </Button>
              </div>
              {tab === 'all' && !adminIsParticipant && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Solo lectura</span>}
            </div>

            {/* Search bar */}
            {searchMsg !== '' && (
              <div className="px-3 py-2 border-b border-border flex items-center gap-2 bg-muted/30">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar en esta conversación..."
                  value={searchMsg.trim() ? searchMsg : ''}
                  onChange={e => setSearchMsg(e.target.value)}
                  className="h-7 text-xs flex-1"
                  autoFocus
                />
                <button onClick={() => setSearchMsg('')}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
            )}

            {/* Bulk actions bar */}
            {selectMode && selectedMsgs.size > 0 && (
              <div className="px-3 py-2 border-b border-border flex items-center gap-2 bg-destructive/5">
                <span className="text-xs text-foreground font-medium">{selectedMsgs.size} seleccionado(s)</span>
                <div className="flex-1" />
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllVisible}>Seleccionar todo</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="destructive" size="sm" className="h-7 text-xs">
                      <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => bulkDelete('all')}>Eliminar todos</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkDelete('sent')}>Solo enviados</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkDelete('received')}>Solo recibidos</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Messages grouped by day */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-1">
                {dayGroups.map(group => {
                  const isCollapsed = collapsedDays.has(group.date);
                  return (
                    <div key={group.date}>
                      <button
                        onClick={() => toggleDay(group.date)}
                        className="flex items-center gap-2 mx-auto my-2 px-3 py-1 rounded-full bg-muted/60 hover:bg-muted transition-colors"
                      >
                        {isCollapsed ? <ChevronRight className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                        <span className="text-[11px] font-medium text-muted-foreground capitalize">{group.label}</span>
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{group.messages.length}</Badge>
                      </button>
                      {!isCollapsed && (
                        <div className="space-y-3">
                          <AnimatePresence>
                            {group.messages.map(msg => {
                              const isMine = msg.sender_id === user?.id;
                              return (
                                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className={`group flex items-start gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                  {selectMode && (
                                    <div className="self-center">
                                      <Checkbox
                                        checked={selectedMsgs.has(msg.id)}
                                        onCheckedChange={() => toggleMsgSelect(msg.id)}
                                        className="h-4 w-4"
                                      />
                                    </div>
                                  )}
                                  {isMine && !selectMode && (
                                    <button onClick={() => deleteMessage(msg.id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-1 p-1 rounded-full hover:bg-destructive/10"
                                      title="Eliminar mensaje">
                                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                    </button>
                                  )}
                                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'}`}>
                                    {tab === 'all' && !isMine && <p className="text-[10px] font-medium mb-1 opacity-70">{getSenderName(msg.sender_id)}</p>}
                                    {msg.contenido && (!msg.archivo_url || msg.contenido !== msg.archivo_nombre) && (
                                      <p className="break-words">{msg.contenido}</p>
                                    )}
                                    {msg.archivo_url && msg.archivo_nombre && msg.archivo_tipo && (
                                      <MessageAttachment url={msg.archivo_url} nombre={msg.archivo_nombre} tipo={msg.archivo_tipo} isMine={isMine} />
                                    )}
                                    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                      <p className="text-[10px]">
                                        {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                      {isMine && <CheckCheck className={`w-3 h-3 ${msg.leido ? 'text-accent' : ''}`} />}
                                    </div>
                                  </div>
                                  {!isMine && !selectMode && (
                                    <button onClick={() => deleteMessage(msg.id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity self-center ml-1 p-1 rounded-full hover:bg-destructive/10"
                                      title="Eliminar mensaje">
                                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                    </button>
                                  )}
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {adminIsParticipant && (
              <div className="p-3 border-t border-border">
                <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2 items-center"
                  onPaste={e => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    for (const item of Array.from(items)) {
                      if (item.type.startsWith('image/')) {
                        e.preventDefault();
                        const file = item.getAsFile();
                        if (file && file.size <= 10 * 1024 * 1024) setAttachedFile(file);
                        else if (file) toast({ title: 'Error', description: 'La imagen no puede superar 10MB', variant: 'destructive' });
                        return;
                      }
                    }
                  }}
                >
                  <FileUploadButton file={attachedFile} onFileSelect={setAttachedFile} disabled={sending} />
                  <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Escribe un mensaje o pega una imagen..." className="flex-1" maxLength={2000} />
                  <Button type="submit" size="icon" disabled={(!newMessage.trim() && !attachedFile) || sending}><Send className="w-4 h-4" /></Button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <MessageSquare className="w-12 h-12 mx-auto opacity-30" />
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showBulk} onOpenChange={setShowBulk}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mensaje masivo</DialogTitle>
            <DialogDescription>Envía un mensaje a todos los estudiantes activos. Se creará una conversación individual con cada uno.</DialogDescription>
          </DialogHeader>
          <Textarea value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} placeholder="Escribe tu mensaje para todos los estudiantes..." rows={4} maxLength={2000} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowBulk(false)}>Cancelar</Button>
            <Button onClick={sendBulkMessage} disabled={!bulkMessage.trim() || sendingBulk}>
              <Megaphone className="w-4 h-4 mr-2" />{sendingBulk ? 'Enviando...' : 'Enviar a todos'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
