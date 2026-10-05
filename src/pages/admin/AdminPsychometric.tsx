import AdminPsychometricView from "@/components/psychometric/AdminPsychometricView";
import AdminIntegralPanel from "@/components/integral/AdminIntegralPanel";

export default function AdminPsychometric() {
  return (
    <div className="space-y-6">
      <div className="px-4 md:px-8 pt-4"><AdminIntegralPanel /></div>
      <AdminPsychometricView />
    </div>
  );
}
