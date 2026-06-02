export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm">Cargando...</p>
      </div>
    </div>
  );
}
