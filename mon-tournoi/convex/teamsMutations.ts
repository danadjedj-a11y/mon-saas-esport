/**
 * MUTATIONS POUR LES ÉQUIPES
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Crée une nouvelle équipe
 */
export const create = mutation({
    args: {
        name: v.string(),
        tag: v.string(),
        logoUrl: v.optional(v.string()),
        isTemporary: v.boolean(),
        tournamentId: v.optional(v.id("tournaments")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        // Validation
        if (args.tag.length < 2 || args.tag.length > 5) {
            throw new Error("Le tag doit faire entre 2 et 5 caractères");
        }

        // Vérifie que le tag n'est pas déjà pris
        const existingTag = await ctx.db
            .query("teams")
            .filter((q) => q.eq(q.field("tag"), args.tag))
            .first();

        if (existingTag) {
            throw new Error("Ce tag est déjà utilisé");
        }

        // Crée l'équipe
        const now = Date.now();
        const teamId = await ctx.db.insert("teams", {
            name: args.name,
            tag: args.tag,
            logoUrl: args.logoUrl,
            captainId: user._id,
            isTemporary: args.isTemporary,
            tournamentId: args.tournamentId,
            createdAt: now,
        });

        // Ajoute le créateur comme capitaine
        await ctx.db.insert("teamMembers", {
            teamId,
            userId: user._id,
            role: "captain",
            joinedAt: now,
        });

        return teamId;
    },
});

/**
 * Invite un utilisateur dans une équipe
 */
export const invite = mutation({
    args: {
        teamId: v.id("teams"),
        inviteeId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        const team = await ctx.db.get(args.teamId);
        if (!team) {
            throw new Error("Équipe non trouvée");
        }

        // Vérifie que l'utilisateur est capitaine
        if (team.captainId !== user._id) {
            throw new Error("Seul le capitaine peut inviter des membres");
        }

        // Vérifie que l'invité n'est pas déjà membre
        const existingMember = await ctx.db
            .query("teamMembers")
            .withIndex("by_team_and_user", (q) =>
                q.eq("teamId", args.teamId).eq("userId", args.inviteeId)
            )
            .first();

        if (existingMember) {
            throw new Error("Cet utilisateur est déjà membre de l'équipe");
        }

        // Vérifie qu'il n'y a pas déjà une invitation en attente
        const existingInvitation = await ctx.db
            .query("teamInvitations")
            .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("inviteeId"), args.inviteeId),
                    q.eq(q.field("status"), "pending")
                )
            )
            .first();

        if (existingInvitation) {
            throw new Error("Une invitation est déjà en attente pour cet utilisateur");
        }

        // Crée l'invitation
        const invitationId = await ctx.db.insert("teamInvitations", {
            teamId: args.teamId,
            inviterId: user._id,
            inviteeId: args.inviteeId,
            status: "pending",
            createdAt: Date.now(),
        });

        // Crée une notification
        await ctx.db.insert("notifications", {
            userId: args.inviteeId,
            type: "team_invitation",
            title: "Invitation d'équipe",
            message: `${user.username} vous invite à rejoindre ${team.name}`,
            relatedTeamId: args.teamId,
            read: false,
            createdAt: Date.now(),
        });

        return invitationId;
    },
});

/**
 * Accepte ou refuse une invitation
 */
export const respondToInvitation = mutation({
    args: {
        invitationId: v.id("teamInvitations"),
        accept: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        const invitation = await ctx.db.get(args.invitationId);
        if (!invitation) {
            throw new Error("Invitation non trouvée");
        }

        if (invitation.inviteeId !== user._id) {
            throw new Error("Cette invitation ne vous est pas destinée");
        }

        if (invitation.status !== "pending") {
            throw new Error("Cette invitation a déjà été traitée");
        }

        // Met à jour l'invitation
        await ctx.db.patch(args.invitationId, {
            status: args.accept ? "accepted" : "declined",
        });

        // Si acceptée, ajoute le membre à l'équipe
        if (args.accept) {
            await ctx.db.insert("teamMembers", {
                teamId: invitation.teamId,
                userId: user._id,
                role: "member",
                joinedAt: Date.now(),
            });
        }

        return { success: true };
    },
});

