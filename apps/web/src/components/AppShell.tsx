import { useEffect, useState } from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  Home,
  Menu,
  MessageCircleMore,
  PanelLeftClose,
  PanelLeftOpen,
  Power,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { WorkCompletionNotifier } from './WorkCompletionNotifier';

const nav = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/team', label: 'Equipe', icon: UsersRound },
  { to: '/work', label: 'Trabalho', icon: BriefcaseBusiness },
  { to: '/conversations', label: 'Conversas', icon: MessageCircleMore },
  { to: '/approvals', label: 'Aprovações', icon: CheckCircle2 },
  { to: '/company', label: 'Empresa', icon: Building2 },
] as const;

const SIDEBAR_COLLAPSED_KEY = 'wandora.ui.sidebar-collapsed';

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'W';
}

function readSidebarPreference(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center ${compact ? 'justify-center' : 'gap-3'}`}>
      <div className="wandora-display grid size-10 shrink-0 place-items-center rounded-xl border-[2.5px] border-[#09090b] bg-[#d2e823] text-[15px] text-[#09090b] wandora-pop-sm">
        W
      </div>
      {!compact ? (
        <div className="wandora-display truncate text-[17px] leading-none text-[#09090b]">
          WANDORA
        </div>
      ) : null}
    </div>
  );
}

function DesktopSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { context, activeOrganization, selectOrganization, signOut } = useAuth();
  const organizations = context?.organizations ?? [];
  const userName = context?.user.name ?? 'Usuário';

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r-[2.5px] border-[#09090b] bg-white transition-[width] duration-200 ease-out lg:flex ${collapsed ? 'w-[82px]' : 'w-[250px]'}`}
      aria-label="Navegação principal"
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <div className={collapsed ? 'px-3 pb-3 pt-5' : 'px-4 pb-4 pt-5'}>
        <Brand compact={collapsed} />

        {!collapsed ? (
          <div className="mt-5 rounded-2xl border-2 border-[#09090b]/15 bg-[#f8f4e8] p-3">
            {organizations.length > 1 ? (
              <label className="block">
                <span className="wandora-mono block text-[9px] text-[#09090b]/45">empresa ativa</span>
                <div className="relative mt-1">
                  <select
                    aria-label="Empresa ativa"
                    value={activeOrganization?.id ?? ''}
                    onChange={(event) => selectOrganization(event.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border-2 border-[#09090b] bg-white px-3 pr-8 text-sm font-bold text-[#09090b] outline-none"
                  >
                    <option value="" disabled>Escolha uma empresa</option>
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-3 size-4" />
                </div>
              </label>
            ) : (
              <>
                <div className="wandora-mono text-[9px] text-[#09090b]/45">empresa ativa</div>
                <div className="mt-1 truncate text-sm font-black text-[#09090b]">
                  {activeOrganization?.name ?? 'Nenhuma empresa selecionada'}
                </div>
              </>
            )}
            <div className="mt-1 truncate text-[11px] text-[#09090b]/55">{userName}</div>
          </div>
        ) : (
          <div
            className="mt-5 grid size-12 place-items-center self-center rounded-2xl border-2 border-[#09090b]/15 bg-[#f8f4e8] text-xs font-black"
            title={activeOrganization?.name ?? 'Nenhuma empresa selecionada'}
            aria-label={activeOrganization?.name ?? 'Nenhuma empresa selecionada'}
          >
            {initials(activeOrganization?.name ?? 'Wandora')}
          </div>
        )}
      </div>

      <div className={collapsed ? 'px-3' : 'px-4'}>
        {!collapsed ? <div className="wandora-mono px-2 text-[9px] text-[#09090b]/35">painel</div> : null}
        <nav className="mt-2 flex flex-col gap-1.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === '/' }}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              className={`flex items-center rounded-xl border-2 border-transparent py-2.5 text-sm font-bold text-[#09090b]/45 transition hover:bg-[#f8f4e8] hover:text-[#09090b] [&.active]:border-[#09090b]/15 [&.active]:bg-[#f1f8c9] [&.active]:text-[#09090b] ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={1.9} />
              {!collapsed ? <span>{label}</span> : null}
            </Link>
          ))}
        </nav>
      </div>

      <div className={`mt-auto ${collapsed ? 'p-3' : 'p-4'}`}>
        {!collapsed ? (
          <div className="rounded-2xl bg-[#09090b] p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="wandora-mono text-[9px] text-white/55">equipe no ar</div>
              <span className="wandora-live-dot size-2 rounded-full bg-[#46c46a]" />
            </div>
            <div className="mt-3 truncate text-sm font-black">{activeOrganization?.name ?? 'Wandora'}</div>
            <p className="m-0 mt-1 text-xs leading-5 text-white/55">
              Estado autorizado da empresa selecionada.
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="wandora-live-dot size-2.5 rounded-full bg-[#46c46a]" title="Equipe no ar" />
          </div>
        )}

        <div className={`mt-3 grid gap-2 ${collapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <button
            type="button"
            onClick={onToggle}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-[#09090b] bg-white text-[#09090b] wandora-pop-sm wandora-press"
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
            {!collapsed ? <span className="wandora-mono text-[9px]">recolher</span> : null}
          </button>

          <button
            type="button"
            onClick={() => void signOut()}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#09090b] text-white wandora-pop-sm wandora-press"
            aria-label="Sair do sistema"
            title="Sair do sistema"
          >
            <Power className="size-[18px]" />
            {!collapsed ? <span className="wandora-mono text-[9px]">sair</span> : null}
          </button>
        </div>
      </div>

      <div className={`flex h-7 items-center border-t-2 border-[#09090b] bg-[#d2e823] px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed ? <span className="wandora-mono text-[8px] text-[#09090b]">sua empresa</span> : null}
        <span className="text-xs font-black">✦</span>
        {!collapsed ? <span className="wandora-mono text-[8px] text-[#09090b]">sua equipe</span> : null}
      </div>
    </aside>
  );
}

