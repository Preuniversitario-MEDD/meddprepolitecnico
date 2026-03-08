import { FileText, Download, Image as ImageIcon } from 'lucide-react';

interface MessageAttachmentProps {
  url: string;
  nombre: string;
  tipo: string;
  isMine: boolean;
}

export function MessageAttachment({ url, nombre, tipo, isMine }: MessageAttachmentProps) {
  const isImage = tipo?.startsWith('image/');

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1">
        <img
          src={url}
          alt={nombre}
          className="max-w-full max-h-60 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
          loading="lazy"
        />
        <p className={`text-[10px] mt-0.5 truncate ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
          {nombre}
        </p>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 mt-1 p-2 rounded-lg transition-colors ${
        isMine ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background/50 hover:bg-background/80'
      }`}
    >
      <FileText className="w-5 h-5 shrink-0" />
      <span className="text-xs truncate flex-1">{nombre}</span>
      <Download className="w-3.5 h-3.5 shrink-0 opacity-60" />
    </a>
  );
}