/**
 * Retire un membre d'une équipe
 */
export const removeMember = mutation({
    args: {
        teamId: v.id("teams"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!currentUser) {
            throw new Error("Utilisateur non trouvé");
        }

        const team = await ctx.db.get(args.teamId);
        if (!team) {
            throw new Error("Équipe non trouvée");
        }

        // Vérifie les permissions (capitaine ou soi-même)
        if (team.captainId !== currentUser._id && args.userId !== currentUser._id) {
            throw new Error("Vous n'avez pas la permission de retirer ce membre");
        }

        // Ne peut pas retirer le capitaine
        if (args.userId === team.captainId) {
            throw new Error("Le capitaine ne peut pas être retiré");
        }

        // Trouve et supprime le membership
        const membership = await ctx.db
            .query("teamMembers")
            .withIndex("by_team_and_user", (q) =>
                q.eq("teamId", args.teamId).eq("userId", args.userId)
            )
            .first();

        if (!membership) {
            throw new Error("Membre non trouvé");
        }

        await ctx.db.delete(membership._id);

        return { success: true };
    },
});

/**
 * Supprime une équipe
 */
export const remove = mutation({
    args: { teamId: v.id("teams") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        const team = await ctx.db.get(args.teamId);
        if (!team) {
            throw new Error("Équipe non trouvée");
        }

        // Vérifie que l'utilisateur est capitaine
        if (team.captainId !== user._id) {
            throw new Error("Seul le capitaine peut supprimer l'équipe");
        }

        // Vérifie que l'équipe n'est pas inscrite à un tournoi en cours
        const registrations = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
            .collect();

        const activeRegistrations = registrations.filter(
            (r) => r.status === "confirmed" || r.status === "checked_in"
        );

        if (activeRegistrations.length > 0) {
            throw new Error("Impossible de supprimer une équipe inscrite à un tournoi actif");
        }

        // Supprime tous les membres
        const members = await ctx.db
            .query("teamMembers")
            .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
            .collect();

        for (const member of members) {
            await ctx.db.delete(member._id);
        }

        // Supprime toutes les invitations
        const invitations = await ctx.db
            .query("teamInvitations")
            .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
            .collect();

        for (const invitation of invitations) {
            await ctx.db.delete(invitation._id);
        }

        // Supprime l'équipe
        await ctx.db.delete(args.teamId);

        return { success: true };
    },
});

/**
 * Met à jour une équipe
 */
export const update = mutation({
    args: {
        teamId: v.id("teams"),
        name: v.optional(v.string()),
        tag: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        const team = await ctx.db.get(args.teamId);
        if (!team) {
            throw new Error("Équipe non trouvée");
        }

        if (team.captainId !== user._id) {
            throw new Error("Seul le capitaine peut modifier l'équipe");
        }

        const updates: any = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.tag !== undefined) updates.tag = args.tag;
        if (args.logoUrl !== undefined) updates.logoUrl = args.logoUrl;

        await ctx.db.patch(args.teamId, updates);
        return { success: true };
    },
});

/**
 * Met à jour le rôle d'un membre
 */
export const updateMemberRole = mutation({
    args: {
        teamId: v.id("teams"),
        userId: v.id("users"),
        role: v.union(
            v.literal("member"),
            v.literal("player"),
            v.literal("manager"),
            v.literal("coach")
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!currentUser) {
            throw new Error("Utilisateur non trouvé");
        }

        const team = await ctx.db.get(args.teamId);
        if (!team) {
            throw new Error("Équipe non trouvée");
        }

        if (team.captainId !== currentUser._id) {
            throw new Error("Seul le capitaine peut modifier les rôles");
        }

        // Trouver le membre
        const membership = await ctx.db
            .query("teamMembers")
            .withIndex("by_team_and_user", (q) =>
                q.eq("teamId", args.teamId).eq("userId", args.userId)
            )
            .first();

        if (!membership) {
            throw new Error("Membre non trouvé");
        }

        // Ne peut pas changer le rôle du capitaine
        if (args.userId === team.captainId) {
            throw new Error("Impossible de modifier le rôle du capitaine");
        }

        await ctx.db.patch(membership._id, { role: args.role });
        return { success: true };
    },
});

