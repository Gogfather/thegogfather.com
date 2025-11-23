import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500 selection:text-black">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="text-2xl font-bold tracking-tighter text-white">
          THE <span className="text-amber-500">GOGFATHER</span>
        </div>
        <div className="space-x-6 hidden md:block text-sm font-medium">
          <Link href="#" className="hover:text-amber-500 transition-colors">Services</Link>
          <Link href="#" className="hover:text-amber-500 transition-colors">Shop</Link>
          <Link href="#" className="hover:text-amber-500 transition-colors">About</Link>
        </div>
        <button className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-full transition-all">
          Join the Family
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center px-4 mt-20 md:mt-32">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl">
          An Offer You Can't <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-700">
            Refuse.
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl">
          Premium services. Exclusive goods. Join the inner circle of The Gogfather 
          and elevate your digital presence.
        </p>
        
        <div className="mt-10 flex flex-col md:flex-row gap-4">
          <button className="px-8 py-4 bg-white text-black font-bold rounded text-lg hover:bg-slate-200 transition-all">
            Explore Services
          </button>
          <button className="px-8 py-4 border border-slate-700 hover:border-amber-500 hover:text-amber-500 text-slate-300 font-bold rounded text-lg transition-all">
            View the Merch
          </button>
        </div>
      </main>

      {/* Feature Grid (Placeholder for future services) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-6 mt-32 mb-20">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors group">
            <div className="h-12 w-12 bg-slate-800 rounded-lg mb-4 group-hover:bg-amber-500 transition-colors"></div>
            <h3 className="text-xl font-bold text-white mb-2">Service {i}</h3>
            <p className="text-slate-400">
              Coming soon. High quality solutions tailored for the family.
            </p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-10 text-center text-slate-600 text-sm">
        &copy; {new Date().getFullYear()} The Gogfather. All rights reserved.
      </footer>
    </div>
  );
}