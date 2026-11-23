import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      id: user._id as string,
      name: typeof user.name === "string" ? user.name : "",
      email: typeof user.email === "string" ? user.email : "",
    };
  },
});
