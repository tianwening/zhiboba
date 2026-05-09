import { syncSportsContent } from "../../lib/sportsSync.js";

export default async () => {
  const result = await syncSportsContent();

  return new Response(JSON.stringify(result), {
    headers: { "content-type": "application/json; charset=utf-8" },
    status: result.status === "failed" ? 500 : 200,
  });
};

export const config = {
  schedule: "@hourly",
};
