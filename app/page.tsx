'use client';
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';

// --- FONT LOADING ---
const FontStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap');
    .font-playfair {
      font-family: 'Playfair Display', serif;
    }
  `}} />
);

// --- Global Type Declarations ---
declare global {
    interface Window {
        __app_id?: string;
        __firebase_config?: string;
        __initial_auth_token?: string;
    }
    const __app_id: string;
    const __firebase_config: string;
    const __initial_auth_token: string;
}

// --- Interfaces ---
interface Photo {
    id: string;
    url: string;
    caption: string;
    isFeatured: boolean;
    timestamp: Timestamp;
    userId: string;
}

interface Video {
    id: string;
    videoId: string;
    title: string;
    timestamp: Timestamp;
}

interface MusicTrack {
    id: string;
    title: string;
    subtitle: string;
    link: string;
    albumArtUrl?: string;
    timestamp: Timestamp;
}

interface ArtPiece {
    id: string;
    title: string;
    imageUrl: string;
    description: string;
    timestamp: Timestamp;
}

interface BlogPost {
    id: string;
    title: string;
    excerpt: string;
    content: string;
    timestamp: Timestamp;
}

// --- Configuration and Initialization Logic ---

const getFirebaseConfig = () => {
    // HARDCODED FALLBACK: Use this if env vars are missing (e.g. in Canvas Preview)
    const HARDCODED_PROJECT_ID = "gogfatherweb";

    // 1. Check for Vercel/Next.js Environment Variables (Highest Priority)
    const externalConfig = {
        apiKey: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY : undefined,
        authDomain: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN : undefined,
        projectId: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID : undefined,
        appId: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_APP_ID : undefined,
    };
    
    // 2. Check for Canvas Globals (Second Priority for Preview)
    const isCanvasEnv = typeof __app_id !== 'undefined';
    
    if (isCanvasEnv) {
        try {
            const canvasConfig = JSON.parse(__firebase_config);
            const initialAuthToken = __initial_auth_token;
            
            // FIX: Use Vercel Env -> OR Hardcoded ID -> OR Canvas Session ID
            const vercelProjectId = externalConfig.projectId;
            const rawAppId = vercelProjectId || HARDCODED_PROJECT_ID || __app_id;
            const finalAppId = rawAppId.replace(/[^a-zA-Z0-9_-]/g, '-'); // Sanitize

            return { 
                firebaseConfig: canvasConfig, 
                initialAuthToken, 
                appId: finalAppId, 
                isCanvasEnv: true 
            };
        } catch (e) {
            // console.error("Canvas Global Configuration Error:", e);
        }
    }

    // 3. Use Vercel/Next.js Config 
    const hasExternalConfig = externalConfig.projectId && externalConfig.apiKey;
    if (hasExternalConfig) {
        return { 
            firebaseConfig: externalConfig, 
            initialAuthToken: undefined,
            appId: externalConfig.projectId, 
            isCanvasEnv: false
        };
    }

    // 4. Fallback 
    return { 
        firebaseConfig: {}, 
        initialAuthToken: undefined, 
        appId: HARDCODED_PROJECT_ID || 'default-app-id', 
        isCanvasEnv: false
    };
};

const groupPhotosByDate = (photos: Photo[]) => {
    const grouped: { [year: string]: { [month: string]: Photo[] } } = {};
    photos.forEach(photo => {
        if (!photo.timestamp || typeof photo.timestamp.toDate !== 'function') return;
        const date = photo.timestamp.toDate(); 
        const year = date.getFullYear().toString();
        const month = date.toLocaleString('en-US', { month: 'long' });
        if (!grouped[year]) grouped[year] = {};
        if (!grouped[year][month]) grouped[year][month] = [];
        grouped[year][month].push(photo);
    });
    return grouped;
};

// --- CUSTOM HOOK ---

const useFirebase = () => {
    const [db, setDb] = useState<any>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { firebaseConfig, initialAuthToken, appId } = getFirebaseConfig();

    useEffect(() => {
        if (!firebaseConfig.apiKey) {
            setError("ERROR: Firebase config missing. Check Vercel Environment Variables.");
            setAuthReady(true);
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const auth = getAuth(app);
            
            const initializeAuth = async () => {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (authError: any) {
                    console.warn("Auth Warning:", authError.code);
                }
            };

            initializeAuth();

            onAuthStateChanged(auth, (user) => {
                if (user) setUserId(user.uid);
                else setUserId(null); 
                setDb(firestoreDb);
                setAuthReady(true);
            });
        } catch (e: any) {
            setError(`Initialization error: ${e.message}`);
            setAuthReady(true);
        }
    }, [initialAuthToken, JSON.stringify(firebaseConfig)]);

    // FIX: Return firebaseConfig so it can be used in the component
    return { db, userId, authReady, error, setError, appId, firebaseConfig };
};

// --- MAIN APP COMPONENT ---

export default function Home() {
  // Destructure firebaseConfig here
  const { db, userId, authReady, error, setError, appId, firebaseConfig } = useFirebase();
  
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [music, setMusic] = useState<MusicTrack[]>([]);
  const [art, setArt] = useState<ArtPiece[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  
  const [featuredPhoto, setFeaturedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);

  // FIX: Define paths here so they are available for the diagnostic render below
  const photoPath = `artifacts/${appId}/public/data/photos`;
  const videoPath = `artifacts/${appId}/public/data/videos`;

  useEffect(() => {
    if (!db || !authReady) {
      if (!authReady) return; 
      if (!appId || appId === 'default-app-id' || (firebaseConfig && !firebaseConfig.apiKey)) {
         setError("App ID not configured. Check Vercel environment variables."); 
         setLoading(false);
         return;
      }
    }
    
    const subscribeToCollection = (colName: string, setState: Function) => {
        const q = query(collection(db, `artifacts/${appId}/public/data/${colName}`), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (snapshot) => {
            setState(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any })));
            setLoading(false);
        }, (err) => {
            console.error(`${colName} fetch error:`, err.code);
            // Only fail hard on photos, as that's the main content. Otherwise just log.
            if (colName === 'photos') setError(`Database permission denied. Update rules.`);
            setLoading(false);
        });
    };

    const unsubPhotos = subscribeToCollection('photos', (data: Photo[]) => {
        const featured = data.find(p => p.isFeatured) || null;
        setFeaturedPhoto(featured);
        setPhotos(data.filter(p => p.id !== (featured ? featured.id : null)));
    });
    
    const unsubVideos = subscribeToCollection('videos', setVideos);
    const unsubMusic = subscribeToCollection('music', setMusic);
    const unsubArt = subscribeToCollection('art', setArt);
    const unsubBlog = subscribeToCollection('blog', setBlogPosts);

    return () => {
        unsubPhotos();
        unsubVideos();
        unsubMusic();
        unsubArt();
        unsubBlog();
    };
  }, [db, authReady, appId, JSON.stringify(firebaseConfig)]); 

  const archivedPhotos = groupPhotosByDate(photos);

  const renderPhotoGrid = (photoList: Photo[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {photoList.map((photo) => (
            <div key={photo.id} className="aspect-square rounded-lg overflow-hidden shadow-xl shadow-black/50 hover:shadow-amber-600/40 transition-all duration-300 border border-slate-800 hover:border-amber-600/50 cursor-pointer grayscale hover:grayscale-0">
                <img 
                    src={photo.url} 
                    alt={photo.caption || 'Gogfather Photo'} 
                    className="w-full h-full object-cover transition duration-500 transform hover:scale-110"
                    onError={(e) => { e.currentTarget.src = `https://placehold.co/500x500/334155/eab308?text=Error`; }}
                />
            </div>
        ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-amber-600 selection:text-white">
      <FontStyles />
      <nav className="sticky top-0 z-50 bg-neutral-950/90 backdrop-blur-sm border-b border-neutral-800">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex flex-col items-start">
            <svg className="w-8 h-8 text-amber-600 mb-1 ml-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4"/><path d="m16 4-4 4-4-4"/><circle cx="12" cy="9" r="2"/><path d="M12 11v11"/><path d="M8 14h8"/><path d="M6 22h12"/>
            </svg>
            <div className={`text-2xl font-bold tracking-tight text-white font-playfair`}>
              The <span className="text-amber-600">Gogfather</span>
            </div>
          </div>
          <div className="space-x-6 hidden md:flex text-xs font-medium uppercase tracking-widest text-neutral-400 items-center">
            <a href="#operations" className="hover:text-amber-500 transition-colors">Operations</a>
            <a href="#music" className="hover:text-amber-500 transition-colors">Music</a>
            <a href="#art" className="hover:text-amber-500 transition-colors">Art</a>
            <a href="#blog" className="hover:text-amber-500 transition-colors">The Wire</a>
            <a href="#links" className="hover:text-amber-500 transition-colors">Links</a>
          </div>
          <a href="/admin" className="px-6 py-2 border border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-black font-bold uppercase text-xs tracking-widest transition-all duration-300">
            Members Only
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center px-4 pt-24 pb-20 md:pt-40 md:pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800/20 via-neutral-950 to-neutral-950 -z-10"></div>
        
        {/* UPDATED HEADING */}
        <h1 className={`text-5xl md:text-8xl font-black tracking-tighter text-white max-w-5xl mb-8 font-playfair`}>
          Join The <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber-500 to-amber-800">Mob</span>
        </h1>
        
        <div className="mt-12 flex flex-col md:flex-row gap-6">
          <a href="#blueprint" className="px-10 py-4 bg-amber-700 text-white font-bold text-lg uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-900/20">Kiss the Ring</a>
          <a href="#music" className="px-10 py-4 border border-neutral-700 hover:border-amber-600 text-neutral-300 hover:text-white font-bold text-lg uppercase tracking-widest transition-all">Hear the Score</a>
        </div>
      </main>

      {/* OPERATIONS (Services) */}
      <section id="operations" className="py-24 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className={`text-3xl font-bold text-white mb-4 font-playfair`}>Our Operations</h2>
                <p className="text-neutral-500">Strictly business.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                { title: "The Front", desc: "Web Development. Modern, fast, and secure. Nobody sees what's running in the back." },
                { title: "The Mechanic", desc: "Computer Services. Hardware repair, diagnostics, and cleaning up your messes." },
                { title: "The Image", desc: "Brand Strategy. Defining your identity in a crowded underworld." },
                { title: "The Counsel", desc: "Consulting. Advice you can trust. I never go against the family." }
                ].map((item, i) => (
                <div key={i} className="p-8 bg-neutral-900 border border-neutral-800 hover:border-amber-700 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-700 transform -translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    <h3 className={`text-xl font-bold text-white mb-4 font-playfair`}>{item.title}</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
                ))}
            </div>
        </div>
      </section>

      {/* MUSIC SECTION */}
      <section id="music" className="py-24 bg-neutral-900 border-y border-neutral-800">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
                <span className="text-amber-600 font-bold tracking-[0.2em] uppercase text-xs">The Sound</span>
                <h2 className={`text-4xl md:text-5xl font-bold text-white mt-3 font-playfair`}>The Score</h2>
                <div className="w-24 h-1 bg-amber-700 mx-auto mt-6"></div>
            </div>
            {music.length === 0 && !loading && (
                 <div className="text-center text-neutral-500 border border-dashed border-neutral-800 p-10">
                    <p>The orchestra is silent.</p>
                 </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {music.map((track) => (
                    <div key={track.id} className="bg-neutral-950 p-6 border border-neutral-800 hover:border-neutral-700 transition-colors">
                        <div className="aspect-square bg-neutral-800 mb-4 flex items-center justify-center overflow-hidden">
                             {track.albumArtUrl ? (
                                <img src={track.albumArtUrl} alt="Album Art" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                             ) : (
                                <svg className="w-12 h-12 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                             )}
                        </div>
                        <h3 className="text-white font-bold text-lg truncate">{track.title}</h3>
                        <p className="text-neutral-500 text-sm mb-4 truncate">{track.subtitle}</p>
                        <a href={track.link} target="_blank" className="text-amber-600 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors block mt-auto">Play Track &rarr;</a>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* ART SECTION */}
      <section id="art" className="py-24 bg-neutral-950">
         <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
                <span className="text-amber-600 font-bold tracking-[0.2em] uppercase text-xs">The Gallery</span>
                <h2 className={`text-4xl md:text-5xl font-bold text-white mt-3 font-playfair`}>Masterpieces</h2>
            </div>
            {art.length === 0 && !loading && (
                 <div className="text-center text-neutral-500 border border-dashed border-neutral-800 p-10">
                    <p>The walls are bare.</p>
                 </div>
            )}
            {art.map((piece, index) => (
                <div key={piece.id} className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20 last:mb-0 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                    <div className="aspect-[3/4] bg-neutral-900 border border-neutral-800 relative p-4 rotate-1 hover:rotate-0 transition-transform duration-500">
                         <div className="w-full h-full bg-neutral-800 flex items-center justify-center overflow-hidden">
                            <img src={piece.imageUrl} alt={piece.title} className="w-full h-full object-cover" />
                         </div>
                    </div>
                    <div className="space-y-6">
                        <h3 className={`text-3xl font-bold text-white font-playfair`}>{piece.title}</h3>
                        <p className="text-neutral-400 leading-relaxed whitespace-pre-wrap">
                            {piece.description}
                        </p>
                        {/* <button className="px-8 py-3 border border-neutral-700 text-white uppercase tracking-widest text-xs hover:bg-neutral-900 transition-colors">View Full Collection</button> */}
                    </div>
                </div>
            ))}
         </div>
      </section>

      {/* BLOG SECTION */}
      <section id="blog" className="py-24 bg-neutral-900 border-t border-neutral-800">
        <div className="max-w-4xl mx-auto px-6">
             <div className="text-center mb-16">
                <span className="text-amber-600 font-bold tracking-[0.2em] uppercase text-xs">The Wire</span>
                <h2 className={`text-4xl md:text-5xl font-bold text-white mt-3 font-playfair`}>Word on the Street</h2>
            </div>
            {blogPosts.length === 0 && !loading && (
                 <div className="text-center text-neutral-500 border border-dashed border-neutral-800 p-10">
                    <p>It's quiet. Too quiet.</p>
                 </div>
            )}
            <div className="space-y-8">
                {blogPosts.map((post, i) => (
                    <div key={post.id} className="group cursor-pointer border-l-2 border-transparent hover:border-amber-700 pl-6 transition-all">
                        <div className="flex flex-col md:flex-row md:items-baseline gap-4 mb-2">
                            <span className="text-amber-700 font-mono text-sm">{post.timestamp?.toDate ? post.timestamp.toDate().toLocaleDateString() : 'Date N/A'}</span>
                            <h3 className="text-2xl font-bold text-white group-hover:text-amber-600 transition-colors font-playfair">{post.title}</h3>
                        </div>
                        <p className="text-neutral-400 max-w-2xl line-clamp-2">{post.excerpt}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* LINKS SECTION */}
      <section id="links" className="py-24 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
                <h2 className={`text-3xl font-bold text-white mb-4 font-playfair`}>Known Associates</h2>
                <p className="text-neutral-500">Trusted connections in the family.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
                {["GitHub", "LinkedIn", "Twitter", "SoundCloud", "Behance"].map((link, i) => (
                    <a key={i} href="#" className="px-6 py-3 bg-neutral-900 border border-neutral-800 hover:border-amber-700 text-neutral-300 hover:text-white transition-all uppercase tracking-widest text-xs">
                        {link}
                    </a>
                ))}
            </div>
        </div>
      </section>

      {/* VIDEO SECTION (Dynamic) */}
      <section id="videos" className="py-24 bg-neutral-900 border-y border-neutral-800">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
                <span className="text-amber-600 font-bold tracking-[0.2em] uppercase text-xs">Surveillance</span>
                <h2 className={`text-4xl md:text-5xl font-bold text-white mt-3 font-playfair`}>The Screening Room</h2>
                <div className="w-24 h-1 bg-amber-700 mx-auto mt-6"></div>
            </div>

            {videos.length === 0 && !loading && (
                 <div className="text-center text-neutral-500 border border-dashed border-neutral-800 p-10">
                    <p>No tapes found in the archives.</p>
                 </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {videos.map((video) => (
                    <div key={video.id} className="group relative aspect-video bg-black rounded-sm border border-neutral-800 overflow-hidden shadow-2xl">
                        <iframe 
                            width="100%" 
                            height="100%" 
                            src={`https://www.youtube.com/embed/${video.videoId}`} 
                            title={video.title} 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                            className="opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                        ></iframe>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 pointer-events-none">
                            <span className="text-white font-bold tracking-widest uppercase text-sm border-l-4 border-amber-600 pl-3">
                                {video.title}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Photo Gallery Section */}
      <section id="gallery" className="py-24 bg-neutral-900 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col items-center mb-16">
                <span className="text-amber-600 font-bold tracking-[0.2em] uppercase text-xs">The Archive</span>
                <h2 className={`text-4xl md:text-5xl font-bold text-white mt-3 font-playfair`}>Evidence</h2>
                {loading && <p className="text-amber-600 mt-4 animate-pulse">Developing film...</p>}
                
                {error && (
                    <div className="bg-red-900/50 text-red-300 p-4 rounded mt-4 border border-red-700 space-y-2 text-left">
                        <p className="font-bold">Connection Error Detected:</p>
                        <p className="text-sm"><span className="font-mono text-amber-300 mr-2">CODE:</span> {error}</p>
                        <p className="text-sm"><span className="font-mono text-amber-300 mr-2">Project ID:</span> {firebaseConfig.projectId || 'MISSING'}</p>
                        <p className="text-sm"><span className="font-mono text-amber-300 mr-2">Photo Path:</span> {photoPath}</p>
                        <p className="text-sm"><span className="font-mono text-amber-300 mr-2">Video Path:</span> {videoPath}</p>
                        <p className="text-xs text-red-400 font-bold mt-2">
                            ACTION: Please verify your .env.local file matches your Firebase Project ID and that your Firestore Security Rules allow access to these paths.
                        </p>
                    </div>
                )}
            </div>

            {/* Featured Photo */}
            {featuredPhoto && (
                <div className="mb-20 relative">
                    <div className="absolute inset-0 bg-amber-600 blur-[100px] opacity-10"></div>
                    <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="aspect-[4/3] border-8 border-white shadow-2xl transform -rotate-2 bg-neutral-800">
                            <img 
                                src={featuredPhoto.url} 
                                alt="Featured" 
                                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                            />
                        </div>
                        <div>
                            <span className="text-amber-600 font-bold tracking-widest uppercase text-xs mb-2 block">Don's Choice</span>
                            <h3 className={`text-4xl font-bold text-white mb-6 font-playfair`}>
                                {featuredPhoto.caption || 'A Moment in Time'}
                            </h3>
                            <div className="mt-8 pt-8 border-t border-neutral-800 flex items-center text-sm text-neutral-500 font-mono">
                                <span>EVIDENCE # {featuredPhoto.id.substring(0, 8)}</span>
                                <span className="mx-4">•</span>
                                <span>{featuredPhoto.timestamp?.toDate ? featuredPhoto.timestamp.toDate().toLocaleDateString() : 'UNKNOWN DATE'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Archive Grid */}
            {Object.keys(archivedPhotos).sort((a, b) => b.localeCompare(a)).map(year => (
                <div key={year} className="mb-16">
                    <div className="flex items-baseline mb-8 border-b border-neutral-800 pb-4">
                        <h4 className={`text-3xl font-bold text-white font-playfair`}>{year}</h4>
                        <span className="ml-4 text-neutral-600 uppercase tracking-widest text-xs">Timeline</span>
                    </div>
                    {Object.keys(archivedPhotos[year]).map(month => (
                        <div key={month} className="mb-10">
                            <h5 className="text-amber-600 font-bold uppercase tracking-widest text-xs mb-6">{month}</h5>
                            {renderPhotoGrid(archivedPhotos[year][month])}
                        </div>
                    ))}
                </div>
            ))}
            
             {photos.length === 0 && !loading && !error && (
                <div className="text-center p-12 border border-dashed border-neutral-800">
                    <p className="text-neutral-500">The vaults are empty. Visit the safehouse (Admin) to deposit assets.</p>
                </div>
            )}
        </div>
      </section>

      <footer className="py-12 text-center text-neutral-600 text-sm bg-black border-t border-neutral-900">
        <div className="mb-4 flex justify-center items-center gap-2">
            <svg className="w-4 h-4 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="m16 4-4 4-4-4"/><circle cx="12" cy="9" r="2"/><path d="M12 11v11"/><path d="M8 14h8"/><path d="M6 22h12"/></svg>
            <span className={`font-bold text-neutral-400 font-playfair text-lg`}>The Gogfather</span>
        </div>
        <p>&copy; {new Date().getFullYear()} All rights reserved. It's strictly business.</p>
      </footer>
    </div>
  );
}