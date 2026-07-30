'use client';

import { useEffect, useRef, useState } from 'react';

const values = [
  { n: '01', title: 'Family-Rooted Integrity', desc: "Built on trust and genuine care. Every decision reflects what's right." },
  { n: '02', title: 'Entrepreneurial Empathy', desc: "We've lived the founder journey and guide as we wish we'd been guided." },
  { n: '03', title: 'End-to-End Reliability', desc: 'One-stop support. No confusion, no stress — just dependable execution.' },
  { n: '04', title: 'Vision of Next Move', desc: 'A lifelong partnership that grows with every stage of your success.' },
];

export default function Values() {
  const ref = useRef<HTMLUListElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setShown(true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden bg-ink py-24 text-ink-foreground" aria-labelledby="values-heading">
      <div className="float-slow pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-sand/10 blur-3xl" />

      <div className="mx-auto max-w-6xl px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Our values</p>
        <h2 id="values-heading" className="mt-3 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
          We listen, think independently, advise &amp; <em className="not-italic text-primary">take action</em>.
        </h2>

        <ul ref={ref} className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <li
              key={v.n}
              style={{ animationDelay: `${i * 120}ms` }}
              className={`glass-dark group relative overflow-hidden rounded-3xl p-6 transition duration-500 hover:-translate-y-2 ${shown ? 'rise-in' : 'opacity-0'}`}
            >
              <span className="pointer-events-none absolute -right-6 -top-8 font-display text-7xl font-bold text-white/5 transition duration-500 group-hover:text-primary/25">
                {v.n}
              </span>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/25 text-primary">
                <span className="text-lg">✦</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-foreground/70">{v.desc}</p>
              <span className="mt-6 block h-px w-full origin-left scale-x-0 bg-linear-to-r from-primary to-transparent transition-transform duration-500 group-hover:scale-x-100" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
