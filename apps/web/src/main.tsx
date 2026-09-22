[Reading 36 lines from start (total: 36 lines, 0 remaining)]

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { AuthProvider } from './AuthProvider';
import { router } from './router';
import { stageInviteRedirectFromCurrentLocation } from './inviteAcceptance';
import { stageRecoveryRedirectFromCurrentLocation } from './recoveryAccess';
import '@fontsource/dela-gothic-one/latin-400.css';
import '@fontsource/dela-gothic-one/latin-ext-400.css';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

stageInviteRedirectFromCurrentLocation();
stageRecoveryRedirectFromCurrentLocation();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);