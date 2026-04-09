import VocationalTest from "@/components/vocational/VocationalTest";
import { Compass } from "lucide-react";

export default function VocationalTestPage() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Compass className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Test Vocacional
          </h1>
          <p className="text-sm text-muted-foreground">
            Descubre las carreras que mejor se ajustan a tus aptitudes
          </p>
        </div>
      </div>
      <VocationalTest />
    </div>
  );
}
