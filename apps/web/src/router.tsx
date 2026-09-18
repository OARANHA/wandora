import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { SessionGate } from './components/SessionGate';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { CompanyPage } from './pages/CompanyPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { InviteAcceptancePage } from './pages/InviteAcceptancePage';
import { RecoveryAccessPage } from './pages/RecoveryAccessPage';
import { TeamPage } from './pages/TeamPage';
import { WorkPage } from './pages/WorkPage';
import { StartPage } from './pages/StartPage';

const rootRoute = createRootRoute({ component: Outlet });

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: SessionGate,
});

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: DashboardPage,
});

const teamRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/team',
  component: TeamPage,
});

const workRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/work',
  component: WorkPage,
});

const conversationsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/conversations',
  component: ConversationsPage,
});

const approvalsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/approvals',
  component: ApprovalsPage,
});

const companyRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/company',
  component: CompanyPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});


const inviteAcceptanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accept-invite',
  component: InviteAcceptancePage,
});

const recoveryAccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recover-access',
  component: RecoveryAccessPage,
});

const startRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/start',
  component: StartPage,
});

const routeTree = rootRoute.addChildren([
  appRoute.addChildren([
    indexRoute,
    teamRoute,
    workRoute,
    conversationsRoute,
    approvalsRoute,
    companyRoute,
    startRoute,
  ]),
  loginRoute,
  inviteAcceptanceRoute,
  recoveryAccessRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
