import { Link } from 'react-router-dom'

function AppHomePage() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">DevControl - Fase 2</h2>
      <p className="mt-3 text-sm text-slate-600">
        Modulos de clientes, tags e projetos habilitados com Supabase + RLS.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/app/clients"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Abrir Clientes
        </Link>
        <Link
          to="/app/projects"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Abrir Projetos
        </Link>
        <Link
          to="/app/tags"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
        >
          Abrir Tags
        </Link>
      </div>

      <p className="mt-4 text-sm text-slate-600">TODO: dark/light mode em fase futura.</p>
    </section>
  )
}

export default AppHomePage
