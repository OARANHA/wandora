import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  Home,
  MessageCircleMore,
  UsersRound,
} from 'lucide-react';

const nav = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/team', label: 'Equipe', icon: UsersRound },
  { to: '/work', label: 'Trabalho', icon: BriefcaseBusiness },
  { to: '/conversations', label: 'Conversas', icon: MessageCircleMore },
  { to: '/approvals', label: 'Aprovações', icon: CheckCircle2 },
  { to: '/company', label: 'Empresa', icon: Building2 },
] as const;

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="grid size-10 place-items-center rounded-2xl bg-white text-sm font-black text-slate-900 shadow-sm">
        W
      </div>
      <div>
        <div className="text-[15px] font-semibold tracking-tight text-white">Wandora</div>
        <div className="text-xs text-slate-400">Sua empresa, em movimento</div>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[270px] flex-col border-r border-white/5 bg-[#111827] px-5 py-6 lg:flex">
      <Brand />
      <nav className="mt-9 flex flex-1 flex-col gap-1.5">
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === '/' }}
            className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white [&.active]:bg-white/10 [&.active]:text-white"
          >
            <Icon className="size-[18px]" strokeWidth={1.9} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
          <span className="size-2 rounded-full bg-emerald-400" /> Empresa ativa
        </div>
        <p className="m-0 text-xs leading-5 text-slate-500">
          Seus funcionários digitais estão operando dentro das regras da empresa.
        </p>
      </div>
    </aside>
  );
}

function Topbar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const current = nav.find((item) => item.to === pathname)?.label ?? 'Wandora';

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-[#f5f7fb]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between px-5 sm:px-7 lg:px-9">
        <div>
          <p className="m-0 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Acme Comércio</p>
          <h1 className="m-0 mt-1 text-lg font-semibold tracking-tight text-slate-900">{current}</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900" aria-label="Notificações">
            <Bell className="size-[18px]" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-indigo-500 ring-2 ring-white" />
          </button>
          <button className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 pr-3 text-left shadow-sm">
            <span className="grid size-7 place-items-center rounded-lg bg-slate-900 text-xs font-semibold text-white">GE</span>
            <span className="hidden text-sm font-medium text-slate-700 sm:block">Gestor</span>
            <ChevronDown className="size-4 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-2xl border border-slate-200 bg-white/95 px-2 py-2 shadow-[0_16px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl lg:hidden">
      {nav.slice(0, 5).map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === '/' }}
          className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-[9px] font-medium text-slate-400 [&.active]:bg-slate-100 [&.active]:text-slate-900"
        >
          <Icon className="size-[18px]" strokeWidth={1.9} />
          <span className="w-full truncate text-center">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function AppShell() {
  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <Sidebar />
      <div className="min-h-screen lg:pl-[270px]">
        <Topbar />
        <main className="mx-auto max-w-[1500px] px-5 pb-28 pt-7 sm:px-7 lg:px-9 lg:pb-12">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
