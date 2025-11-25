'use client';
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';

// --- Global Type Declarations for Canvas Environment (Fixes TS2304/TS2552) ---
declare global {
    interface Window {
        __app_id?: string;
        __firebase_config?: string;
        __initial_auth_token?: string;
    }
    // These are globals provided by the Canvas environment for direct access
    const __app_id: string;
    const __firebase_config: string;
    const __initial_auth_token: string;
}

// --- Data Structure Interface (Fixes TS2339) ---
interface Photo {
    id: string;
    url: string;
    caption: string;
    isFeatured: boolean;
    timestamp: Timestamp;
    userId: string;
}

// --- Configuration and Initialization Logic (Embedded) ---

const getFirebaseConfig = () => {
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
            // Access Canvas globals directly
            const canvasConfig = JSON.parse(__firebase_config);
            const initialAuthToken = __initial_auth_token;
            
            // CRITICAL FIX: Use the Vercel Project ID if set, or the Canvas ID as a fallback for the path
            const vercelProjectId = externalConfig.projectId;
            const finalAppId = vercelProjectId || __app_id.replace(/[^a-zA-Z0-9_-]/g, '-'); // Sanitize Canvas ID
            
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
            appId: externalConfig.projectId, // Use Project ID for path
            isCanvasEnv: false
        };
    }

    // 4. Fallback 
    return { 
        firebaseConfig: {}, 
        initialAuthToken: undefined, 
        appId: 'default-app-id', 
        isCanvasEnv: false
    };
};

/**
 * Groups photos by year and then by month for archiving.
 */
const groupPhotosByDate = (photos: Photo[]) => {
    const grouped: { [year: string]: { [month: string]: Photo[] } } = {};

    photos.forEach(photo => {
        // Ensure photo is valid and has a timestamp object that can be converted
        if (!photo.timestamp || typeof photo.timestamp.toDate !== 'function') return;

        const date = photo.timestamp.toDate(); 
        const year = date.getFullYear().toString();
        const month = date.toLocaleString('en-US', { month: 'long' });

        if (!grouped[year]) {
            grouped[year] = {};
        }
        if (!grouped[year][month]) {
            grouped[year][month] = [];
        }

        grouped[year][month].push(photo);
    });

    return grouped;
};

// --- CUSTOM HOOK ---

const useFirebase = () => {
    // Explicitly define types for state variables
    const [db, setDb] = useState<any>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [error, setError] = useState<string | null>(null); // Explicitly allow string or null
    
    const { firebaseConfig, initialAuthToken, appId } = getFirebaseConfig();

    // The core initialization logic
    useEffect(() => {
        // Check for required configuration keys before initialization
        if (!firebaseConfig.apiKey) {
            setError("ERROR: Firebase configuration keys are missing. Please ensure Vercel environment variables are set.");
            setAuthReady(true);
            return;
        }

        try {
            // Attempt to initialize Firebase app
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const auth = getAuth(app);
            
            const initializeAuth = async () => {
                try {
                    if (initialAuthToken) {
                        // For Canvas preview environment
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        // For local/Vercel (public read)
                        await signInAnonymously(auth);
                    }
                } catch (authError: any) { // Using any type for caught error
                    setError(`Authentication failed: ${authError.code}`);
                }
            };

            initializeAuth();

            onAuthStateChanged(auth, (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    setUserId(null); 
                }
                setDb(firestoreDb);
                setAuthReady(true);
            });
            
        } catch (e: any) { // Using any type for caught error
            setError(`Initialization error: ${e.message}`);
            setAuthReady(true);
        }
    }, [initialAuthToken, JSON.stringify(firebaseConfig)]);

    // Explicitly returning the full Firebase config object for the diagnostic block
    return { db, userId, authReady, error, setError, appId, firebaseConfig };
};


// --- MAIN APP COMPONENT ---

