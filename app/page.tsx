import React from 'react';

// Note: In a real Next.js app, you would import Link from "next/link"
// and replace the <a> tags below with <Link> for faster client-side navigation.
// import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500 selection:text-black">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="text-2xl font-bold tracking-tighter text-white">
            THE <span className="text-amber-500">GOGFATHER</span>
          </div>
          <div className="space-x-6 hidden md:block text-sm font-medium">
            <a href="#services" className="hover:text-amber-500 transition-colors">Services</a>
            <a href="#blueprint" className="hover:text-amber-500 transition-colors">The Blueprint</a>
            <a href="#shop" className="hover:text-amber-500 transition-colors">Shop</a>
          </div>
          <button className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-full transition-all">
            Join the Family
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center px-4 pt-20 pb-10 md:pt-32 md:pb-20">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl">
          An Offer You Can't <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-700">
            Refuse.
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl">
          Premium services. Exclusive knowledge. We don't just build empires; 
          we teach you how to build your own.
        </p>
        
        <div className="mt-10 flex flex-col md:flex-row gap-4">
          <a href="#blueprint" className="px-8 py-4 bg-white text-black font-bold rounded text-lg hover:bg-slate-200 transition-all">
            Get the Blueprint
          </a>
          <button className="px-8 py-4 border border-slate-700 hover:border-amber-500 hover:text-amber-500 text-slate-300 font-bold rounded text-lg transition-all">
            View Services
          </button>
        </div>
      </main>

      {/* Services / Features Grid */}
      <section id="services" className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-white mb-12 text-center">Our Operations</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                { title: "Web Development", desc: "Modern, fast, and secure websites built on Next.js." },
                { title: "Brand Strategy", desc: "Defining your identity in a crowded digital underworld." },
                { title: "Consulting", desc: "Advice you can trust. Or else." }
                ].map((item, i) => (
                <div key={i} className="p-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors group">
                    <div className="h-12 w-12 bg-slate-800 rounded-lg mb-4 group-hover:bg-amber-500 transition-colors flex items-center justify-center text-xl font-bold text-slate-400 group-hover:text-black">
                        {i + 1}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400">
                    {item.desc}
                    </p>
                </div>
                ))}
            </div>
        </div>
      </section>

      {/* THE BLUEPRINT (How-Tos Section) */}
      <section id="blueprint" className="py-24 max-w-5xl mx-auto px-6">
        <div className="mb-16 text-center">
            <span className="text-amber-500 font-bold tracking-widest uppercase text-sm">The Knowledge</span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mt-2">How We Built This</h2>
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
                We don't gatekeep. Here is the exact recipe used to build, host, and deploy this platform 
                for free (until you start making money).
            </p>
        </div>

        <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row gap-8 border-b border-slate-800 pb-12">
                <div className="md:w-1/3">
                    <div className="text-amber-500 text-lg font-bold mb-2">Step 01</div>
                    <h3 className="text-2xl font-bold text-white">The Foundation</h3>
                    <p className="text-slate-400 mt-2">Setting up the modern tech stack using Next.js and Tailwind CSS.</p>
                </div>
                <div className="md:w-2/3 bg-slate-900 p-6 rounded-lg border border-slate-800 font-mono text-sm overflow-x-auto">
                    <p className="text-slate-500 mb-2"># Run this in your terminal</p>
                    <p className="text-green-400">npx create-next-app@latest the-gogfather-web</p>
                    <div className="mt-4 text-slate-300 space-y-1">
                        <p>TypeScript? <span className="text-amber-500">Yes</span></p>
                        <p>Tailwind CSS? <span className="text-amber-500">Yes</span></p>
                        <p>App Router? <span className="text-amber-500">Yes</span></p>
                    </div>
                </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row gap-8 border-b border-slate-800 pb-12">
                <div className="md:w-1/3">
                    <div className="text-amber-500 text-lg font-bold mb-2">Step 02</div>
                    <h3 className="text-2xl font-bold text-white">The Warehouse</h3>
                    <p className="text-slate-400 mt-2">Pushing your code to GitHub so it's safe and ready for deployment.</p>
                </div>
                <div className="md:w-2/3 bg-slate-900 p-6 rounded-lg border border-slate-800 font-mono text-sm overflow-x-auto">
                    <p className="text-slate-500 mb-2"># Initialize and push</p>
                    <p className="text-blue-400">git init</p>
                    <p className="text-blue-400">git add .</p>
                    <p className="text-blue-400">git commit -m "Initial commit"</p>
                    <p className="text-blue-400">git remote add origin https://github.com/USER/REPO.git</p>
                    <p className="text-blue-400">git push -u origin main</p>
                </div>
            </div>

             {/* Step 3 */}
             <div className="flex flex-col md:flex-row gap-8 border-b border-slate-800 pb-12">
                <div className="md:w-1/3">
                    <div className="text-amber-500 text-lg font-bold mb-2">Step 03</div>
                    <h3 className="text-2xl font-bold text-white">The Launch</h3>
                    <p className="text-slate-400 mt-2">Deploying to Vercel. It's free for hobby projects and integrates perfectly with Next.js.</p>
                </div>
                <div className="md:w-2/3 space-y-4">
                    <div className="bg-slate-900 p-4 rounded border border-slate-800">
                        <span className="text-white font-bold">1.</span> Log in to <span className="text-white underline">Vercel.com</span>
                    </div>
                    <div className="bg-slate-900 p-4 rounded border border-slate-800">
                        <span className="text-white font-bold">2.</span> Click <span className="text-amber-500">Add New Project</span> and select your GitHub Repo.
                    </div>
                    <div className="bg-slate-900 p-4 rounded border border-slate-800">
                        <span className="text-white font-bold">3.</span> Hit <span className="text-green-500">Deploy</span>. (No config needed).
                    </div>
                </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3">
                    <div className="text-amber-500 text-lg font-bold mb-2">Step 04</div>
                    <h3 className="text-2xl font-bold text-white">The Turf (Domain)</h3>
                    <p className="text-slate-400 mt-2">Connecting an AWS domain to Vercel without paying AWS hosting fees.</p>
                </div>
                <div className="md:w-2/3 bg-slate-900 p-6 rounded-lg border border-slate-800 text-sm">
                    <h4 className="text-white font-bold mb-2 border-b border-slate-700 pb-2">1. In Vercel Dashboard</h4>
                    <p className="text-slate-400 mb-4">Settings &rarr; Domains &rarr; Add `yourdomain.com`. Copy the 2 Nameservers provided.</p>
                    
                    <h4 className="text-white font-bold mb-2 border-b border-slate-700 pb-2">2. In AWS Route 53</h4>
                    <p className="text-slate-400 mb-2">Registered Domains &rarr; Click Domain &rarr; <span className="text-amber-500">Edit Name Servers</span>.</p>
                    <p className="text-slate-300 italic">
                        Warning: Do not create a Hosted Zone. Only edit the "Registered Domain" settings to avoid the $0.50/mo fee.
                    </p>
                </div>
            </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-10 text-center text-slate-600 text-sm">
        <div className="mb-4">
            <span className="font-bold text-slate-500">The Gogfather</span> &bull; Est. {new Date().getFullYear()}
        </div>
        <p>&copy; All rights reserved. It's strictly business.</p>
      </footer>
    </div>
  );
}