import type { DietaryRequirement, Recipe } from "@/types";

// Decides diet suitability from a recipe's ingredients rather than its tags,
// which are too sparse to rely on (only a handful of recipes are tagged).
// Each check is a pattern of disqualifying words plus "safe" phrases removed
// first, so e.g. coconut milk isn't dairy and eggplant isn't egg.

interface Rule {
  bad: RegExp;
  safe?: RegExp;
}

const w = (words: string[], inWord: string[] = []) =>
  new RegExp(
    [`\\b(${words.join("|")})\\b`, ...(inWord.length ? [`(${inWord.join("|")})`] : [])].join("|"),
    "i"
  );

const MEAT: Rule = {
  bad: w([
    "chicken", "beef", "pork", "lamb", "mutton", "goat", "veal", "venison", "kangaroo", "duck", "turkey",
    "bacon", "ham", "prosciutto", "salami", "chorizo", "sausages?", "mince", "pancetta", "speck", "guanciale",
    "pepperoni", "mortadella", "steaks?", "brisket", "ribs", "lard", "liver", "bone broth", "gelatine?",
  ]),
};
const SEAFOOD: Rule = {
  bad: w([
    "fish", "salmon", "tuna", "prawns?", "shrimps?", "cod", "barramundi", "snapper", "flathead", "kingfish",
    "trout", "mackerel", "sardines?", "anchov(y|ies)", "whitebait", "hake", "tilapia", "squid", "calamari",
    "octopus", "mussels?", "clams?", "oysters?", "crabs?", "lobsters?", "scallops?", "crayfish", "roe", "caviar",
    "seafood", "bonito", "katsuobushi", "dashi", "worcestershire",
  ]),
};
const SHELLFISH: Rule = {
  bad: w(["prawns?", "shrimps?", "squid", "calamari", "octopus", "mussels?", "clams?", "oysters?", "crabs?", "lobsters?", "scallops?", "crayfish", "seafood"]),
};
const DAIRY: Rule = {
  bad: w([
    "milk", "cheese", "butter", "buttermilk", "cream", "creme fraiche", "crème fraîche", "yogh?urt", "ghee",
    "parmesan", "parmigiano", "pecorino", "feta", "mozzarella", "burrata", "ricotta", "hall?oumi", "cheddar",
    "mascarpone", "paneer", "gruyere", "brie", "whey", "custard", "ice cream", "labneh",
    "white chocolate", "milk chocolate",
  ],
  // Also inside run-together words in the imported data ("greek-styleyogurt", "labnehor").
  ["yogh?urt", "cheese", "labneh"]),
  safe: /\bcheesecloth\b|\b(coconut|almond|oat|soy|soya|rice|cashew|plant[- ]based|vegan|dairy[- ]free) (milk|cream|yogh?urt|cheese|butter)\b|\bcoconut cream\b|\b(peanut|almond|cashew|nut|apple) butter\b|\bbutter ?beans?\b|\bbutternut\b|\bcream of tartar\b|\bcream crackers?\b/gi,
};
const EGG: Rule = { bad: w(["eggs?", "egg yolks?", "egg whites?", "mayonnaise", "mayo", "aioli", "meringue"]), safe: /\b(egg[- ]free|vegan mayo(nnaise)?)\b/gi };
const HONEY: Rule = { bad: w(["honey"]) };
const GLUTEN: Rule = {
  bad: w([
    "flour", "bread", "breadcrumbs?", "panko", "pasta", "spaghetti", "linguine", "fettuccine", "penne", "rigatoni",
    "macaroni", "lasagne", "lasagna", "orzo", "gnocchi", "noodles?", "udon", "ramen", "soba", "couscous", "barley",
    "bulgur", "burghul", "freekeh", "farro", "spelt", "rye", "semolina", "wheat", "seitan", "tortillas?", "wraps?",
    "pitas?", "naan", "buns?", "rolls", "pastry", "crackers?", "biscuits?", "beer", "malt", "oats", "rolled oats",
    "soy sauce", "hoisin", "teriyaki", "oyster sauce",
  ],
  // Compounds such as "flatbreads", "cornbread", "lo mein noodles".
  ["bread", "noodle"]),
  safe: /\b(gluten[- ]free [\w-]+( [\w-]+)?|rice (flour|noodles?|paper|vermicelli)( noodles?)?|([\w-]+ )?(shirataki|glass|kelp|konjac|bean thread|sweet potato) noodles?|corn ?flour|cornstarch|tapioca flour|potato flour|chickpea flour|besan|almond flour|buckwheat (flour|noodles?)|corn tortillas?|lettuce wraps?|rice wraps?|tamari)\b/gi,
};
const NUTS: Rule = {
  bad: w([
    "nuts?", "peanuts?", "almonds?", "cashews?", "walnuts?", "pecans?", "pistachios?", "hazelnuts?", "macadamias?",
    "pine nuts?", "brazil nuts?", "satay", "praline", "marzipan", "nutella", "frangipane", "dukkah",
  ]),
  safe: /\bnutmeg\b/gi,
};
const ALCOHOL: Rule = {
  bad: w(["wine", "beer", "sake", "mirin", "rum", "brandy", "vodka", "whisk(e)?y", "bourbon", "sherry", "port", "liqueur", "cognac", "marsala", "cider", "champagne", "stout", "shaoxing", "tequila", "gin"]),
  safe: /\b((red|white|rice|sherry|cider|apple cider|champagne|malt) )?(wine )?vinegar\b|\bginger\b/gi,
};
const PORK: Rule = { bad: w(["pork", "bacon", "ham", "prosciutto", "salami", "chorizo", "pancetta", "speck", "guanciale", "pepperoni", "mortadella", "lard", "gelatine?"]) };