/**
 * Alias pour invite (utilisé par les composants React)
 */
export const inviteMember = mutation({
    args: {
        teamId: v.id("teams"),
        inviteeId: v.id("users"),
        message: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        const team = await ctx.db.get(args.teamId);
        if (!team) {
            throw new Error("Équipe non trouvée");
        }

        // Vérifie que l'utilisateur a la permission
        const membership = await ctx.db
            .query("teamMembers")
            .withIndex("by_team_and_user", (q) =>
                q.eq("teamId", args.teamId).eq("userId", user._id)
            )
            .first();

        if (!membership) {
            throw new Error("Vous n'êtes pas membre de cette équipe");
        }

        const canInvite = team.captainId === user._id ||
            membership.role === "manager" ||
            membership.role === "coach";

        if (!canInvite) {
            throw new Error("Vous n'avez pas la permission d'inviter des membres");
        }

        // Vérifie que l'invité n'est pas déjà membre
        const existingMember = await ctx.db
            .query("teamMembers")
            .withIndex("by_team_and_user", (q) =>
                q.eq("teamId", args.teamId).eq("userId", args.inviteeId)
            )
            .first();

        if (existingMember) {
            throw new Error("Cet utilisateur est déjà membre de l'équipe");
        }

        // Vérifie qu'il n'y a pas déjà une invitation en attente
        const existingInvitation = await ctx.db
            .query("teamInvitations")
            .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("inviteeId"), args.inviteeId),
                    q.eq(q.field("status"), "pending")
                )
            )
            .first();

        if (existingInvitation) {
            throw new Error("Une invitation est déjà en attente pour cet utilisateur");
        }

        // Crée l'invitation
        const invitationId = await ctx.db.insert("teamInvitations", {
            teamId: args.teamId,
            inviterId: user._id,
            inviteeId: args.inviteeId,
            message: args.message,
            status: "pending",
            createdAt: Date.now(),
        });

        // Crée une notification
        await ctx.db.insert("notifications", {
            userId: args.inviteeId,
            type: "team_invitation",
            title: "Invitation d'équipe",
            message: `${user.username} vous invite à rejoindre ${team.name}`,
            relatedTeamId: args.teamId,
            read: false,
            createdAt: Date.now(),
        });

        return invitationId;
    },
});

/**
 * Accepte une invitation (alias pour respondToInvitation avec accept=true)
 */
export const acceptInvitation = mutation({
    args: { invitationId: v.id("teamInvitations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        const invitation = await ctx.db.get(args.invitationId);
        if (!invitation) {
            throw new Error("Invitation non trouvée");
        }

        if (invitation.inviteeId !== user._id) {
            throw new Error("Cette invitation ne vous est pas destinée");
        }

        if (invitation.status !== "pending") {
            throw new Error("Cette invitation a déjà été traitée");
        }

        // Met à jour l'invitation
        await ctx.db.patch(args.invitationId, { status: "accepted" });

        // Ajoute le membre à l'équipe
        await ctx.db.insert("teamMembers", {
            teamId: invitation.teamId,
            userId: user._id,
            role: "player",
            joinedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Refuse une invitation (alias pour respondToInvitation avec accept=false)
 */
export const declineInvitation = mutation({
    args: { invitationId: v.id("teamInvitations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        const invitation = await ctx.db.get(args.invitationId);
        if (!invitation) {
            throw new Error("Invitation non trouvée");
        }

        if (invitation.inviteeId !== user._id) {
            throw new Error("Cette invitation ne vous est pas destinée");
        }

        if (invitation.status !== "pending") {
            throw new Error("Cette invitation a déjà été traitée");
        }

        // Met à jour l'invitation
        await ctx.db.patch(args.invitationId, { status: "declined" });

        return { success: true };
    },
});
