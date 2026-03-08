import { useRef, useState } from 'react';
import { Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadButtonProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUploadButton({ file, onFileSelect, disabled }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE) {
      alert('El archivo no puede superar 10MB');
      return;
    }
    onFileSelect(f);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex items-center">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        onChange={handleChange}
      />
      {file ? (
        <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs max-w-[150px]">
          {file.type.startsWith('image/') ? <ImageIcon className="w-3 h-3 shrink-0" /> : <FileText className="w-3 h-3 shrink-0" />}
          <span className="truncate">{file.name}</span>
          <button onClick={() => onFileSelect(null)} className="shrink-0 hover:text-destructive">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <Button type="button" size="icon" variant="ghost" onClick={() => inputRef.current?.click()} disabled={disabled}>
          <Paperclip className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
