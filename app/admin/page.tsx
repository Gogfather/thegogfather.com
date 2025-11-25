'use client';
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, doc, deleteDoc, query, onSnapshot, orderBy, Timestamp, setDoc } from 'firebase/firestore';

// --- Global Type Declarations for Canvas Environment ---
declare global {
    interface Window {
        __app_id?: string;
        __firebase_config?: string;
        __initial_auth_token?: string;
    }
}

// --- Data Structure Interface ---
interface Photo {
    id: string;
    url: string;
    caption: string;
    isFeatured: boolean;
    timestamp: Timestamp;
    userId: string;
}

// Function to sanitize IDs that might contain path separators
const sanitizeId = (id: string | undefined): string => {
    if (!id) return 'default-app-id';
    return id.replace(/[^a-zA-Z0-9_-]/g, '-');
};

// --- Configuration and Initialization Logic ---

const getFirebaseConfig = () => {
    // 1. Check for Vercel/Next.js Environment Variables
    const externalConfig = {
        apiKey: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY : undefined,
        authDomain: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN : undefined,
        projectId: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID : undefined,
        appId: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_APP_ID : undefined,
    };
    
    // 2. Check for Canvas Globals
    const isCanvasEnv = typeof window !== 'undefined' && typeof window.__app_id !== 'undefined';
    
    if (isCanvasEnv) {
        try {
            const canvasConfig = JSON.parse(window.__firebase_config!);
            const initialAuthToken = window.__initial_auth_token;
            const vercelProjectId = externalConfig.projectId;
            const rawAppId = vercelProjectId || window.__app_id;
            const finalAppId = sanitizeId(rawAppId);

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
            appId: sanitizeId(externalConfig.projectId),
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
    const [db, setDb] = useState<any>(null);
    const [auth, setAuth] = useState<any>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const { firebaseConfig, initialAuthToken, appId } = getFirebaseConfig();

    useEffect(() => {
        if (!firebaseConfig || !firebaseConfig.apiKey) {
            setError("ERROR: Firebase configuration keys are missing. Please ensure Vercel environment variables are set.");
            setAuthReady(true);
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            
            setAuth(firebaseAuth);
            
            const initializeAuth = async () => {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(firebaseAuth, initialAuthToken);
                    } else {
                        // Silent fallback: If anonymous auth is disabled in console, this throws.
                        await signInAnonymously(firebaseAuth); 
                    }
                } catch (authError: any) {
                    // Only log actual errors, not "operation not allowed" if we intend to use email login anyway
                    if (authError.code !== 'auth/operation-not-allowed') {
                        console.warn("Anonymous Auth Failed (Normal if disabled):", authError.code);
                    }
                }
            };

            initializeAuth();

            onAuthStateChanged(firebaseAuth, (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    setUserId(null); 
                }
                setDb(firestoreDb);
                setAuthReady(true);
            });
            
        } catch (e: any) {
            setError(`Initialization error: ${e.message}`);
            setAuthReady(true);
        }
    }, [initialAuthToken, JSON.stringify(firebaseConfig)]);

    return { db, auth, userId, setUserId, authReady, error, setError, appId, firebaseConfig };
};

// --- LOGIN FORM COMPONENT ---

interface LoginFormProps {
    auth: any;
    setUserId: (uid: string | null) => void;
    setAuthError: (error: string | null) => void;
    loginLoading: boolean;
    setLoginLoading: (loading: boolean) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ auth, setUserId, setAuthError, loginLoading, setLoginLoading }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        setAuthError(null);
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            setUserId(userCredential.user.uid);
        } catch (error: any) {
            // We suppress the red console error for configuration issues and show a UI message instead
            if (error.code === 'auth/operation-not-allowed') {
                console.warn("Login blocked: Email/Password provider is disabled in Firebase.");
                setAuthError('CONFIGURATION ERROR: Email/Password provider is disabled. Enable it in Firebase Console -> Authentication -> Sign-in method.');
            } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                setAuthError('Invalid email or password.');
            } else if (error.code === 'auth/too-many-requests') {
                setAuthError('Too many failed attempts. Please try again later.');
            } else {
                console.error("Login error:", error);
                setAuthError(`Login failed: ${error.message}`);
            }
        } finally {
            setLoginLoading(false);
        }
    };
    
    return (
        <div className="max-w-md mx-auto mt-20 p-8 bg-slate-900 rounded-xl shadow-2xl border border-amber-500/50">
            <h2 className="text-3xl font-bold text-amber-500 mb-6 text-center">Admin Login</h2>
            <p className="text-slate-400 mb-6 text-center">Sign in with your dedicated Firebase Admin account.</p>
            <form onSubmit={handleLogin} className="space-y-4">
                <input
                    type="email"
                    placeholder="Admin Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md placeholder-slate-500 focus:ring-amber-500 focus:border-amber-500"
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md placeholder-slate-500 focus:ring-amber-500 focus:border-amber-500"
                    required
                />
                <button
                    type="submit"
                    className={`w-full py-3 rounded-md font-bold transition-colors ${
                        loginLoading ? 'bg-slate-700 text-slate-500 cursor-wait' : 'bg-amber-600 hover:bg-amber-500 text-black'
                    }`}
                    disabled={loginLoading}
                >
                    {loginLoading ? 'Verifying Credentials...' : 'Sign In'}
                </button>
            </form>
            <div className="mt-6 text-xs text-slate-500 text-center space-y-2">
                <p>* Ensure <strong>Email/Password</strong> provider is enabled in Firebase Console.</p>
                <p>* You must manually create this user in the Firebase Console first.</p>
            </div>
        </div>
    );
};

