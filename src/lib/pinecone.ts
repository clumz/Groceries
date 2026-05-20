import { Pinecone } from "@pinecone-database/pinecone";

let _pc: Pinecone | null = null;

export function getPinecone(): Pinecone {
  if (!_pc) {
    _pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  }
  return _pc;
}

export function getRecipeIndex() {
  return getPinecone().index(process.env.PINECONE_INDEX_NAME!);
}

export async function embedText(text: string): Promise<number[]> {
  const pc = getPinecone();
  const result = await pc.inference.embed({
    model: "llama-text-embed-v2",
    inputs: [text],
    parameters: { inputType: "query", truncate: "END" },
  });
  const embedding = result.data[0];
  if (!embedding || embedding.vectorType !== "dense") {
    throw new Error("No dense embedding returned");
  }
  return (embedding as { vectorType: "dense"; values: number[] }).values;
}

export function recipeToText(recipe: {
  name: string;
  description: string;
  cuisine: string;
  primaryProtein?: string | null;
  tags: string[];
  difficulty: string;
}): string {
  return [
    recipe.name,
    recipe.description,
    `Cuisine: ${recipe.cuisine}`,
    recipe.primaryProtein ? `Protein: ${recipe.primaryProtein}` : "",
    `Tags: ${recipe.tags.join(", ")}`,
    `Difficulty: ${recipe.difficulty}`,
  ]
    .filter(Boolean)
    .join(". ");
}
