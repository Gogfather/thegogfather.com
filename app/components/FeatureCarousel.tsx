'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { featureCards } from '../content/featureCards';

export default function FeatureCarousel() {
  const [selectedSlug, setSelectedSlug] = useState(featureCards[0]?.slug ?? 'the-front');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'eyebrow'>('title');
  const [filterTag, setFilterTag] = useState('all');
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showLeftControl, setShowLeftControl] = useState(false);
  const [showRightControl, setShowRightControl] = useState(false);
  const hoverScrollIntervalRef = useRef<number | null>(null);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startOffset: number } | null>(null);
  const justDraggedRef = useRef(false);

  const selectedItem = useMemo(
    () => featureCards.find((card) => card.slug === selectedSlug) ?? featureCards[0],
    [selectedSlug],
  );

  const allTags = useMemo(
    () => Array.from(new Set(featureCards.flatMap((card) => card.tags))).sort(),
    [],
  );

  const filteredCards = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = featureCards.filter((card) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [card.title, card.eyebrow, card.description, card.summary, ...card.tags]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesFilter = filterTag === 'all' || card.tags.includes(filterTag);

      return matchesSearch && matchesFilter;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'eyebrow') {
        return a.eyebrow.localeCompare(b.eyebrow);
      }
      return a.title.localeCompare(b.title);
    });
  }, [filterTag, searchTerm, sortBy]);

  const visibleCards = useMemo(() => {
    if (!filteredCards.length) {
      return [];
    }

    const selectedExists = filteredCards.some((card) => card.slug === selectedSlug);
    if (!selectedExists && filteredCards[0]) {
      setSelectedSlug(filteredCards[0].slug);
    }

    return filteredCards;
  }, [filteredCards, selectedSlug]);

  const getMaxScroll = () => Math.max(0, (visibleCards.length - 4) * 220);

  const handleScroll = (direction: 'left' | 'right') => {
    const delta = direction === 'left' ? -220 : 220;
    const maxScroll = getMaxScroll();

    setScrollOffset((current) => {
      const nextOffset = current + delta;
      if (direction === 'left') {
        return Math.max(0, nextOffset);
      }

      return Math.min(maxScroll, nextOffset);
    });
  };

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startOffset: scrollOffset,
    };
    justDraggedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const delta = dragState.startX - event.clientX;
    if (Math.abs(delta) > 5) {
      justDraggedRef.current = true;
    }

    const maxScroll = getMaxScroll();
    const nextOffset = Math.min(maxScroll, Math.max(0, dragState.startOffset + delta));
    setScrollOffset(nextOffset);
  };

  const handleDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragStateRef.current = null;
  };

  const handleCardClick = (slug: string) => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    setSelectedSlug(slug);
  };

  const clearHoverScroll = () => {
    if (hoverScrollIntervalRef.current !== null) {
      window.clearInterval(hoverScrollIntervalRef.current);
      hoverScrollIntervalRef.current = null;
    }
  };

  const startHoverScroll = (direction: 'left' | 'right') => {
    clearHoverScroll();
    hoverScrollIntervalRef.current = window.setInterval(() => {
      handleScroll(direction);
    }, 80);
  };

  useEffect(() => {
    return () => {
      clearHoverScroll();
    };
  }, []);

  if (!selectedItem) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_40%),linear-gradient(135deg,_#020617_0%,_#0f172a_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8 lg:py-8">
        <aside className="flex w-full flex-col justify-between rounded-[2rem] border border-white/10 bg-black/55 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl lg:w-[380px] lg:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-500">
              {selectedItem.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {selectedItem.title}
            </h1>
            <p className="mt-5 text-base leading-7 text-neutral-300">
              {selectedItem.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {selectedItem.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-amber-300">
                Now showing
              </p>
              <p className="mt-2 text-lg font-medium text-white">{selectedItem.summary}</p>
            </div>
            <Link
              href={`/${selectedItem.slug}`}
              className="inline-flex items-center justify-center rounded-full border border-amber-500/70 bg-amber-500 px-5 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-amber-400"
            >
              {selectedItem.ctaLabel}
            </Link>
          </div>
        </aside>

        <section className="flex-1 rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-500">
                Featured lanes
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                A Netflix-style front door for the whole site
              </h2>
            </div>
            <p className="text-sm text-neutral-400">
              Select a card to reveal its details and open the matching subpage.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                <label className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-neutral-300">
                  <span className="sr-only">Search lanes</span>
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search lanes"
                    className="w-full bg-transparent outline-none"
                  />
                </label>
                <label className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-neutral-300">
                  <span className="sr-only">Sort lanes</span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as 'title' | 'eyebrow')}
                    className="bg-transparent outline-none"
                  >
                    <option value="title" className="text-black">Sort by title</option>
                    <option value="eyebrow" className="text-black">Sort by eyebrow</option>
                  </select>
                </label>
                <label className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-neutral-300">
                  <span className="sr-only">Filter lanes</span>
                  <select
                    value={filterTag}
                    onChange={(event) => setFilterTag(event.target.value)}
                    className="bg-transparent outline-none"
                  >
                    <option value="all" className="text-black">All tags</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag} className="text-black">
                        {tag}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div
              className="relative touch-pan-y select-none overflow-hidden pb-2 active:cursor-grabbing"
              onMouseEnter={() => {
                setShowLeftControl(true);
                setShowRightControl(true);
              }}
              onMouseLeave={() => {
                setShowLeftControl(false);
                setShowRightControl(false);
              }}
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
            >
              <button
                type="button"
                onMouseEnter={() => startHoverScroll('left')}
                onMouseLeave={clearHoverScroll}
                className={`absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-lg font-semibold text-white/80 backdrop-blur-sm transition-all duration-200 ${
                  showLeftControl ? 'opacity-100' : 'pointer-events-none opacity-0'
                } hover:border-white/30 hover:bg-white/20 hover:text-white`}
              >
                ←
              </button>
              <button
                type="button"
                onMouseEnter={() => startHoverScroll('right')}
                onMouseLeave={clearHoverScroll}
                className={`absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-lg font-semibold text-white/80 backdrop-blur-sm transition-all duration-200 ${
                  showRightControl ? 'opacity-100' : 'pointer-events-none opacity-0'
                } hover:border-white/30 hover:bg-white/20 hover:text-white`}
              >
                →
              </button>
              <div className="flex gap-4" style={{ transform: `translateX(-${scrollOffset}px)` }}>
                {visibleCards.map((card) => {
                  const isActive = card.slug === selectedItem.slug;
                  return (
                    <button
                      key={card.slug}
                      type="button"
                      onClick={() => handleCardClick(card.slug)}
                      className={`group min-w-[180px] max-w-[220px] flex-1 overflow-hidden rounded-[1.35rem] border text-left transition ${
                        isActive
                          ? 'border-amber-500/70 shadow-lg shadow-amber-500/10'
                          : 'border-white/10 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="aspect-[3/4] overflow-hidden bg-neutral-900">
                        <img
                          src={card.image}
                          alt={card.title}
                          draggable={false}
                          className={`h-full w-full object-cover transition duration-500 ${
                            isActive ? 'scale-105' : 'group-hover:scale-105'
                          }`}
                        />
                      </div>
                      <div className="bg-neutral-950/90 p-4">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                          {card.eyebrow}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{card.title}</h3>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
