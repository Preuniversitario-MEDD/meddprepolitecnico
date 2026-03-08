import { createContext, useContext } from 'react';

interface ViewAsStudentContextType {
  viewAsStudentId: string | null;
}

export const ViewAsStudentContext = createContext<ViewAsStudentContextType>({ viewAsStudentId: null });

export function useViewAsStudent() {
  return useContext(ViewAsStudentContext);
}
