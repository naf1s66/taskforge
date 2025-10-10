'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';

const columns = [
  { title: 'Todo', description: 'Capture ideas and tasks as they arise.' },
  { title: 'In Progress', description: 'Stay focused with a clear work-in-progress limit.' },
  { title: 'Done', description: 'Celebrate progress and ship consistently.' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <section className="grid gap-6 md:grid-cols-[2fr,1fr] md:items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3 w-3" /> Dashboard
          </span>
          <h2 className="text-4xl font-semibold leading-tight">Welcome to your TaskForge workspace</h2>
          <p className="text-lg text-muted-foreground">
            Tailwind, shadcn/ui, and Framer Motion are wired up so we can focus on building TaskForge without rethinking our design system on every page.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button>
              Review checklist
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost">View docs</Button>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="rounded-2xl border border-border/80 bg-card/40 p-6 shadow-lg shadow-black/20 backdrop-blur"
        >
          <p className="text-sm text-muted-foreground">
            Shared tokens, responsive primitives, and expressive motion are ready across the stack. Import `@taskforge/shared` once it exposes fully typed DTOs.
          </p>
        </motion.div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {columns.map((column, index) => (
          <motion.article
            key={column.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index, duration: 0.4 }}
            className="rounded-xl border border-border/70 bg-card/40 p-5 shadow-sm backdrop-blur"
          >
            <h3 className="text-lg font-semibold text-foreground/90">{column.title}</h3>
            <p className="text-sm text-muted-foreground">{column.description}</p>
          </motion.article>
        ))}
      </section>
    </div>
  );
}
