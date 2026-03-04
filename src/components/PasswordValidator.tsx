import { Check, X } from 'lucide-react';

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

export default function PasswordValidator({ password }: { password: string }) {
  if (!password) return null;
  return (
    <div className="space-y-1 mt-2">
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
  );
}