export default function Home() {
  const { db, userId, authReady, error, setError, appId, firebaseConfig } = useFirebase();
  const [photos, setPhotos] = useState<Photo[]>([]); // Explicitly typing photos as array of Photo objects
  const [featuredPhoto, setFeaturedPhoto] = useState<Photo | null>(null); // Explicitly typing featured photo
  const [loading, setLoading] = useState(true);

  // 2. Fetch Photos in Real-Time
  useEffect(() => {
    if (!db || !authReady) {
      if (!authReady) return; 
      if (!firebaseConfig.projectId) {
         setError("App ID not configured. Check Vercel environment variables."); 
         setLoading(false);
         return;
      }
    }
    
    // Collection path: /artifacts/{appId}/public/data/photos
    const collectionPath = `artifacts/${appId}/public/data/photos`;
    // console.log("Attempting to read from public collection path:", collectionPath);

    // Guard clause for invalid path segments (final check for Canvas ID issues)
    if (collectionPath.includes('//') || collectionPath.includes('..')) {
        setError("Invalid Path Construction. Check Project ID for illegal characters.");
        setLoading(false);
        return;
    }


    const photosCollectionRef = collection(db, collectionPath);
    
    // Query: Order by timestamp, newest first
    const q = query(photosCollectionRef, orderBy('timestamp', 'desc'));

    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPhotos: Photo[] = snapshot.docs.map(doc => ({
        id: doc.id,
        // Assert the data type here for safety
        ...doc.data() as Omit<Photo, 'id'> 
      }));

      // Separate featured photo
      const featured = fetchedPhotos.find(p => p.isFeatured) || null;
      setFeaturedPhoto(featured);
      
      // Filter out the featured photo from the main list
      const nonFeatured = fetchedPhotos.filter(p => p.id !== (featured ? featured.id : null));
      setPhotos(nonFeatured);
      setLoading(false);
      setError(null); 

    }, (dbError) => {
        // console.error("Firestore Error fetching photos:", dbError);
        setError("Error fetching photos. Please check that Firestore Security Rules allow public read access."); 
        setLoading(false);
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [db, authReady, appId, JSON.stringify(firebaseConfig)]); 

  const archivedPhotos = groupPhotosByDate(photos);
  const isLoading = loading && !error;

  const renderPhotoGrid = (photoList: Photo[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {photoList.map((photo) => (
            <div key={photo.id} className="aspect-square rounded-lg overflow-hidden shadow-xl shadow-slate-900/50 hover:shadow-amber-500/30 transition-shadow border border-slate-800">
                <img 
                    src={photo.url || `https://placehold.co/500x500/1e293b/f59e0b?text=Photo+Error`} 
                    alt={photo.caption || 'Gogfather Photo'} 
                    className="w-full h-full object-cover transition duration-300 transform hover:scale-105"
                    onError={(e) => { 
                        e.currentTarget.onerror = null; 
                        e.currentTarget.src = `https://placehold.co/500x500/334155/eab308?text=Load+Error`; 
                    }}
                />
            </div>
        ))}
    </div>
  );

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
            <a href="#gallery" className="hover:text-amber-500 transition-colors">Gallery</a>
            <a href="#blueprint" className="hover:text-amber-500 transition-colors">The Blueprint</a>
            <a href="#shop" className="hover:text-amber-500 transition-colors">Shop</a>
          </div>
          {/* Link to Admin Page */}
          <a href="/admin" className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-full transition-all">
            Admin
          </a>
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

      {/* Photo Gallery Section */}
      <section id="gallery" className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
            <span className="text-amber-500 font-bold tracking-widest uppercase text-sm">The Collection</span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mt-2">The Gogfather's Eye</h2>
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
                A selection of moments, posted directly from the secure archive.
            </p>
            {(isLoading || !authReady) && <p className="text-slate-500 mt-4">Initializing connection...</p>}
            {error && (
                <div className="bg-red-900/50 text-red-300 p-4 rounded mt-4 border border-red-700 space-y-2 text-left">
                    <p className="font-bold">Connection Error Detected:</p>
                    <p className="text-sm">
                        <span className="font-mono text-amber-300 mr-2">CODE:</span> {error}
                    </p>
                    <p className="text-sm">
                        <span className="font-mono text-amber-300 mr-2">API Key:</span> {firebaseConfig.apiKey ? 'Set' : 'Missing!'}
                    </p>
                    <p className="text-sm">
                        <span className="font-mono text-amber-300 mr-2">Auth Domain:</span> {firebaseConfig.authDomain || 'Missing!'}
                    </p>
                    <p className="text-sm">
                        <span className="font-mono text-amber-300 mr-2">Project ID:</span> {firebaseConfig.projectId || 'Missing!'}
                    </p>
                    <p className="text-sm">
                        <span className="font-mono text-amber-300 mr-2">Path ID:</span> {appId}
                    </p>
                    <p className="text-xs text-red-400 font-bold mt-2">
                        ACTION: Please verify your .env.local file (for local) or Vercel Environment Variables (for deployment) match the exact keys from your Firebase Web App configuration.
                    </p>
                </div>
            )}
        </div>

        {/* Featured Photo of the Day */}
        {featuredPhoto && (
            <div className="mb-16 p-6 rounded-xl bg-slate-900 border border-amber-500/50 shadow-2xl shadow-amber-900/20">
                <h3 className="text-2xl font-bold text-amber-500 mb-4 text-center">Photo of the Day</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 aspect-[4/3] rounded-lg overflow-hidden">
                        <img 
                            src={featuredPhoto.url || `https://placehold.co/1200x900/1e293b/f59e0b?text=FEATURED+PHOTO`} 
                            alt={featuredPhoto.caption || 'Featured Gogfather Photo'} 
                            className="w-full h-full object-cover"
                            onError={(e) => { 
                                e.currentTarget.onerror = null; 
                                e.currentTarget.src = `https://placehold.co/1200x900/334155/eab308?text=Load+Error`; 
                            }}
                        />
                    </div>
                    <div className="md:col-span-1 flex flex-col justify-between">
                        <div>
                            <p className="text-lg font-semibold text-white">
                                {featuredPhoto.caption || 'A special moment captured.'}
                            </p>
                            {featuredPhoto.timestamp && (
                                <p className="text-sm text-slate-500 mt-1">
                                    Posted: {featuredPhoto.timestamp.toDate().toLocaleDateString()}
                                </p>
                            )}
                        </div>
                        <p className="text-sm text-slate-400 mt-4">
                            This photo is manually marked as the feature for today by the Gogfather admin.
                        </p>
                    </div>
                </div>
            </div>
        )}
        
        {/* Photo Archive by Date */}
        <h3 className="text-3xl font-bold text-white mt-16 mb-8 border-b border-slate-800 pb-4">Archive</h3>
        {Object.keys(archivedPhotos).sort((a: string, b: string) => parseInt(b) - parseInt(a)).map(year => (
            <div key={year} className="mb-12">
                <h4 className="text-2xl font-bold text-amber-400 mb-6">{year}</h4>
                {Object.keys(archivedPhotos[year]).map(month => (
                    <div key={month} className="mb-8 p-6 bg-slate-900/50 rounded-xl">
                        <h5 className="text-xl font-semibold text-white mb-4 border-b border-slate-700 pb-2">{month}</h5>
                        {renderPhotoGrid(archivedPhotos[year][month])}
                    </div>
                ))}
            </div>
        ))}
        {photos.length === 0 && !isLoading && !error && (
            <p className="text-center text-slate-500 mt-8">
                The archive is currently empty. Visit the Admin page to add your first photo.
            </p>
        )}

        <p className="text-center text-sm text-slate-500 mt-12">
            **Admin Note:** To add new photos or set the "Photo of the Day," you will need the administration interface.
        </p>
      </section>


      {/* THE BLUEPRINT (How-Tos Section - Existing Code) */}
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
                        <span className="text-white font-bold">1.</span> Log in to <a href="https://vercel.com" target="_blank" className="text-amber-500 hover:text-amber-400 underline">Vercel.com</a>
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