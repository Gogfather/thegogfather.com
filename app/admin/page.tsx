'use client';
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, doc, deleteDoc, query, onSnapshot, orderBy, Timestamp, setDoc } from 'firebase/firestore';

// --- Global Type Declarations for Canvas Environment (Fixes TS2304/TS2552) ---
declare global {
    interface Window {
        __app_id?: string;
        __firebase_config?: string;
        __initial_auth_token?: string;
    }
    // These are globals provided by the Canvas environment for direct access
    // We only declare the interface above; const declaration is in page.tsx
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
    // Use the safest check to access globals via typeof to avoid compilation errors on Vercel
    const isCanvasEnv = typeof window !== 'undefined' && typeof window.__app_id !== 'undefined';
    
    if (isCanvasEnv) {
        try {
            // Access Canvas globals directly via window object
            const canvasConfig = JSON.parse(window.__firebase_config!);
            const initialAuthToken = window.__initial_auth_token;
            
            // CRITICAL FIX: Use the Vercel Project ID if set, or the Canvas ID as a fallback for the path
            const vercelProjectId = externalConfig.projectId;
            const finalAppId = vercelProjectId || window.__app_id!.replace(/[^a-zA-Z0-9_-]/g, '-'); // Sanitize Canvas ID
            
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

// --- CUSTOM HOOK ---

const useFirebase = () => {
    // Explicitly define types for state variables
    const [db, setDb] = useState<any>(null); // Type 'any' for DB handle
    const [userId, setUserId] = useState<string | null>(null); // Explicitly type userId
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
                    // console.error("Firebase Auth Failed:", authError);
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
            // console.error("Firebase Initialization Error:", e);
            setError(`Initialization error: ${e.message}`);
            setAuthReady(true);
        }
    }, [initialAuthToken, JSON.stringify(firebaseConfig)]);

    // Explicitly returning the full Firebase config object for the diagnostic block
    return { db, userId, authReady, error, setError, appId, firebaseConfig };
};

// --- MAIN ADMIN COMPONENT ---

