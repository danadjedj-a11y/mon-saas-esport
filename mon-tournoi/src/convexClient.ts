import { ConvexReactClient } from "convex/react";

// Client Convex configuré avec l'URL de ton déploiement
const convex = new ConvexReactClient(
    (import.meta as any).env.VITE_CONVEX_URL as string
);

export default convex;
