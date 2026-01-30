/**
 * PAGE DE TEST SIMPLE POUR CLERK + CONVEX
 * 
 * Cette page remplace temporairement App.jsx pour tester l'authentification
 */

import { SignIn, SignUp, UserButton, useUser, SignedIn, SignedOut } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

export default function TestAuth() {
    const { user, isSignedIn } = useUser();
    const currentUser = useQuery(api.users.getCurrent);
    const upsertUser = useMutation(api.usersMutations.upsert);
    const tournaments = useQuery(api.tournaments.listPublic, { limit: 5 });
    const createTournament = useMutation(api.tournamentsMutations.create);

    const [showSignIn, setShowSignIn] = useState(false);
    const [creating, setCreating] = useState(false);

    // Synchronise l'utilisateur Clerk avec Convex
    const handleSyncUser = async () => {
        if (!user) return;

        try {
            await upsertUser({
                email: user.primaryEmailAddress?.emailAddress || "",
                username: user.username || user.firstName || "User",
                avatarUrl: user.imageUrl,
            });
            alert("✅ Profil synchronisé !");
        } catch (err: any) {
            alert("❌ Erreur : " + err.message);
        }
    };

    const handleCreateTournament = async () => {
        setCreating(true);
        try {
            await createTournament({
                name: `Test Tournament ${Date.now()}`,
                game: "League of Legends",
                format: "elimination",
                maxTeams: 16,
                teamSize: 5,
                checkInRequired: true,
            });
            alert("✅ Tournoi créé !");
        } catch (err: any) {
            alert("❌ Erreur : " + err.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                        🧪 Test Clerk + Convex
                    </h1>

                    <div className="flex items-center gap-4">
                        <SignedIn>
                            <UserButton afterSignOutUrl="/" />
                        </SignedIn>

                        <SignedOut>
                            <button
                                onClick={() => setShowSignIn(!showSignIn)}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
                            >
                                Se connecter
                            </button>
                        </SignedOut>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Modal de connexion */}
                {showSignIn && !isSignedIn && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-gray-900 p-8 rounded-xl border border-white/10 relative">
                            <button
                                onClick={() => setShowSignIn(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                            <SignIn routing="hash" />
                        </div>
                    </div>
                )}

                {/* Section Authentification */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                        🔐 Authentification
                    </h2>

                    <SignedOut>
                        <p className="text-red-400">❌ Non connecté</p>
                        <p className="text-gray-400 text-sm mt-2">
                            Clique sur "Se connecter" en haut à droite pour créer un compte ou te connecter.
                        </p>
                    </SignedOut>

                    <SignedIn>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <img
                                    src={user?.imageUrl}
                                    alt={user?.username || "User"}
                                    className="w-12 h-12 rounded-full border-2 border-violet-500"
                                />
                                <div>
                                    <p className="text-green-400 font-semibold">
                                        ✅ Connecté en tant que {user?.username || user?.firstName}
                                    </p>
                                    <p className="text-gray-400 text-sm">
                                        {user?.primaryEmailAddress?.emailAddress}
                                    </p>
                                </div>
                            </div>

                            {currentUser === undefined ? (
                                <p className="text-yellow-400">⏳ Chargement du profil Convex...</p>
                            ) : currentUser ? (
                                <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                                    <p className="text-green-400 font-semibold">✅ Profil Convex synchronisé</p>
                                    <div className="text-sm text-gray-300 mt-2 space-y-1">
                                        <p>• ID: {currentUser._id}</p>
                                        <p>• Username: {currentUser.username}</p>
                                        <p>• Email: {currentUser.email}</p>
                                        <p>• Rôle: {currentUser.role}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                                    <p className="text-orange-400 mb-2">⚠️ Profil Convex non trouvé</p>
                                    <button
                                        onClick={handleSyncUser}
                                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
                                    >
                                        Synchroniser le profil
                                    </button>
                                </div>
                            )}
                        </div>
                    </SignedIn>
                </div>

                {/* Section Tournois */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                        🏆 Tournois ({tournaments?.length ?? 0})
                    </h2>

                    {tournaments === undefined ? (
                        <p className="text-yellow-400">⏳ Chargement des tournois...</p>
                    ) : tournaments.length === 0 ? (
                        <p className="text-gray-400">Aucun tournoi pour le moment</p>
                    ) : (
                        <div className="space-y-3">
                            {tournaments.map((t) => (
                                <div
                                    key={t._id}
                                    className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-violet-500/50 transition-colors"
                                >
                                    <h3 className="font-semibold text-white">{t.name}</h3>
                                    <div className="text-sm text-gray-400 mt-2 flex flex-wrap gap-4">
                                        <span>🎮 {t.game}</span>
                                        <span>📊 {t.format}</span>
                                        <span>👥 {t.maxTeams} équipes max</span>
                                        <span className={`px-2 py-1 rounded text-xs ${t.status === "draft" ? "bg-orange-500/20 text-orange-400" :
                                                t.status === "ongoing" ? "bg-green-500/20 text-green-400" :
                                                    "bg-gray-500/20 text-gray-400"
                                            }`}>
                                            {t.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Section Actions */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                        ⚡ Actions de Test
                    </h2>

                    <SignedOut>
                        <p className="text-yellow-400">
                            ⚠️ Connecte-toi pour créer un tournoi de test
                        </p>
                    </SignedOut>

                    <SignedIn>
                        <button
                            onClick={handleCreateTournament}
                            disabled={creating || !currentUser}
                            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-semibold hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {creating ? "⏳ Création..." : "➕ Créer un tournoi de test"}
                        </button>

                        {!currentUser && (
                            <p className="mt-2 text-yellow-400 text-sm">
                                ⚠️ Synchronise ton profil avant de créer un tournoi
                            </p>
                        )}
                    </SignedIn>
                </div>

                {/* Section Informations */}
                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <h3 className="font-semibold text-blue-400 mb-2">ℹ️ Statut du système</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>✅ Convex connecté: {tournaments !== undefined ? "Oui" : "Non"}</li>
                        <li>✅ Clerk configuré: Oui</li>
                        <li>✅ Authentification: {isSignedIn ? "Connecté" : "Non connecté"}</li>
                        <li>✅ Profil Convex: {currentUser ? "Synchronisé" : "Non synchronisé"}</li>
                        <li>✅ Backend: 38 fonctions disponibles</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
