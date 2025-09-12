import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// Simple function to get a random number
export const getRandomNumber = query({
  args: {},
  returns: v.number(),
  handler: async (ctx, args) => {
    return Math.floor(Math.random() * 1000);
  },
});

// Simple authentication functions
export const signIn = mutation({
  args: { email: v.string(), password: v.string() },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    // In a real app, you would verify the password against a hashed version
    // For now, we'll just simulate successful authentication
    console.log(`Signing in user: ${args.email}`);
    
    return {
      success: true,
      message: "Sign in successful",
    };
  },
});

export const signInWithGoogle = mutation({
  args: { email: v.string() },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    // In a real app, you would verify the Google OAuth token
    // For now, we'll just simulate successful authentication
    console.log(`Signing in with Google: ${args.email}`);
    
    return {
      success: true,
      message: "Google sign in successful",
    };
  },
});
