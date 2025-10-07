export default function Home() {
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-bold">Welcome to TaskForge</h1>
      <p className="text-neutral-300">Next.js starter (dark, classy). Add shadcn/ui and NextAuth next.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border border-neutral-800 rounded-lg p-4">TODO</div>
        <div className="border border-neutral-800 rounded-lg p-4">IN PROGRESS</div>
        <div className="border border-neutral-800 rounded-lg p-4">DONE</div>
      </div>
    </main>
  )
}