function hits(text: string, rule: Rule): boolean {
  const cleaned = rule.safe ? text.replace(rule.safe, " ") : text;
  return rule.bad.test(cleaned);
}

function anyIngredient(recipe: Recipe, rule: Rule): boolean {
  return recipe.ingredients.some((i) => hits(i.name, rule));
}

const CHECKS: Partial<Record<DietaryRequirement, (r: Recipe) => boolean>> = {
  vegetarian: (r) => !anyIngredient(r, MEAT) && !anyIngredient(r, SEAFOOD),
  vegan: (r) =>
    !anyIngredient(r, MEAT) && !anyIngredient(r, SEAFOOD) && !anyIngredient(r, DAIRY) && !anyIngredient(r, EGG) && !anyIngredient(r, HONEY),
  pescatarian: (r) => !anyIngredient(r, MEAT),
  "gluten-free": (r) => !anyIngredient(r, GLUTEN),
  "dairy-free": (r) => !anyIngredient(r, DAIRY),
  "nut-free": (r) => !anyIngredient(r, NUTS),
  // Excludes forbidden ingredients only; we can't vouch for how meat was slaughtered.
  halal: (r) => !anyIngredient(r, PORK) && !anyIngredient(r, ALCOHOL),
  kosher: (r) =>
    !anyIngredient(r, PORK) && !anyIngredient(r, SHELLFISH) && !(anyIngredient(r, MEAT) && anyIngredient(r, DAIRY)),
};

/** Diets the planner can actually enforce. Others are hidden from onboarding. */
export const SUPPORTED_DIETS = Object.keys(CHECKS) as DietaryRequirement[];

export function isDietSupported(diet: string): diet is DietaryRequirement {
  return diet in CHECKS;
}

/** True when the recipe is suitable for every supported diet listed. Unsupported diets are ignored. */
export function recipeMeetsDiets(recipe: Recipe, diets: string[]): boolean {
  return diets.every((d) => {
    const check = CHECKS[d as DietaryRequirement];
    return check ? check(recipe) : true;
  });
}