function MobileHeader() {
  const { context, activeOrganization, selectOrganization, signOut } = useAuth();
  const organizations = context?.organizations ?? [];
  const userName = context?.user.name ?? 'Usuário';

  return (
    <header className="sticky top-0 z-20 border-b-2 border-[#09090b] bg-white px-4 py-3 lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <Brand />
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl border-2 border-[#09090b] bg-[#f8f4e8] text-xs font-black">
            {initials(userName)}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="grid size-9 place-items-center rounded-xl border-2 border-[#09090b] bg-[#09090b] text-white"
            aria-label="Sair do sistema"
            title="Sair do sistema"
          >
            <Power className="size-4" />
          </button>
        </div>
      </div>
      {organizations.length > 1 ? (
        <select
          aria-label="Empresa ativa"
          value={activeOrganization?.id ?? ''}
          onChange={(event) => selectOrganization(event.target.value)}
          className="mt-3 h-10 w-full rounded-xl border-2 border-[#09090b] bg-[#f8f4e8] px-3 text-sm font-bold"
        >
          <option value="" disabled>Escolha uma empresa</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>{organization.name}</option>
          ))}
        </select>
      ) : null}
    </header>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open ? (
        <div className="fixed inset-x-3 bottom-[78px] z-40 rounded-2xl border-2 border-[#09090b] bg-white p-2 wandora-pop lg:hidden">
          <div className="grid grid-cols-3 gap-1.5">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === '/' }}
                onClick={() => setOpen(false)}
                className="flex min-w-0 flex-col items-center gap-1 rounded-xl border-2 border-transparent px-2 py-2.5 text-[10px] font-bold text-[#09090b]/50 [&.active]:border-[#09090b]/15 [&.active]:bg-[#d2e823] [&.active]:text-[#09090b]"
              >
                <Icon className="size-[18px]" strokeWidth={2} />
                <span className="w-full truncate text-center">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-[1fr_auto] items-center gap-2 rounded-2xl border-2 border-[#09090b] bg-white p-1.5 wandora-pop lg:hidden">
        <div className="grid grid-cols-4">
          {nav.slice(0, 4).map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === '/' }}
              className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px] font-bold text-[#09090b]/45 [&.active]:bg-[#d2e823] [&.active]:text-[#09090b]"
            >
              <Icon className="size-[17px]" strokeWidth={2} />
              <span className="w-full truncate text-center">{label}</span>
            </Link>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={`grid size-11 place-items-center rounded-xl border-2 border-[#09090b] ${open ? 'bg-[#d2e823]' : 'bg-[#f8f4e8]'}`}
          aria-expanded={open}
          aria-label={open ? 'Fechar menu' : 'Abrir menu completo'}
        >
          <Menu className="size-5" />
        </button>
      </nav>
    </>
  );
}

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarPreference);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    } catch {
      // Layout preference is optional; product behavior must not depend on browser storage.
    }
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-screen bg-[#f8f4e8] text-[#09090b]">
      <DesktopSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />
      <div className={`min-h-screen transition-[padding] duration-200 ease-out ${sidebarCollapsed ? 'lg:pl-[82px]' : 'lg:pl-[250px]'}`}>
        <MobileHeader />
        <main className="mx-auto max-w-[1480px] px-4 pb-28 pt-6 sm:px-7 lg:px-10 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>
      </div>
      <WorkCompletionNotifier />
      <MobileNav />
    </div>
  );
}