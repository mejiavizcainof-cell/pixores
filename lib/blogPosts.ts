import { coreGuides } from "@/lib/coreGuides";
import { trafficGrowthPostsPart1 } from "@/lib/trafficGrowthPostsPart1";
import { trafficGrowthPostsPart2 } from "@/lib/trafficGrowthPostsPart2";
import { historyPostsPart1 } from "@/lib/historyPostsPart1";
import { historyPostsPart2 } from "@/lib/historyPostsPart2";

export const blogPosts = [
  ...coreGuides,
  ...historyPostsPart1,
  ...historyPostsPart2,
  ...trafficGrowthPostsPart1,
  ...trafficGrowthPostsPart2,
];
