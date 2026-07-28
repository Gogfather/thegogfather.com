import Link from 'next/link';
import { notFound } from 'next/navigation';
import { featureCards } from '../content/featureCards';

interface SubpageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return featureCards.map((card) => ({ slug: card.slug }));
}

export default async function Subpage({ params }: SubpageProps) {
  const { slug } = await params;
  const card = featureCards.find((entry) => entry.slug === slug);

  if (!card) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_40%),linear-gradient(135deg,_#020617_0%,_#111827_100%)] text-white">
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link
          href="/"
          className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-amber-500/40 hover:text-white"
        >
          ← Back to the front door
        </Link>

        <header className="mt-10 rounded-[2rem] border border-white/10 bg-black/35 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-500">
            {card.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {card.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-neutral-300">
            {card.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-black/20">
            <h2 className="text-2xl font-semibold text-white">What this lane is about</h2>
            <p className="mt-4 text-base leading-8 text-neutral-300">{card.summary}</p>
            <div className="mt-8 space-y-5">
              {card.sections.map((section) => (
                <div key={section.heading} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-lg font-semibold text-white">{section.heading}</h3>
                  <p className="mt-2 text-sm leading-7 text-neutral-300">{section.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-xl shadow-black/20 backdrop-blur-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-500">
              Ready to keep going?
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">This route stays modular</h2>
            <p className="mt-4 text-sm leading-7 text-neutral-300">
              Add a new card in the shared content list and the homepage, subpage route, and content blocks follow automatically.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-full border border-amber-500/70 bg-amber-500 px-5 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-amber-400"
            >
              Return home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
