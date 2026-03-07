import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Plus, ArrowLeft, Search, Eye, Shield, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
}

export default function AdminMensajes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [profileMap, setProfileMap] = useState<Map<string, any>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (tab === 'mine') {
      // Same as student: only my conversations
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
      const { data: profiles } = await supabase.from('profiles').select('user_id, nombre, apellidos, avatar_url').in('user_id', uids);
      const pMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setProfileMap(pMap);

      const convList: Conversation[] = convIds.map(cid => ({
        id: cid,
        participants: (allParts?.filter(p => p.conversacion_id === cid && p.user_id !== user.id) || []).map(p => {
          const prof = pMap.get(p.user_id);
          return { user_id: p.user_id, nombre: prof?.nombre || '', apellidos: prof?.apellidos || '', avatar_url: prof?.avatar_url || null };
        }),
      }));

      for (const conv of convList) {
        const { data: lastMsg } = await supabase.from('mensajes').select('contenido, created_at').eq('conversacion_id', conv.id).order('created_at', { ascending: false }).limit(1);
        if (lastMsg?.[0]) { conv.lastMessage = lastMsg[0].contenido; conv.lastMessageAt = lastMsg[0].created_at; }
      }
      convList.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
      setConversations(convList);
    } else {
      // Admin: view ALL conversations
      const { data: allConvs } = await supabase.from('conversaciones').select('id').order('updated_at', { ascending: false });
      if (!allConvs?.length) { setConversations([]); setLoading(false); return; }

      const convIds = allConvs.map(c => c.id);
      const { data: allParts } = await supabase.from('conversacion_participantes').select('conversacion_id, user_id').in('conversacion_id', convIds);
      const uids = [...new Set(allParts?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase.from('profiles').select('user_id, nombre, apellidos, avatar_url').in('user_id', uids);
      const pMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setProfileMap(pMap);

      const convList: Conversation[] = convIds.map(cid => ({
        id: cid,
        participants: (allParts?.filter(p => p.conversacion_id === cid) || []).map(p => {
          const prof = pMap.get(p.user_id);
          return { user_id: p.user_id, nombre: prof?.nombre || '', apellidos: prof?.apellidos || '', avatar_url: prof?.avatar_url || null };
        }),
      }));

      for (const conv of convList) {
        const { data: lastMsg } = await supabase.from('mensajes').select('contenido, created_at').eq('conversacion_id', conv.id).order('created_at', { ascending: false }).limit(1);
        if (lastMsg?.[0]) { conv.lastMessage = lastMsg[0].contenido; conv.lastMessageAt = lastMsg[0].created_at; }
      }
      convList.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
      setConversations(convList);
    }
    setLoading(false);
  }, [user, tab]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (!selectedConv) return;
    const load = async () => {
      const { data } = await supabase.from('mensajes').select('*').eq('conversacion_id', selectedConv).order('created_at', { ascending: true });
      setMessages(data || []);
    };
    load();

    const channel = supabase
      .channel(`admin-msg-${selectedConv}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `conversacion_id=eq.${selectedConv}` },
        (payload) => setMessages(prev => [...prev, payload.new as Message]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConv]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || !user) return;
    // Admin can only send in own conversations
    const isParticipant = conversations.find(c => c.id === selectedConv)?.participants.some(() => true);
    const { data: myPart } = await supabase.from('conversacion_participantes').select('id').eq('conversacion_id', selectedConv).eq('user_id', user.id).limit(1);
    if (!myPart?.length) { toast({ title: 'Solo lectura', description: 'No eres participante de esta conversación', variant: 'destructive' }); return; }

    await supabase.from('mensajes').insert({ conversacion_id: selectedConv, sender_id: user.id, contenido: newMessage.trim() });
    setNewMessage('');
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
  };

  const selectedConversation = conversations.find(c => c.id === selectedConv);
  const isViewOnly = tab === 'all' && selectedConversation && !selectedConversation.participants.some(p => p.user_id === user?.id) === false;

  // For "all" tab, show all participants' names
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

  // Check if admin is participant in selected conversation
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
      // Get all active students
      const { data: students } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('activo', true)
        .neq('user_id', user.id);

      if (!students?.length) { toast({ title: 'Sin destinatarios', description: 'No hay estudiantes activos' }); setSendingBulk(false); return; }

      for (const student of students) {
        // Find or create conversation
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

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen flex">
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-border bg-card`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Mensajes
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
                  <div><p className="text-sm font-medium text-foreground">{u.nombre} {u.apellidos}</p><p className="text-xs text-muted-foreground">{u.cedula}</p></div>
                </button>
              ))}
            </ScrollArea>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowNewChat(false)}>Cancelar</Button>
          </div>
        )}

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No hay conversaciones</div>
          ) : (
            conversations.map(conv => {
              const displayName = tab === 'all'
                ? conv.participants.map(p => `${p.nombre} ${p.apellidos}`).join(' ↔ ')
                : conv.participants[0] ? `${conv.participants[0].nombre} ${conv.participants[0].apellidos}` : 'Usuario';
              const initials = conv.participants[0] ? (conv.participants[0].nombre?.[0] || '') + (conv.participants[0].apellidos?.[0] || '') : '?';
              return (
                <button key={conv.id} onClick={() => setSelectedConv(conv.id)}
                  className={`w-full flex items-center gap-3 p-3 border-b border-border/50 hover:bg-accent/50 transition-colors ${selectedConv === conv.id ? 'bg-accent' : ''}`}>
                  <Avatar className="w-10 h-10">
                    {conv.participants[0]?.avatar_url && <AvatarImage src={conv.participants[0].avatar_url} />}
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || 'Sin mensajes'}</p>
                  </div>
                  {tab === 'all' && <Eye className="w-3 h-3 text-muted-foreground" />}
                </button>
              );
            })
          )}
        </ScrollArea>
      </div>

      <div className={`${selectedConv ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-background`}>
        {selectedConv ? (
          <>
            <div className="p-3 border-b border-border flex items-center gap-3">
              <button onClick={() => setSelectedConv(null)} className="md:hidden p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
              <span className="font-medium text-sm text-foreground truncate">{getChatTitle()}</span>
              {tab === 'all' && !adminIsParticipant && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full ml-auto">Solo lectura</span>}
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                <AnimatePresence>
                  {messages.map(msg => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'}`}>
                          {tab === 'all' && !isMine && <p className="text-[10px] font-medium mb-1 opacity-70">{getSenderName(msg.sender_id)}</p>}
                          <p className="break-words">{msg.contenido}</p>
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

            {adminIsParticipant && (
              <div className="p-3 border-t border-border">
                <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                  <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Escribe un mensaje..." className="flex-1" maxLength={2000} />
                  <Button type="submit" size="icon" disabled={!newMessage.trim()}><Send className="w-4 h-4" /></Button>
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
