import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyCourses from "./tools/list-my-courses";
import listSessions from "./tools/list-sessions";
import getMyProgress from "./tools/get-my-progress";
import listRecentExams from "./tools/list-recent-exams";
import listLockedSections from "./tools/list-locked-sections";
import requestUnlock from "./tools/request-unlock";
import whoami from "./tools/whoami";

// Supabase auth issuer must be the direct project host, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "espolmedd-mcp",
  title: "ESPOLMEDD",
  version: "0.2.0",
  instructions:
    "Tools for the ESPOLMEDD university-prep platform. Use `whoami` to identify the signed-in user, `list_my_courses` to discover courses, then `list_sessions`, `get_my_progress` and `list_recent_exams` for study state. All list tools are paginated (`limit`/`offset`, response has pagination.next_offset). Use `list_locked_sections` to see which sessions are blocked and `request_unlock` to unlock one once its prerequisite session reaches 100%.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listMyCourses, listSessions, getMyProgress, listRecentExams, listLockedSections, requestUnlock],
});
