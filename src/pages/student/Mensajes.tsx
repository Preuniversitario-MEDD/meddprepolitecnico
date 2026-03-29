import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Plus, ArrowLeft, Search, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { MessageAttachment } from '@/components/messaging/MessageAttachment';
import { FileUploadButton } from '@/components/messaging/FileUploadButton';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export default function Mensajes() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { play: playNotification } = useNotificationSound();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [searchConv, setSearchConv] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [convTab, setConvTab] = useState<'all' | 'unread'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data: myParticipations } = await supabase
      .from('conversacion_participantes')
      .select('conversacion_id')
      .eq('user_id', user.id);

    if (!myParticipations?.length) { setConversations([]); setLoading(false); return; }

    const convIds = myParticipations.map(p => p.conversacion_id);

    const { data: allParticipants } = await supabase
      .from('conversacion_participantes')
      .select('conversacion_id, user_id')
      .in('conversacion_id', convIds);

    const userIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, nombre, apellidos, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const convList: Conversation[] = convIds.map(cid => {
      const parts = allParticipants?.filter(p => p.conversacion_id === cid && p.user_id !== user.id) || [];
      return {
        id: cid,
        participants: parts.map(p => {
          const prof = profileMap.get(p.user_id);
          return { user_id: p.user_id, nombre: prof?.nombre || '', apellidos: prof?.apellidos || '', avatar_url: prof?.avatar_url || null };
        }),
      };
    });

    for (const conv of convList) {
      const { data: lastMsg } = await supabase
        .from('mensajes')
        .select('contenido, created_at, leido, sender_id, archivo_nombre')
        .eq('conversacion_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (lastMsg?.[0]) {
        conv.lastMessage = lastMsg[0].archivo_nombre ? `📎 ${lastMsg[0].archivo_nombre}` : lastMsg[0].contenido;
        conv.lastMessageAt = lastMsg[0].created_at;
        const { count } = await supabase
          .from('mensajes')
          .select('*', { count: 'exact', head: true })
          .eq('conversacion_id', conv.id)
          .eq('leido', false)
          .neq('sender_id', user.id);
        conv.unread = count || 0;
      }
    }

    convList.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
    setConversations(convList);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (!selectedConv) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from('mensajes')
        .select('*')
        .eq('conversacion_id', selectedConv)
        .order('created_at', { ascending: true });
      setMessages(data || []);

      if (user) {
        await supabase
          .from('mensajes')
          .update({ leido: true })
          .eq('conversacion_id', selectedConv)
          .neq('sender_id', user.id)
          .eq('leido', false);
        setConversations(prev => prev.map(c => c.id === selectedConv ? { ...c, unread: 0 } : c));
      }
    };
    loadMessages();

    const channel = supabase
      .channel(`messages-${selectedConv}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `conversacion_id=eq.${selectedConv}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages(prev => [...prev, msg]);
          if (msg.sender_id !== user?.id) {
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
    setSending(true);

    let fileData: { url: string; nombre: string; tipo: string } | null = null;
    if (attachedFile) {
      fileData = await uploadFile(attachedFile);
      if (!fileData) { setSending(false); return; }
    }

    const { error } = await supabase.from('mensajes').insert({
      conversacion_id: selectedConv,
      sender_id: user.id,
      contenido: newMessage.trim() || (fileData ? fileData.nombre : ''),
      archivo_url: fileData?.url || null,
      archivo_nombre: fileData?.nombre || null,
      archivo_tipo: fileData?.tipo || null,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
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

  const startNewConversation = async (targetUserId: string) => {
    if (!user) return;
    const { data: myConvs } = await supabase
      .from('conversacion_participantes')
      .select('conversacion_id')
      .eq('user_id', user.id);

    if (myConvs?.length) {
      const { data: theirConvs } = await supabase
        .from('conversacion_participantes')
        .select('conversacion_id')
        .eq('user_id', targetUserId)
        .in('conversacion_id', myConvs.map(c => c.conversacion_id));

      if (theirConvs?.length) {
        setSelectedConv(theirConvs[0].conversacion_id);
        setShowNewChat(false);
        return;
      }
    }

    const { data: conv, error } = await supabase.from('conversaciones').insert({}).select().single();
    if (error || !conv) { toast({ title: 'Error', description: 'No se pudo crear la conversación', variant: 'destructive' }); return; }

    await supabase.from('conversacion_participantes').insert([
      { conversacion_id: conv.id, user_id: user.id },
      { conversacion_id: conv.id, user_id: targetUserId },
    ]);

    setSelectedConv(conv.id);
    setShowNewChat(false);
    fetchConversations();
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, nombre, apellidos, avatar_url, cedula')
      .neq('user_id', user?.id || '')
      .eq('activo', true);
    setUsers(data || []);
    setShowNewChat(true);
  };

  const selectedConversation = conversations.find(c => c.id === selectedConv);
  const otherName = selectedConversation?.participants?.[0]
    ? `${selectedConversation.participants[0].nombre} ${selectedConversation.participants[0].apellidos}`
    : 'Chat';

  const filteredUsers = users.filter(u =>
    `${u.nombre} ${u.apellidos} ${u.cedula}`.toLowerCase().includes(searchUser.toLowerCase())
  );

  // Filter conversations by tab and search
  const displayedConversations = conversations.filter(conv => {
    if (convTab === 'unread' && !(conv.unread && conv.unread > 0)) return false;
    if (searchConv.trim()) {
      const name = conv.participants.map(p => `${p.nombre} ${p.apellidos}`).join(' ').toLowerCase();
      if (!name.includes(searchConv.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen flex">
      {/* Sidebar */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-border bg-card`}>
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Mensajes
            </h2>
            <Button size="sm" variant="outline" onClick={loadUsers}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <Tabs value={convTab} onValueChange={v => setConvTab(v as any)}>
            <TabsList className="w-full h-8">
              <TabsTrigger value="all" className="flex-1 text-xs">Todos</TabsTrigger>
              <TabsTrigger value="unread" className="flex-1 text-xs">
                No leídos
                {conversations.filter(c => (c.unread || 0) > 0).length > 0 && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] inline-flex items-center justify-center">
                    {conversations.filter(c => (c.unread || 0) > 0).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Buscar conversación..." value={searchConv} onChange={e => setSearchConv(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
        </div>

        {showNewChat && (
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar usuario..." value={searchUser} onChange={e => setSearchUser(e.target.value)} className="pl-9" />
            </div>
            <ScrollArea className="max-h-48">
              {filteredUsers.map(u => (
                <button key={u.user_id} onClick={() => startNewConversation(u.user_id)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent text-left">
                  <Avatar className="w-8 h-8">
                    {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">{(u.nombre?.[0] || '') + (u.apellidos?.[0] || '')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.nombre} {u.apellidos}</p>
                    <p className="text-xs text-muted-foreground">{u.cedula}</p>
                  </div>
                </button>
              ))}
            </ScrollArea>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowNewChat(false)}>Cancelar</Button>
          </div>
        )}

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
          ) : displayedConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {convTab === 'unread' ? 'Sin mensajes no leídos' : 'No hay conversaciones aún'}
            </div>
          ) : (
            displayedConversations.map(conv => {
              const other = conv.participants[0];
              const initials = other ? (other.nombre?.[0] || '') + (other.apellidos?.[0] || '') : '?';
              return (
                <button key={conv.id} onClick={() => setSelectedConv(conv.id)}
                  className={`w-full flex items-center gap-3 p-3 border-b border-border/50 hover:bg-accent/50 transition-colors ${selectedConv === conv.id ? 'bg-accent' : ''}`}>
                  <Avatar className="w-10 h-10">
                    {other?.avatar_url && <AvatarImage src={other.avatar_url} />}
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">{other ? `${other.nombre} ${other.apellidos}` : 'Usuario'}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || 'Sin mensajes'}</p>
                  </div>
                  {(conv.unread || 0) > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">{conv.unread}</span>
                  )}
                </button>
              );
            })
          )}
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className={`${selectedConv ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-background`}>
        {selectedConv ? (
          <>
            <div className="p-3 border-b border-border flex items-center gap-3">
              <button onClick={() => setSelectedConv(null)} className="md:hidden p-1">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <Avatar className="w-8 h-8">
                {selectedConversation?.participants[0]?.avatar_url && <AvatarImage src={selectedConversation.participants[0].avatar_url} />}
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {selectedConversation?.participants[0] ? (selectedConversation.participants[0].nombre?.[0] || '') + (selectedConversation.participants[0].apellidos?.[0] || '') : '?'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm text-foreground">{otherName}</span>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                <AnimatePresence>
                  {messages.map(msg => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`group flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {isMine && (
                          <button onClick={() => deleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-1.5 p-1 rounded-full hover:bg-destructive/10"
                            title="Eliminar mensaje">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        )}
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'}`}>
                          {msg.contenido && (!msg.archivo_url || msg.contenido !== msg.archivo_nombre) && (
                            <p className="break-words">{msg.contenido}</p>
                          )}
                          {msg.archivo_url && msg.archivo_nombre && msg.archivo_tipo && (
                            <MessageAttachment url={msg.archivo_url} nombre={msg.archivo_nombre} tipo={msg.archivo_tipo} isMine={isMine} />
                          )}
                          <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

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
                <Button type="submit" size="icon" disabled={(!newMessage.trim() && !attachedFile) || sending}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
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
    </div>
  );
}