export default function AdminPage() {
    const { db, userId, authReady, error, setError, appId, firebaseConfig } = useFirebase();
    const [photos, setPhotos] = useState<Photo[]>([]); // Explicitly typing photos state
    const [formData, setFormData] = useState({ url: '', caption: '' });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Only allow write operations if auth is complete AND a non-null userId exists (non-anonymous user)
    // NOTE: This currently relies on anonymous sign-in returning a UID, which only works if allowed
    const isAuthorized = authReady && userId; 

    // 1. Fetch Existing Photos
    useEffect(() => {
        if (!db || !authReady || appId === 'default-app-id') return;
        
        const collectionPath = `artifacts/${appId}/public/data/photos`;
        // console.log("Admin fetching from collection path:", collectionPath);

        const photosCollectionRef = collection(db, collectionPath);
        const q = query(photosCollectionRef, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPhotos: Photo[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data() as Omit<Photo, 'id'>,
                // Ensure timestamp is converted if necessary for display (though Firestore rules require proper timestamp type)
                timestamp: doc.data().timestamp,
            }));
            setPhotos(fetchedPhotos);
        }, (dbError) => {
            // console.error("Firestore Fetch Error (Admin):", dbError);
        });

        return () => unsubscribe();
    }, [db, authReady, appId]);


    // 2. Form Handlers

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddPhoto = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthorized) {
            setMessage("Error: Not authorized. Write operations require a non-anonymous sign-in.");
            return;
        }
        if (!formData.url || !formData.caption) {
            setMessage("Error: Photo URL and Caption are required.");
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const collectionPath = `artifacts/${appId}/public/data/photos`;
            await addDoc(collection(db, collectionPath), {
                ...formData,
                timestamp: Timestamp.now(),
                isFeatured: false, 
                userId: userId // Use the authenticated UID
            });
            setMessage('Photo added successfully!');
            setFormData({ url: '', caption: '' });
        } catch (error: any) {
            // console.error("Error adding document: ", error);
            setMessage(`Error adding photo: ${error.message}. Check security rules/user authorization.`);
        } finally {
            setLoading(false);
        }
    };

    const handleFeaturePhoto = async (id: string) => {
        if (!isAuthorized) {
            setMessage("Error: Not authorized. Write operations require a non-anonymous sign-in.");
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const collectionPath = `artifacts/${appId}/public/data/photos`;

            // 1. Un-feature all existing photos
            const batchUpdates = photos.filter(p => p.isFeatured).map(p => 
                updateDoc(doc(db, collectionPath, p.id), { isFeatured: false })
            );
            await Promise.all(batchUpdates);

            // 2. Feature the selected photo
            await updateDoc(doc(db, collectionPath, id), { isFeatured: true });

            setMessage('Photo featured as Photo of the Day!');
        } catch (error: any) {
            // console.error("Error featuring photo: ", error);
            setMessage(`Error featuring photo: ${error.message}.`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePhoto = async (id: string) => {
        if (!isAuthorized) {
            setMessage("Error: Not authorized. Write operations require a non-anonymous sign-in.");
            return;
        }
        
        setLoading(true);
        setMessage('');

        try {
            const collectionPath = `artifacts/${appId}/public/data/photos`;
            await deleteDoc(doc(db, collectionPath, id));
            setMessage('Photo deleted successfully!');
        } catch (error: any) {
            // console.error("Error deleting photo: ", error);
            setMessage(`Error deleting photo: ${error.message}.`);
        } finally {
            setLoading(false);
        }
    };


    // 3. Render Logic

    if (!authReady) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500">
                <p>Initializing Firebase Connection...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
            
            <header className="pb-8 border-b border-slate-800 mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tighter text-white">
                        THE <span className="text-amber-500">GOGFATHER</span> ADMIN
                    </h1>
                    <p className="text-slate-400 mt-1">Manage The Collection in real-time.</p>
                </div>
                <a href="/" className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-full transition-colors">
                    &larr; Back to Site
                </a>
            </header>

            {error && (
                <div className="bg-red-900/50 text-red-300 p-4 rounded mb-6 border border-red-700">
                    <p className="font-bold">System Error:</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}
            
            {/* DIAGNOSTIC BLOCK */}
            {(error || !isAuthorized) && (
                <div className="bg-slate-800 p-4 rounded mb-6 border border-slate-700 space-y-1 text-xs">
                    <p className="font-bold text-amber-500">CONFIGURATION DIAGNOSTIC</p>
                    <p>
                        <span className="font-mono text-slate-400 mr-2">Project ID (Path):</span> 
                        <span className="text-white">{appId}</span>
                    </p>
                    <p>
                        <span className="font-mono text-slate-400 mr-2">Auth Domain:</span> 
                        <span className="text-white">{firebaseConfig.authDomain || 'MISSING'}</span>
                    </p>
                    <p>
                        <span className="font-mono text-slate-400 mr-2">User ID (Is Admin?):</span> 
                        <span className="text-white">{userId || 'Not Authenticated'}</span>
                    </p>
                    <div className="text-red-300 mt-2">
                        *If Project ID is invalid or access fails, ensure:
                        <ul className='list-disc list-inside ml-2 mt-1'>
                            <li>Vercel `NEXT_PUBLIC_FIREBASE_PROJECT_ID` is set.</li>
                            <li>Firebase Auth (Anonymous/Local) is ENABLED.</li>
                            <li>Local domain (`localhost`) is authorized in Firebase Console.</li>
                        </ul>
                    </div>
                </div>
            )}
            {/* END DIAGNOSTIC BLOCK */}


            {!isAuthorized && (
                <div className="bg-amber-900/50 text-amber-200 p-4 rounded mb-6 border border-amber-700">
                    <p className="font-bold">Access Warning:</p>
                    <p className="text-sm">Write/Update/Delete operations are disabled. You must be authenticated with Firebase to manage photos.</p>
                    <p className="text-xs mt-1">
                        If running locally or on Vercel, this usually means Firebase Auth failed 
                        to sign in correctly (check Authorized Domains/Keys) or you are signed in anonymously.
                    </p>
                </div>
            )}
            
            {message && (
                <div className={`p-4 rounded mb-6 ${message.startsWith('Error') ? 'bg-red-700' : 'bg-green-700'}`}>
                    {message}
                </div>
            )}

            {/* ADD NEW PHOTO FORM */}
            <section className="mb-12 bg-slate-900 p-6 rounded-xl border border-slate-800">
                <h2 className="text-2xl font-bold text-amber-500 mb-4 border-b border-slate-700 pb-2">Add New Photo</h2>
                <form onSubmit={handleAddPhoto} className="space-y-4">
                    <input
                        type="url"
                        name="url"
                        placeholder="Image URL (e.g., from Amazon Photos or CDN)"
                        value={formData.url}
                        onChange={handleChange}
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md placeholder-slate-500 focus:ring-amber-500 focus:border-amber-500"
                        disabled={!isAuthorized || loading}
                    />
                    <input
                        type="text"
                        name="caption"
                        placeholder="Caption or description"
                        value={formData.caption}
                        onChange={handleChange}
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md placeholder-slate-500 focus:ring-amber-500 focus:border-amber-500"
                        disabled={!isAuthorized || loading}
                    />
                    <button
                        type="submit"
                        className={`w-full py-3 rounded-md font-bold transition-colors ${
                            isAuthorized ? 'bg-amber-600 hover:bg-amber-500 text-black' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                        disabled={!isAuthorized || loading}
                    >
                        {loading ? 'Adding...' : 'Add Photo to Archive'}
                    </button>
                </form>
                {!isAuthorized && <p className="text-xs text-slate-500 mt-2">Authentication required for adding photos.</p>}
            </section>

            {/* CURRENT ARCHIVE LIST */}
            <section>
                <h2 className="text-2xl font-bold text-white mb-4 border-b border-slate-700 pb-2">Current Photo Archive ({photos.length})</h2>
                <div className="space-y-4">
                    {photos.length === 0 && (
                        <p className="text-slate-500">No photos found in the database yet.</p>
                    )}
                    {photos.map(photo => (
                        <div 
                            key={photo.id} 
                            className={`flex flex-col md:flex-row items-start md:items-center p-4 rounded-xl border ${
                                photo.isFeatured ? 'border-amber-500 bg-amber-900/20' : 'border-slate-800 bg-slate-900'
                            }`}
                        >
                            {/* Thumbnail */}
                            <div className="w-16 h-16 flex-shrink-0 mr-4 rounded-lg overflow-hidden">
                                <img src={photo.url} alt="Thumbnail" className="w-full h-full object-cover" 
                                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { 
                                        e.currentTarget.onerror = null; 
                                        e.currentTarget.src = `https://placehold.co/64x64/334155/eab308?text=X`; 
                                    }}
                                />
                            </div>

                            {/* Details */}
                            <div className="flex-grow min-w-0">
                                <p className="font-semibold text-white truncate">{photo.caption}</p>
                                <p className="text-xs text-slate-400 truncate mt-1">ID: {photo.id}</p>
                                {/* Timestamp rendering needs safety check for existence before calling toLocaleDateString */}
                                <p className="text-xs text-slate-500">Posted: {photo.timestamp && typeof photo.timestamp.toDate === 'function' ? photo.timestamp.toDate().toLocaleDateString() : 'N/A'}</p>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 md:mt-0 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 flex-shrink-0 ml-4">
                                {!photo.isFeatured ? (
                                    <button
                                        onClick={() => handleFeaturePhoto(photo.id)}
                                        className={`px-3 py-2 text-xs rounded-full font-semibold transition-colors ${
                                            isAuthorized ? 'bg-amber-600 hover:bg-amber-500 text-black' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        }`}
                                        disabled={!isAuthorized || loading}
                                    >
                                        Set as Photo of Day
                                    </button>
                                ) : (
                                    <span className="px-3 py-2 text-xs rounded-full bg-amber-500 text-black font-bold">
                                        FEATURED
                                    </span>
                                )}
                                <button
                                    onClick={() => handleDeletePhoto(photo.id)}
                                    className={`px-3 py-2 text-xs rounded-full font-semibold transition-colors ${
                                        isAuthorized ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    }`}
                                    disabled={!isAuthorized || loading}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}