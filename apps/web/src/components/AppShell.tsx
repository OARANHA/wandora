import { Link, Outlet } from '@tanstack/react-router';
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  Home,
  LogOut,
  MessageCircleMore,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../AuthProvider';

const nav = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/team', label: 'Equipe', icon: UsersRound },
  { to: '/work', label: 'Trabalho', icon: BriefcaseBusiness },
  { to: '/conversations', label: 'Conversas', icon: MessageCircleMore },
  { to: '/approvals', label: 'Aprovações', icon: CheckCircle2 },
  { to: '/company', label: 'Empresa', icon: Building2 },
] as const;

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'W';
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-xl border-[2.5px] border-[#09090b] bg-[#d2e823] text-base font-black text-[#09090b] wandora-pop-sm">
        W
      </div>
      <div className="text-lg font-black tracking-[-0.04em] text-[#09090b]">WANDORA</div>
    </div>
  );
}

function DesktopSidebar() {
  const { context, activeOrganization, selectOrganization, signOut } = useAuth();
  const organizations = context?.organizations ?? [];
  const userName = context?.user.name ?? 'Usuário';

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col border-r-[2.5px] border-[#09090b] bg-white lg:flex">
      <div className="px-4 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <button
            onClick={() => void signOut()}
            className="grid size-9 place-items-center rounded-xl border-2 border-[#09090b] bg-white text-[#09090b] wandora-pop-sm wandora-press"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border-2 border-[#09090b]/15 bg-[#f8f4e8] p-3">
          {organizations.length > 1 ? (
            <label className="block">
              <span className="wandora-mono block text-[9px] font-bold text-[#09090b]/45">empresa ativa</span>
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
              <div className="wandora-mono text-[9px] font-bold text-[#09090b]/45">empresa ativa</div>
              <div className="mt-1 truncate text-sm font-black text-[#09090b]">
                {activeOrganization?.name ?? 'Nenhuma empresa selecionada'}
              </div>
            </>
          )}
          <div className="mt-1 text-[11px] text-[#09090b]/55">{userName}</div>
        </div>
      </div>

      <div className="px-4">
        <div className="wandora-mono px-2 text-[9px] font-bold text-[#09090b]/35">painel</div>
        <nav className="mt-2 flex flex-col gap-1.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === '/' }}
              className="flex items-center gap-3 rounded-xl border-2 border-transparent px-3 py-2.5 text-sm font-bold text-[#09090b]/38 transition hover:bg-[#f8f4e8] hover:text-[#09090b] [&.active]:border-[#09090b]/15 [&.active]:bg-[#f1f8c9] [&.active]:text-[#09090b]"
            >
              <Icon className="size-[17px]" strokeWidth={1.9} />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4">
        <div className="rounded-2xl bg-[#09090b] p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="wandora-mono text-[9px] font-bold text-white/55">contexto ativo</div>
            <span className="wandora-live-dot size-2 rounded-full bg-[#46c46a]" />
          </div>
          <div className="mt-3 text-sm font-black">{activeOrganization?.name ?? 'Wandora'}</div>
          <p className="m-0 mt-1 text-xs leading-5 text-white/55">
            A interface usa somente o estado autorizado da empresa selecionada.
          </p>
        </div>
      </div>

      <div className="flex h-7 items-center justify-between border-t-2 border-[#09090b] bg-[#d2e823] px-3">
        <span className="wandora-mono text-[8px] font-black text-[#09090b]">sua empresa</span>
        <span className="text-xs font-black">✦</span>
        <span className="wandora-mono text-[8px] font-black text-[#09090b]">sua equipe</span>
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
          <button onClick={() => void signOut()} className="grid size-9 place-items-center rounded-xl border-2 border-[#09090b] bg-white" aria-label="Sair">
            <LogOut className="size-4" />
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
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border-2 border-[#09090b] bg-white p-1.5 wandora-pop lg:hidden">
      {nav.slice(0, 5).map(({ to, label, icon: Icon }) => (
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
    </nav>
  );
}

export function AppShell() {
  return (
    <div className="min-h-screen bg-[#f8f4e8] text-[#09090b]">
      <DesktopSidebar />
      <div className="min-h-screen lg:pl-[250px]">
        <MobileHeader />
        <main className="mx-auto max-w-[1480px] px-4 pb-28 pt-6 sm:px-7 lg:px-10 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
