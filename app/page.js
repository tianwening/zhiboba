import HomeClient from "./HomeClient";
import { listArticles, listMatches, listVideos } from "../lib/sportsData.js";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [matches, news, videos] = await Promise.all([
    listMatches({ date: "today" }),
    listArticles({}),
    listVideos({}),
  ]);

  return (
    <HomeClient
      initialMatches={matches}
      initialNews={news}
      initialVideos={videos}
      initialUpdatedAt={new Date().toISOString()}
    />
  );
}
