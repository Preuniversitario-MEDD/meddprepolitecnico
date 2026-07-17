import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyCourses from "./tools/list-my-courses";
import listSessions from "./tools/list-sessions";
import getMyProgress from "./tools/get-my-progress";
import listRecentExams from "./tools/list-recent-exams";
import whoami from "./tools/whoami";

// Supabase auth issuer must be the direct project host, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "espolmedd-mcp",
  title: "ESPOLMEDD",
  version: "0.1.0",
  instructions:
    "Tools for the ESPOLMEDD university-prep platform. Use `whoami` to identify the signed-in user, `list_my_courses` to discover courses, then `list_sessions` and `get_my_progress` for study state. `list_recent_exams` returns recent exam attempts.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listMyCourses, listSessions, getMyProgress, listRecentExams],
});
