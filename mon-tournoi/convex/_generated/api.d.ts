/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chat from "../chat.js";
import type * as follows from "../follows.js";
import type * as games from "../games.js";
import type * as gamification from "../gamification.js";
import type * as gamingAccounts from "../gamingAccounts.js";
import type * as matchVeto from "../matchVeto.js";
import type * as matches from "../matches.js";
import type * as matchesMutations from "../matchesMutations.js";
import type * as notifications from "../notifications.js";
import type * as playerGameAccounts from "../playerGameAccounts.js";
import type * as registrations from "../registrations.js";
import type * as registrationsMutations from "../registrationsMutations.js";
import type * as swissMutations from "../swissMutations.js";
import type * as teams from "../teams.js";
import type * as teamsMutations from "../teamsMutations.js";
import type * as tournamentPhases from "../tournamentPhases.js";
import type * as tournamentRegistrations from "../tournamentRegistrations.js";
import type * as tournamentRegistrationsMutations from "../tournamentRegistrationsMutations.js";
import type * as tournaments from "../tournaments.js";
import type * as tournamentsMutations from "../tournamentsMutations.js";
import type * as users from "../users.js";
import type * as usersMutations from "../usersMutations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chat: typeof chat;
  follows: typeof follows;
  games: typeof games;
  gamification: typeof gamification;
  gamingAccounts: typeof gamingAccounts;
  matchVeto: typeof matchVeto;
  matches: typeof matches;
  matchesMutations: typeof matchesMutations;
  notifications: typeof notifications;
  playerGameAccounts: typeof playerGameAccounts;
  registrations: typeof registrations;
  registrationsMutations: typeof registrationsMutations;
  swissMutations: typeof swissMutations;
  teams: typeof teams;
  teamsMutations: typeof teamsMutations;
  tournamentPhases: typeof tournamentPhases;
  tournamentRegistrations: typeof tournamentRegistrations;
  tournamentRegistrationsMutations: typeof tournamentRegistrationsMutations;
  tournaments: typeof tournaments;
  tournamentsMutations: typeof tournamentsMutations;
  users: typeof users;
  usersMutations: typeof usersMutations;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
