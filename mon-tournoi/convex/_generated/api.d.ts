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
import type * as matches from "../matches.js";
import type * as matchesMutations from "../matchesMutations.js";
import type * as notifications from "../notifications.js";
import type * as registrations from "../registrations.js";
import type * as registrationsMutations from "../registrationsMutations.js";
import type * as teams from "../teams.js";
import type * as teamsMutations from "../teamsMutations.js";
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
  matches: typeof matches;
  matchesMutations: typeof matchesMutations;
  notifications: typeof notifications;
  registrations: typeof registrations;
  registrationsMutations: typeof registrationsMutations;
  teams: typeof teams;
  teamsMutations: typeof teamsMutations;
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
