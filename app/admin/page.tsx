'use client';
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signInWithEmailAndPassword, signOut, User, setPersistence, inMemoryPersistence } from 'firebase/auth';
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

interface Video {
    id: string;
    videoId: string;
    title: string;
    timestamp: Timestamp;
    userId: string;
}

interface MusicTrack {
    id: string;
    title: string;
    subtitle: string;
    link: string;
    albumArtUrl?: string;
    timestamp: Timestamp;
    userId: string;
}

interface ArtPiece {
    id: string;
    title: string;
    imageUrl: string;
    description: string;
    timestamp: Timestamp;
    userId: string;
}

interface BlogPost {
    id: string;
    title: string;
    excerpt: string;
    content: string;
    timestamp: Timestamp;
    userId: string;
}

// Function to sanitize IDs
const sanitizeId = (id: string | undefined): string => {
    if (!id) return 'default-app-id';
    return id.replace(/[^a-zA-Z0-9_-]/g, '-');
};

// --- Configuration and Initialization Logic ---

const getFirebaseConfig = () => {
    // 1. Check for Vercel/Next.js Environment Variables (Highest Priority)
    const externalConfig = {
        apiKey: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY : undefined,
        authDomain: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN : undefined,
        projectId: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID : undefined,
        appId: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_APP_ID : undefined,
    };
    
    // 2. Check for Canvas Globals (Second Priority for Preview)
    const isCanvasEnv = typeof window !== 'undefined' && typeof window.__app_id !== 'undefined';
    
    if (isCanvasEnv) {
        try {
            const canvasConfig = JSON.parse(window.__firebase_config!);
            const initialAuthToken = window.__initial_auth_token;
            
            // CRITICAL FIX: Use the Vercel Project ID if set, or the Canvas ID as a fallback for the path
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
    const [auth, setAuth] = useState<any>(null); // We store the auth instance here
    const [userId, setUserId] = useState<string | null>(null);
    const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
    const [authReady, setAuthReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const { firebaseConfig, initialAuthToken, appId } = getFirebaseConfig();

    useEffect(() => {
        if (!firebaseConfig || !firebaseConfig.apiKey) {
            setError("ERROR: Firebase configuration keys are missing.");
            setAuthReady(true);
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);

            // STRICT SECURITY: Set persistence to IN_MEMORY only.
            // This forces the user to log in every time the page is refreshed or closed.
            setPersistence(firebaseAuth, inMemoryPersistence)
                .then(() => {
                    setAuth(firebaseAuth);
                    
                    const initializeAuth = async () => {
                        try {
                            if (initialAuthToken) {
                                await signInWithCustomToken(firebaseAuth, initialAuthToken);
                            }
                            // Note: We do NOT sign in anonymously here. Admin requires real login.
                        } catch (authError: any) {
                            setError(`Authentication failed: ${authError.code}`);
                        }
                    };

                    initializeAuth();

                    onAuthStateChanged(firebaseAuth, (user) => {
                        if (user) {
                            setUserId(user.uid);
                            setIsAnonymous(user.isAnonymous);
                        } else {
                            setUserId(null);
                            setIsAnonymous(false);
                        }
                        setDb(firestoreDb);
                        setAuthReady(true);
                    });
                })
                .catch((err) => {
                    console.error("Persistence Error:", err);
                    setError("Failed to set auth persistence mode.");
                });
            
        } catch (e: any) {
            setError(`Initialization error: ${e.message}`);
            setAuthReady(true);
        }
    }, [initialAuthToken, JSON.stringify(firebaseConfig)]);

    return { db, auth, userId, setUserId, isAnonymous, authReady, error, setError, appId, firebaseConfig };
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
            console.error("Login error:", error);
            if (error.code === 'auth/operation-not-allowed') {
                setAuthError('CONFIGURATION ERROR: Email/Password provider is disabled. Enable it in Firebase Console.');
            } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                setAuthError('Invalid email or password.');
            } else {
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
    const { db, auth, userId, setUserId, isAnonymous, authReady, error, setError, appId, firebaseConfig } = useFirebase();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [videos, setVideos] = useState<Video[]>([]);
    const [music, setMusic] = useState<MusicTrack[]>([]);
    const [art, setArt] = useState<ArtPiece[]>([]);
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
    
    const [photoForm, setPhotoForm] = useState({ url: '', caption: '' });
    const [videoForm, setVideoForm] = useState({ videoId: '', title: '' });
    const [musicForm, setMusicForm] = useState({ title: '', subtitle: '', link: '', albumArtUrl: '' });
    const [artForm, setArtForm] = useState({ title: '', imageUrl: '', description: '' });
    const [blogForm, setBlogForm] = useState({ title: '', excerpt: '', content: '' });

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    
    const [activeTab, setActiveTab] = useState<'photos' | 'videos' | 'music' | 'art' | 'blog'>('photos');

    const isAuthorized = authReady && !!userId && !isAnonymous; 

    // 1. Fetch Existing Data
    useEffect(() => {
        if (!db || !authReady || appId === 'default-app-id') return;
        
        const subscribeToCollection = (colName: string, setState: Function) => {
            const q = query(collection(db, `artifacts/${appId}/public/data/${colName}`), orderBy('timestamp', 'desc'));
            return onSnapshot(q, (snapshot) => {
                setState(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any })));
                setPermissionError(null);
            }, (err) => {
                console.error(`${colName} Error:`, err);
                if (err.code === 'permission-denied') {
                    setPermissionError(`Permission denied for ${colName}. Check Firestore Rules.`);
                }
            });
        };

        const unsubPhotos = subscribeToCollection('photos', setPhotos);
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
    }, [db, authReady, appId]);

    // Handlers
    const handleLogout = async () => {
        if (auth) {
            try {
                await signOut(auth);
                window.location.href = '/';
            } catch (e) {
                console.error("Logout Error:", e);
            }
        }
    };

    // Generic Add Handler
    const handleAddItem = async (e: React.FormEvent, collectionName: string, data: any, resetForm: Function) => {
        e.preventDefault();
        if (!isAuthorized) return setMessage("Error: Not authorized.");
        setLoading(true);
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/${collectionName}`), {
                ...data,
                timestamp: Timestamp.now(),
                userId: userId
            });
            setMessage(`${collectionName} added!`);
            resetForm();
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Specific Wrappers to process form data before adding
    const onAddPhoto = (e: React.FormEvent) => handleAddItem(e, 'photos', { ...photoForm, isFeatured: false }, () => setPhotoForm({ url: '', caption: '' }));
    const onAddVideo = (e: React.FormEvent) => handleAddItem(e, 'videos', videoForm, () => setVideoForm({ videoId: '', title: '' }));
    const onAddMusic = (e: React.FormEvent) => handleAddItem(e, 'music', musicForm, () => setMusicForm({ title: '', subtitle: '', link: '', albumArtUrl: '' }));
    const onAddArt = (e: React.FormEvent) => handleAddItem(e, 'art', artForm, () => setArtForm({ title: '', imageUrl: '', description: '' }));
    const onAddBlog = (e: React.FormEvent) => handleAddItem(e, 'blog', blogForm, () => setBlogForm({ title: '', excerpt: '', content: '' }));

    // Feature/Delete Handlers
    const handleFeaturePhoto = async (id: string) => {
        if (!isAuthorized) return;
        setLoading(true);
        try {
            const batchUpdates = photos.filter(p => p.isFeatured).map(p => 
                updateDoc(doc(db, `artifacts/${appId}/public/data/photos`, p.id), { isFeatured: false })
            );
            await Promise.all(batchUpdates);
            await updateDoc(doc(db, `artifacts/${appId}/public/data/photos`, id), { isFeatured: true });
            setMessage('Photo featured!');
        } finally { setLoading(false); }
    };

    const handleDelete = async (collectionName: string, id: string) => {
        if (!isAuthorized || !confirm("Delete this item?")) return;
        setLoading(true);
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/${collectionName}`, id));
            setMessage('Item deleted.');
        } finally { setLoading(false); }
    };

    if (!authReady) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500">Initializing...</div>;
    
    if (!userId || isAnonymous) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
                 <LoginForm auth={auth} setUserId={setUserId} setAuthError={setAuthError} loginLoading={loginLoading} setLoginLoading={setLoginLoading} />
                {authError && <p className="text-center text-red-500 mt-4">{authError}</p>}
            </div>
        );
    }

    const tabClass = (tab: string) => `pb-2 px-2 font-bold text-lg transition-colors ${activeTab === tab ? 'border-b-2 border-amber-500 text-amber-500' : 'text-slate-400 hover:text-white'}`;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
            <header className="pb-8 border-b border-slate-800 mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tighter text-white">THE <span className="text-amber-500">GOGFATHER</span> ADMIN</h1>
                    <p className="text-slate-400 mt-1">Status: <span className="text-green-400">Authorized</span></p>
                </div>
                <div className='flex space-x-3'>
                    <button onClick={handleLogout} className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 rounded-full transition-colors">Logout</button>
                    <a href="/" className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-full transition-colors">&larr; Back to Site</a>
                </div>
            </header>

            {permissionError && (
                <div className="bg-red-900/80 border border-red-500 text-white p-4 rounded-lg mb-8 shadow-lg">
                    <h3 className="font-bold text-lg mb-1">⚠️ Access Denied to Database</h3>
                    <p>{permissionError}</p>
                </div>
            )}

            {/* TABS */}
            <div className="flex space-x-6 mb-8 border-b border-slate-800 overflow-x-auto">
                <button onClick={() => setActiveTab('photos')} className={tabClass('photos')}>Photos</button>
                <button onClick={() => setActiveTab('videos')} className={tabClass('videos')}>Videos</button>
                <button onClick={() => setActiveTab('music')} className={tabClass('music')}>Music</button>
                <button onClick={() => setActiveTab('art')} className={tabClass('art')}>Art</button>
                <button onClick={() => setActiveTab('blog')} className={tabClass('blog')}>Blog</button>
            </div>

            {message && <div className="p-4 rounded mb-6 bg-slate-800 border border-slate-600">{message}</div>}

            {/* PHOTOS TAB */}
            {activeTab === 'photos' && (
                <>
                    <section className="mb-12 bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <h2 className="text-xl font-bold text-amber-500 mb-4">Add Photo</h2>
                        <form onSubmit={onAddPhoto} className="space-y-4">
                            <input type="url" required placeholder="Image URL" value={photoForm.url} onChange={(e) => setPhotoForm({...photoForm, url: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white" />
                            <input type="text" required placeholder="Caption" value={photoForm.caption} onChange={(e) => setPhotoForm({...photoForm, caption: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white" />
                            <button type="submit" disabled={loading} className="w-full py-3 bg-amber-600 text-black font-bold rounded-md">Add Photo</button>
                        </form>
                    </section>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {photos.map(photo => (
                            <div key={photo.id} className={`flex items-center p-4 rounded-xl border ${photo.isFeatured ? 'border-amber-500 bg-amber-900/10' : 'border-slate-800 bg-slate-900'}`}>
                                <img src={photo.url} className="w-16 h-16 object-cover rounded-lg mr-4" />
                                <div className="flex-grow"><p className="font-bold text-white">{photo.caption}</p></div>
                                <div className="flex flex-col space-y-2">
                                    {!photo.isFeatured && <button onClick={() => handleFeaturePhoto(photo.id)} className="text-xs bg-slate-700 px-2 py-1 rounded">Feature</button>}
                                    <button onClick={() => handleDelete('photos', photo.id)} className="text-xs bg-red-900 text-white px-2 py-1 rounded">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* VIDEOS TAB */}
            {activeTab === 'videos' && (
                <>
                    <section className="mb-12 bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <h2 className="text-xl font-bold text-amber-500 mb-4">Add Video</h2>
                        <form onSubmit={onAddVideo} className="space-y-4">
                            <input type="text" required placeholder="YouTube ID (e.g. dQw4w9WgXcQ)" value={videoForm.videoId} onChange={(e) => setVideoForm({...videoForm, videoId: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white" />
                            <input type="text" required placeholder="Title" value={videoForm.title} onChange={(e) => setVideoForm({...videoForm, title: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white" />
                            <button type="submit" disabled={loading} className="w-full py-3 bg-amber-600 text-black font-bold rounded-md">Add Video</button>
                        </form>
                    </section>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {videos.map(video => (
                            <div key={video.id} className="flex items-center p-4 rounded-xl border border-slate-800 bg-slate-900">
                                <div className="flex-grow"><p className="font-bold text-white">{video.title}</p><p className="text-xs text-slate-500">{video.videoId}</p></div>
                                <button onClick={() => handleDelete('videos', video.id)} className="text-xs bg-red-900 text-white px-2 py-1 rounded">Delete</button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* MUSIC TAB */}
            {activeTab === 'music' && (
                <>
                    <section className="mb-12 bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <h2 className="text-xl font-bold text-amber-500 mb-4">Add Music Track</h2>
                        <form onSubmit={onAddMusic} className="space-y-4">
                            <input type="text" required placeholder="Track Title" value={musicForm.title} onChange={(e) => setMusicForm({...musicForm, title: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white" />
                            <input type="text" required placeholder="Subtitle (e.g. Original Mix)" value={musicForm.subtitle} onChange={(e) => setMusicForm({...musicForm, subtitle: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white" />
                            <input type="url" required placeholder="Link (Soundcloud/Spotify)" value={musicForm.link} onChange={(e) => setMusicForm({...musicForm, link: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white" />
                            <input type="url" placeholder="Album Art URL (Optional)" value={musicForm.albumArtUrl} onChange={(e) => setMusicForm({...musicForm, albumArtUrl: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white" />
                            <button type="submit" disabled={loading} className="w-full py-3 bg-amber-600 text-black font-bold rounded-md">Add Track</button>
                        </form>
                    </section>
                    <div className="space-y-4">
                        {music.map(track => (
                            <div key={track.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900">
                                <div className="flex items-center">
                                    {track.albumArtUrl && <img src={track.albumArtUrl} className="w-12 h-12 rounded-md mr-4 object-cover" alt="Album Art" />}
                                    <div>
                                        <p className="font-bold text-white">{track.title}</p>
                                        <p className="text-sm text-slate-400">{track.subtitle}</p>
                                        <a href={track.link} target="_blank" className="text-xs text-amber-500 hover:underline">{track.link}</a>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete('music', track.id)} className="text-xs bg-red-900 text-white px-3 py-2 rounded">Delete</button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ART TAB */}
            {activeTab === 'art' && (
                <>
                    <section className="mb-12 bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <h2 className="text-xl font-bold text-amber-500 mb-4">Add Art Piece</h2>
                        <form onSubmit={onAddArt} className="space-y-4">
                            <input type="text" required placeholder="Title" value={artForm.title} onChange={(e) => setArtForm({...artForm, title: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white" />
                            <input type="url" required placeholder="Image URL" value={artForm.imageUrl} onChange={(e) => setArtForm({...artForm, imageUrl: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white" />
                            <textarea required placeholder="Description" value={artForm.description} onChange={(e) => setArtForm({...artForm, description: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white h-24" />
                            <button type="submit" disabled={loading} className="w-full py-3 bg-amber-600 text-black font-bold rounded-md">Add Art</button>
                        </form>
                    </section>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {art.map(piece => (
                            <div key={piece.id} className="flex items-start p-4 rounded-xl border border-slate-800 bg-slate-900">
                                <img src={piece.imageUrl} className="w-20 h-20 object-cover rounded mr-4" />
                                <div className="flex-grow"><p className="font-bold text-white">{piece.title}</p><p className="text-xs text-slate-400 line-clamp-2">{piece.description}</p></div>
                                <button onClick={() => handleDelete('art', piece.id)} className="text-xs bg-red-900 text-white px-2 py-1 rounded ml-2">Delete</button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* BLOG TAB */}
            {activeTab === 'blog' && (
                <>
                    <section className="mb-12 bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <h2 className="text-xl font-bold text-amber-500 mb-4">Add Blog Post</h2>
                        <form onSubmit={onAddBlog} className="space-y-4">
                            <input type="text" required placeholder="Title" value={blogForm.title} onChange={(e) => setBlogForm({...blogForm, title: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white" />
                            <input type="text" required placeholder="Excerpt (Short Summary)" value={blogForm.excerpt} onChange={(e) => setBlogForm({...blogForm, excerpt: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white" />
                            <textarea required placeholder="Content" value={blogForm.content} onChange={(e) => setBlogForm({...blogForm, content: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-white h-48" />
                            <button type="submit" disabled={loading} className="w-full py-3 bg-amber-600 text-black font-bold rounded-md">Publish Post</button>
                        </form>
                    </section>
                    <div className="space-y-4">
                        {blogPosts.map(post => (
                            <div key={post.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-white text-lg">{post.title}</h3>
                                    <button onClick={() => handleDelete('blog', post.id)} className="text-xs bg-red-900 text-white px-3 py-1 rounded">Delete</button>
                                </div>
                                <p className="text-sm text-slate-400 mb-2">{post.excerpt}</p>
                                <p className="text-xs text-slate-600">{new Date(post.timestamp?.toDate()).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}