// --- MAIN ADMIN COMPONENT ---

export default function AdminPage() {
    const { db, auth, userId, setUserId, authReady, error, setError, appId, firebaseConfig } = useFirebase();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [formData, setFormData] = useState({ url: '', caption: '' });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const isAuthorized = authReady && !!userId; 

    // 1. Fetch Existing Photos
    useEffect(() => {
        if (!db || !authReady || appId === 'default-app-id') return;
        
        const collectionPath = `artifacts/${appId}/public/data/photos`;

        const photosCollectionRef = collection(db, collectionPath);
        const q = query(photosCollectionRef, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPhotos: Photo[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data() as Omit<Photo, 'id'>,
                timestamp: doc.data().timestamp,
            }));
            setPhotos(fetchedPhotos);
        }, (dbError) => {
            // console.error("Firestore Fetch Error:", dbError);
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
            setMessage("Error: Not authorized.");
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
                userId: userId
            });
            setMessage('Photo added successfully!');
            setFormData({ url: '', caption: '' });
        } catch (error: any) {
            setMessage(`Error adding photo: ${error.message}. Check security rules.`);
        } finally {
            setLoading(false);
        }
    };

    const handleFeaturePhoto = async (id: string) => {
        if (!isAuthorized) return;
        setLoading(true);
        try {
            const collectionPath = `artifacts/${appId}/public/data/photos`;
            const batchUpdates = photos.filter(p => p.isFeatured).map(p => 
                updateDoc(doc(db, collectionPath, p.id), { isFeatured: false })
            );
            await Promise.all(batchUpdates);
            await updateDoc(doc(db, collectionPath, id), { isFeatured: true });
            setMessage('Photo featured!');
        } catch (error: any) {
            setMessage(`Error featuring photo: ${error.message}.`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePhoto = async (id: string) => {
        if (!isAuthorized) return;
        setLoading(true);
        try {
            const collectionPath = `artifacts/${appId}/public/data/photos`;
            await deleteDoc(doc(db, collectionPath, id));
            setMessage('Photo deleted successfully!');
        } catch (error: any) {
            setMessage(`Error deleting photo: ${error.message}.`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            setMessage('Logged out.');
        }
    };

    if (!authReady) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500">
                <p>Initializing...</p>
            </div>
        );
    }
    
    if (!userId) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
                 <LoginForm 
                    auth={auth} 
                    setUserId={setUserId}
                    setAuthError={setAuthError} 
                    loginLoading={loginLoading}
                    setLoginLoading={setLoginLoading} 
                />
                {authError && (
                    <div className="max-w-md mx-auto mt-4 p-4 bg-red-900/50 border border-red-700 rounded text-red-200 text-center text-sm">
                        {authError}
                    </div>
                )}
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
                    <p className="text-slate-400 mt-1">Status: Authorized</p>
                </div>
                <div className='flex space-x-3'>
                    <button onClick={handleLogout} className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 rounded-full transition-colors">Logout</button>
                    <a href="/" className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-full transition-colors">&larr; Back to Site</a>
                </div>
            </header>

            {message && (
                <div className={`p-4 rounded mb-6 ${message.startsWith('Error') ? 'bg-red-700' : 'bg-green-700'}`}>
                    {message}
                </div>
            )}

            <section className="mb-12 bg-slate-900 p-6 rounded-xl border border-slate-800">
                <h2 className="text-2xl font-bold text-amber-500 mb-4 border-b border-slate-700 pb-2">Add New Photo</h2>
                <form onSubmit={handleAddPhoto} className="space-y-4">
                    <input
                        type="url"
                        name="url"
                        placeholder="Image URL"
                        value={formData.url}
                        onChange={handleChange}
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white"
                        disabled={loading}
                    />
                    <input
                        type="text"
                        name="caption"
                        placeholder="Caption"
                        value={formData.caption}
                        onChange={handleChange}
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        className="w-full py-3 rounded-md font-bold transition-colors bg-amber-600 hover:bg-amber-500 text-black"
                        disabled={loading}
                    >
                        {loading ? 'Adding...' : 'Add Photo to Archive'}
                    </button>
                </form>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-4 border-b border-slate-700 pb-2">Current Photo Archive ({photos.length})</h2>
                <div className="space-y-4">
                    {photos.map(photo => (
                        <div key={photo.id} className={`flex flex-col md:flex-row items-start md:items-center p-4 rounded-xl border ${photo.isFeatured ? 'border-amber-500 bg-amber-900/20' : 'border-slate-800 bg-slate-900'}`}>
                            <img src={photo.url} alt="Thumbnail" className="w-16 h-16 object-cover rounded-lg mr-4" />
                            <div className="flex-grow">
                                <p className="font-bold text-white">{photo.caption}</p>
                                <p className="text-xs text-slate-500">{new Date(photo.timestamp?.toDate()).toLocaleDateString()}</p>
                            </div>
                            <div className="flex space-x-2 mt-4 md:mt-0">
                                {!photo.isFeatured && (
                                    <button onClick={() => handleFeaturePhoto(photo.id)} disabled={loading} className="px-3 py-1 bg-amber-600 text-black rounded text-sm font-bold">Feature</button>
                                )}
                                <button onClick={() => handleDeletePhoto(photo.id)} disabled={loading} className="px-3 py-1 bg-red-600 text-white rounded text-sm font-bold">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}