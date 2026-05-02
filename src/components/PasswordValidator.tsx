import { Check, X } from 'lucide-react';
import { passwordStrength } from '@/lib/security';

const rules = [
  { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Una letra minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p: string) => /\d/.test(p) },
  { label: 'Un carácter especial (!@#$%^&*)', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p) },
];

export function validatePassword(password: string): boolean {
  return rules.every(r => r.test(password));
}

const STRENGTH_META = {
  debil:   { label: 'Débil',  color: 'bg-destructive', text: 'text-destructive', width: 'w-1/3' },
  media:   { label: 'Media',  color: 'bg-[hsl(var(--neon-orange))]', text: 'text-[hsl(var(--neon-orange))]', width: 'w-2/3' },
  fuerte:  { label: 'Fuerte', color: 'bg-[hsl(var(--neon-mint))]', text: 'text-[hsl(var(--neon-mint))]', width: 'w-full' },
} as const;

export default function PasswordValidator({ password }: { password: string }) {
  if (!password) return null;
  const strength = passwordStrength(password);
  const meta = STRENGTH_META[strength];
  return (
    <div className="space-y-2 mt-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Fortaleza:</span>
          <span className={`font-semibold ${meta.text}`}>{meta.label}</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${meta.color} ${meta.width} transition-all`} />
        </div>
      </div>
      <div className="space-y-1">
        {rules.map((rule, i) => {
          const pass = rule.test(password);
          return (
            <div key={i} className={`flex items-center gap-2 text-xs ${pass ? 'text-accent' : 'text-muted-foreground'}`}>
              {pass ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {rule.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
