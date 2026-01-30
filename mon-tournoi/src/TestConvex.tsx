/**
 * COMPOSANT DE TEST CONVEX
 * 
 * Ce composant teste :
 * - Connexion à Convex
 * - Queries (listPublic)
 * - Mutations (create)
 * - Authentification Clerk
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { useState } from "react";

export default function TestConvex() {
    const { user, isSignedIn } = useUser();
    const currentUser = useQuery(api.users.getCurrent);
    const tournaments = useQuery(api.tournaments.listPublic, { limit: 10 });
    const createTournament = useMutation(api.tournamentsMutations.create);

    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreateTestTournament = async () => {
        if (!isSignedIn) {
            setError("Vous devez être connecté pour créer un tournoi");
            return;
        }

        setCreating(true);
        setError(null);

        try {
            const tournamentId = await createTournament({
                name: `Test Tournament ${Date.now()}`,
                game: "League of Legends",
                format: "elimination",
                maxTeams: 16,
                teamSize: 5,
                checkInRequired: true,
            });

            console.log("✅ Tournoi créé:", tournamentId);
            alert("Tournoi créé avec succès !");
        } catch (err: any) {
            console.error("❌ Erreur:", err);
            setError(err.message || "Erreur lors de la création");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-white">
                🧪 Test Convex + Clerk
            </h1>

            {/* Section Authentification */}
            <div className="glass-card mb-8 p-6">
                <h2 className="text-xl font-semibold mb-4 text-white">
                    🔐 Authentification
                </h2>

                {isSignedIn ? (
                    <div className="space-y-2">
                        <p className="text-green-400">✅ Connecté en tant que: {user?.primaryEmailAddress?.emailAddress}</p>
                        <p className="text-gray-300">Username: {user?.username || "Non défini"}</p>

                        {currentUser === undefined ? (
                            <p className="text-yellow-400">⏳ Chargement du profil Convex...</p>
                        ) : currentUser ? (
                            <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded">
                                <p className="text-green-400">✅ Profil Convex trouvé</p>
                                <p className="text-sm text-gray-300">ID: {currentUser._id}</p>
                                <p className="text-sm text-gray-300">Username: {currentUser.username}</p>
                                <p className="text-sm text-gray-300">Rôle: {currentUser.role}</p>
                            </div>
                        ) : (
                            <p className="text-orange-400">⚠️ Profil Convex non trouvé (sera créé automatiquement)</p>
                        )}
                    </div>
                ) : (
                    <p className="text-red-400">❌ Non connecté</p>
                )}
            </div>

            {/* Section Tournois */}
            <div className="glass-card mb-8 p-6">
                <h2 className="text-xl font-semibold mb-4 text-white">
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
                                className="p-4 bg-white/5 border border-white/10 rounded-lg"
                            >
                                <h3 className="font-semibold text-white">{t.name}</h3>
                                <div className="text-sm text-gray-400 mt-1">
                                    <span className="mr-4">🎮 {t.game}</span>
                                    <span className="mr-4">📊 {t.format}</span>
                                    <span className="mr-4">👥 {t.maxTeams} équipes max</span>
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
            <div className="glass-card p-6">
                <h2 className="text-xl font-semibold mb-4 text-white">
                    ⚡ Actions de Test
                </h2>

                <button
                    onClick={handleCreateTestTournament}
                    disabled={!isSignedIn || creating}
                    className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-semibold hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {creating ? "⏳ Création..." : "➕ Créer un tournoi de test"}
                </button>

                {error && (
                    <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded">
                        <p className="text-red-400">❌ {error}</p>
                    </div>
                )}

                {!isSignedIn && (
                    <p className="mt-4 text-yellow-400">
                        ⚠️ Vous devez être connecté pour créer un tournoi
                    </p>
                )}
            </div>

            {/* Section Informations */}
            <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded">
                <h3 className="font-semibold text-blue-400 mb-2">ℹ️ Informations</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                    <li>✅ Convex connecté: {tournaments !== undefined ? "Oui" : "Non"}</li>
                    <li>✅ Clerk configuré: {isSignedIn !== undefined ? "Oui" : "Non"}</li>
                    <li>✅ Schema déployé: 17 tables</li>
                    <li>✅ Queries disponibles: tournaments, users</li>
                    <li>✅ Mutations disponibles: create, upsert, updateProfile</li>
                </ul>
            </div>
        </div>
    );
}
