export type CatchMindCategory = {
  key: string;
  label: string;
  difficulty: "easy" | "normal" | "hard";
  words: string[];
};

export const categories: CatchMindCategory[] = [
  // ...
];