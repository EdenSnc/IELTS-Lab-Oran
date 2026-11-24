import type { ReactNode } from 'react';

const drawings: Record<string, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1.4" /><rect x="14" y="3" width="7" height="7" rx="1.4" /><rect x="3" y="14" width="7" height="7" rx="1.4" /><rect x="14" y="14" width="7" height="7" rx="1.4" /></>,
  applications: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6m-6 4h6m-6 4h4" /></>,
  posters: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 5-4 3 3 3.5-4 4.5 5" /></>,
  operations: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18m-14 5h3" /></>,
  speaking: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-3 0h6" /></>,
  account: <><circle cx="12" cy="8" r="3" /><path d="M5 20c0-3.5 2.9-6 7-6s7 2.5 7 6" /></>,
};

export default function WorkspaceIcon({ name, className = 'size-5' }: { name: keyof typeof drawings; className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{drawings[name]}</svg>;
}
