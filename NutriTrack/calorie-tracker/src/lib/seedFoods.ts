// Curated common foods with Slovak + English names and per-100g nutrition.
// Numbers are USDA FoodData Central averages, rounded. Meats are raw unless
// the name says otherwise (grams before cooking is what people usually weigh).

export type SeedFood = {
  id: string; // stable slug, e.g. "banana"
  names: string[]; // first is the display name (Slovak)
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
};

export const SEED_FOODS: SeedFood[] = [
  // Fruits
  { id: "banana", names: ["Banán", "banana"], caloriesPer100g: 89, proteinPer100g: 1.1, fatPer100g: 0.3, carbsPer100g: 23 },
  { id: "apple", names: ["Jablko", "apple"], caloriesPer100g: 52, proteinPer100g: 0.3, fatPer100g: 0.2, carbsPer100g: 14 },
  { id: "orange", names: ["Pomaranč", "orange"], caloriesPer100g: 47, proteinPer100g: 0.9, fatPer100g: 0.1, carbsPer100g: 12 },
  { id: "strawberry", names: ["Jahoda", "strawberry", "jahody"], caloriesPer100g: 32, proteinPer100g: 0.7, fatPer100g: 0.3, carbsPer100g: 8 },
  { id: "blueberry", names: ["Čučoriedka", "blueberry", "čučoriedky"], caloriesPer100g: 57, proteinPer100g: 0.7, fatPer100g: 0.3, carbsPer100g: 14 },
  { id: "raspberry", names: ["Malina", "raspberry", "maliny"], caloriesPer100g: 52, proteinPer100g: 1.2, fatPer100g: 0.7, carbsPer100g: 12 },
  { id: "grape", names: ["Hrozno", "grape"], caloriesPer100g: 69, proteinPer100g: 0.7, fatPer100g: 0.2, carbsPer100g: 18 },
  { id: "pear", names: ["Hruška", "pear"], caloriesPer100g: 57, proteinPer100g: 0.4, fatPer100g: 0.1, carbsPer100g: 15 },
  { id: "watermelon", names: ["Melón", "watermelon"], caloriesPer100g: 30, proteinPer100g: 0.6, fatPer100g: 0.2, carbsPer100g: 8 },
  { id: "pineapple", names: ["Ananás", "pineapple"], caloriesPer100g: 50, proteinPer100g: 0.5, fatPer100g: 0.1, carbsPer100g: 13 },
  { id: "kiwi", names: ["Kiwi"], caloriesPer100g: 61, proteinPer100g: 1.1, fatPer100g: 0.5, carbsPer100g: 15 },
  { id: "mango", names: ["Mango"], caloriesPer100g: 60, proteinPer100g: 0.8, fatPer100g: 0.4, carbsPer100g: 15 },
  { id: "peach", names: ["Broskyňa", "peach"], caloriesPer100g: 39, proteinPer100g: 0.9, fatPer100g: 0.3, carbsPer100g: 10 },
  { id: "plum", names: ["Slivka", "plum", "slivky"], caloriesPer100g: 46, proteinPer100g: 0.7, fatPer100g: 0.3, carbsPer100g: 11 },
  { id: "cherry", names: ["Čerešňa", "cherry", "čerešne"], caloriesPer100g: 63, proteinPer100g: 1.1, fatPer100g: 0.2, carbsPer100g: 16 },
  { id: "lemon", names: ["Citrón", "lemon"], caloriesPer100g: 29, proteinPer100g: 1.1, fatPer100g: 0.3, carbsPer100g: 9 },

  // Vegetables
  { id: "potato", names: ["Zemiak", "potato", "zemiaky"], caloriesPer100g: 77, proteinPer100g: 2, fatPer100g: 0.1, carbsPer100g: 17 },
  { id: "carrot", names: ["Mrkva", "carrot"], caloriesPer100g: 41, proteinPer100g: 0.9, fatPer100g: 0.2, carbsPer100g: 10 },
  { id: "tomato", names: ["Paradajka", "tomato", "paradajky"], caloriesPer100g: 18, proteinPer100g: 0.9, fatPer100g: 0.2, carbsPer100g: 4 },
  { id: "cucumber", names: ["Uhorka", "cucumber"], caloriesPer100g: 15, proteinPer100g: 0.7, fatPer100g: 0.1, carbsPer100g: 4 },
  { id: "onion", names: ["Cibuľa", "onion"], caloriesPer100g: 40, proteinPer100g: 1.1, fatPer100g: 0.1, carbsPer100g: 9 },
  { id: "garlic", names: ["Cesnak", "garlic"], caloriesPer100g: 149, proteinPer100g: 6.4, fatPer100g: 0.5, carbsPer100g: 33 },
  { id: "pepper", names: ["Paprika", "bell pepper"], caloriesPer100g: 20, proteinPer100g: 0.9, fatPer100g: 0.2, carbsPer100g: 5 },
  { id: "broccoli", names: ["Brokolica", "broccoli"], caloriesPer100g: 34, proteinPer100g: 2.8, fatPer100g: 0.4, carbsPer100g: 7 },
  { id: "spinach", names: ["Špenát", "spinach"], caloriesPer100g: 23, proteinPer100g: 2.9, fatPer100g: 0.4, carbsPer100g: 4 },
  { id: "lettuce", names: ["Šalát", "lettuce"], caloriesPer100g: 15, proteinPer100g: 1.4, fatPer100g: 0.2, carbsPer100g: 3 },
  { id: "zucchini", names: ["Cuketa", "zucchini"], caloriesPer100g: 17, proteinPer100g: 1.2, fatPer100g: 0.3, carbsPer100g: 3 },
  { id: "mushroom", names: ["Huba", "mushroom", "huby", "šampiňón"], caloriesPer100g: 22, proteinPer100g: 3.1, fatPer100g: 0.3, carbsPer100g: 3 },
  { id: "corn", names: ["Kukurica", "corn"], caloriesPer100g: 86, proteinPer100g: 3.3, fatPer100g: 1.4, carbsPer100g: 19 },
  { id: "peas", names: ["Hrášok", "peas"], caloriesPer100g: 81, proteinPer100g: 5.4, fatPer100g: 0.4, carbsPer100g: 14 },

  // Meats & fish (raw weight)
  { id: "chicken-breast", names: ["Kuracie prsia (surové)", "chicken breast", "kura"], caloriesPer100g: 120, proteinPer100g: 22, fatPer100g: 3, carbsPer100g: 0 },
  { id: "chicken-thigh", names: ["Kuracie stehno (surové)", "chicken thigh"], caloriesPer100g: 179, proteinPer100g: 17, fatPer100g: 12, carbsPer100g: 0 },
  { id: "beef", names: ["Hovädzie mäso (surové)", "beef", "hovädzie"], caloriesPer100g: 250, proteinPer100g: 26, fatPer100g: 15, carbsPer100g: 0 },
  { id: "pork", names: ["Bravčové mäso (surové)", "pork", "bravčové"], caloriesPer100g: 242, proteinPer100g: 27, fatPer100g: 14, carbsPer100g: 0 },
  { id: "salmon", names: ["Losos (surový)", "salmon"], caloriesPer100g: 208, proteinPer100g: 20, fatPer100g: 13, carbsPer100g: 0 },
  { id: "tuna-water", names: ["Tuniak vo vlastnej šťave", "tuna in water", "tuniak"], caloriesPer100g: 116, proteinPer100g: 26, fatPer100g: 1, carbsPer100g: 0 },
  { id: "egg", names: ["Vajce", "egg", "vajcia"], caloriesPer100g: 143, proteinPer100g: 13, fatPer100g: 10, carbsPer100g: 1 },
  { id: "ham", names: ["Šunka", "ham"], caloriesPer100g: 145, proteinPer100g: 21, fatPer100g: 6, carbsPer100g: 1 },
  { id: "bacon", names: ["Slanina", "bacon"], caloriesPer100g: 541, proteinPer100g: 37, fatPer100g: 42, carbsPer100g: 1 },
  { id: "sausage", names: ["Klobása", "sausage"], caloriesPer100g: 300, proteinPer100g: 12, fatPer100g: 27, carbsPer100g: 1 },

  // Grains & starches
  { id: "rice-cooked", names: ["Ryža (uvarená)", "rice cooked"], caloriesPer100g: 130, proteinPer100g: 2.7, fatPer100g: 0.3, carbsPer100g: 28 },
  { id: "pasta-cooked", names: ["Cestoviny (uvarené)", "pasta cooked"], caloriesPer100g: 158, proteinPer100g: 5.8, fatPer100g: 0.9, carbsPer100g: 31 },
  { id: "bread", names: ["Chlieb", "bread"], caloriesPer100g: 265, proteinPer100g: 9, fatPer100g: 3, carbsPer100g: 49 },
  { id: "oats", names: ["Ovsené vločky", "oats", "ovsenka"], caloriesPer100g: 389, proteinPer100g: 17, fatPer100g: 7, carbsPer100g: 66 },
  { id: "quinoa-cooked", names: ["Quinoa (uvarená)", "quinoa cooked"], caloriesPer100g: 120, proteinPer100g: 4.4, fatPer100g: 1.9, carbsPer100g: 21 },
  { id: "flour", names: ["Múka", "flour"], caloriesPer100g: 364, proteinPer100g: 10, fatPer100g: 1, carbsPer100g: 76 },

  // Dairy
  { id: "milk-whole", names: ["Mlieko plnotučné", "whole milk"], caloriesPer100g: 61, proteinPer100g: 3.2, fatPer100g: 3.3, carbsPer100g: 5 },
  { id: "milk-skim", names: ["Mlieko nízkotučné", "skim milk"], caloriesPer100g: 34, proteinPer100g: 3.4, fatPer100g: 0.1, carbsPer100g: 5 },
  { id: "yogurt-plain", names: ["Biely jogurt", "plain yogurt"], caloriesPer100g: 63, proteinPer100g: 5.3, fatPer100g: 3.3, carbsPer100g: 5 },
  { id: "yogurt-greek", names: ["Grécky jogurt", "greek yogurt"], caloriesPer100g: 97, proteinPer100g: 9, fatPer100g: 5, carbsPer100g: 4 },
  { id: "kefir", names: ["Kefír", "kefir"], caloriesPer100g: 41, proteinPer100g: 3.4, fatPer100g: 1, carbsPer100g: 4 },
  { id: "cottage-cheese", names: ["Tvaroh", "cottage cheese"], caloriesPer100g: 98, proteinPer100g: 11, fatPer100g: 4.3, carbsPer100g: 3.4 },
  { id: "cheese-edam", names: ["Syr Eidam", "edam cheese"], caloriesPer100g: 357, proteinPer100g: 25, fatPer100g: 28, carbsPer100g: 1 },
  { id: "cheese-mozzarella", names: ["Mozzarella", "mozzarella"], caloriesPer100g: 280, proteinPer100g: 28, fatPer100g: 17, carbsPer100g: 3 },
  { id: "bryndza", names: ["Bryndza", "sheep cheese"], caloriesPer100g: 297, proteinPer100g: 15, fatPer100g: 26, carbsPer100g: 0.5 },
  { id: "butter", names: ["Maslo", "butter"], caloriesPer100g: 717, proteinPer100g: 0.9, fatPer100g: 81, carbsPer100g: 0.1 },

  // Nuts, seeds, oils, sweeteners
  { id: "almond", names: ["Mandľa", "almond", "mandle"], caloriesPer100g: 579, proteinPer100g: 21, fatPer100g: 50, carbsPer100g: 22 },
  { id: "walnut", names: ["Vlašský orech", "walnut", "orechy"], caloriesPer100g: 654, proteinPer100g: 15, fatPer100g: 65, carbsPer100g: 14 },
  { id: "peanut-butter", names: ["Arašidové maslo", "peanut butter"], caloriesPer100g: 588, proteinPer100g: 25, fatPer100g: 50, carbsPer100g: 20 },
  { id: "honey", names: ["Med", "honey"], caloriesPer100g: 304, proteinPer100g: 0.3, fatPer100g: 0, carbsPer100g: 82 },
  { id: "olive-oil", names: ["Olivový olej", "olive oil"], caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0 },
  { id: "sunflower-oil", names: ["Slnečnicový olej", "sunflower oil"], caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0 },
  { id: "sugar", names: ["Cukor", "sugar"], caloriesPer100g: 387, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 100 },

  // Baked goods & pastries
  { id: "rozok", names: ["Rožok", "bread roll"], caloriesPer100g: 280, proteinPer100g: 8, fatPer100g: 4, carbsPer100g: 51 },
  { id: "kaiserka", names: ["Kaiserka", "kaiser roll"], caloriesPer100g: 270, proteinPer100g: 8, fatPer100g: 3, carbsPer100g: 52 },
  { id: "bageta", names: ["Bageta", "baguette"], caloriesPer100g: 275, proteinPer100g: 9, fatPer100g: 2.5, carbsPer100g: 52 },
  { id: "toustovy-chlieb", names: ["Toastový chlieb", "toast bread"], caloriesPer100g: 280, proteinPer100g: 8, fatPer100g: 3, carbsPer100g: 52 },
  { id: "razny-chlieb", names: ["Ražný chlieb", "rye bread"], caloriesPer100g: 250, proteinPer100g: 8, fatPer100g: 3, carbsPer100g: 48 },
  { id: "celozrnny-chlieb", names: ["Celozrnný chlieb", "whole grain bread"], caloriesPer100g: 247, proteinPer100g: 8, fatPer100g: 3, carbsPer100g: 45 },
  { id: "bagel", names: ["Bagel", "bagel"], caloriesPer100g: 257, proteinPer100g: 10, fatPer100g: 1.5, carbsPer100g: 51 },
  { id: "croissant", names: ["Croissant", "croissant"], caloriesPer100g: 406, proteinPer100g: 8, fatPer100g: 21, carbsPer100g: 46 },
  { id: "buchta", names: ["Buchta", "sweet bun"], caloriesPer100g: 300, proteinPer100g: 8, fatPer100g: 5, carbsPer100g: 55 },
  { id: "siska", names: ["Šiška", "donut", "kobliha"], caloriesPer100g: 380, proteinPer100g: 6, fatPer100g: 20, carbsPer100g: 45 },
  { id: "vianocka", names: ["Vianočka", "sweet christmas bread"], caloriesPer100g: 340, proteinPer100g: 8, fatPer100g: 8, carbsPer100g: 58 },
  { id: "pernik", names: ["Perník", "gingerbread"], caloriesPer100g: 380, proteinPer100g: 5, fatPer100g: 12, carbsPer100g: 62 },
  { id: "pizza-cesto", names: ["Pizza cesto", "pizza dough"], caloriesPer100g: 271, proteinPer100g: 9, fatPer100g: 3, carbsPer100g: 54 },
  { id: "tortilla-wrap", names: ["Tortilla wrap", "tortilla"], caloriesPer100g: 300, proteinPer100g: 8, fatPer100g: 8, carbsPer100g: 49 },
  { id: "muffin", names: ["Muffin", "muffin"], caloriesPer100g: 380, proteinPer100g: 5, fatPer100g: 15, carbsPer100g: 55 },

  // Breakfast & cereals
  { id: "palacinka", names: ["Palacinka", "pancake"], caloriesPer100g: 230, proteinPer100g: 6, fatPer100g: 8, carbsPer100g: 32 },
  { id: "vafle", names: ["Vafle", "waffle"], caloriesPer100g: 290, proteinPer100g: 7, fatPer100g: 10, carbsPer100g: 42 },
  { id: "cornflakes", names: ["Cornflakes", "corn flakes"], caloriesPer100g: 375, proteinPer100g: 8, fatPer100g: 1, carbsPer100g: 82 },
  { id: "musli", names: ["Müsli", "muesli"], caloriesPer100g: 380, proteinPer100g: 10, fatPer100g: 6, carbsPer100g: 65 },
  { id: "krupica", names: ["Krupica", "semolina"], caloriesPer100g: 360, proteinPer100g: 12, fatPer100g: 1, carbsPer100g: 73 },

  // Snacks & sweets
  { id: "horalky", names: ["Horalky", "wafer bar"], caloriesPer100g: 500, proteinPer100g: 6, fatPer100g: 27, carbsPer100g: 58 },
  { id: "ryzovy-chlebik", names: ["Ryžový chlebík", "rice cake"], caloriesPer100g: 380, proteinPer100g: 8, fatPer100g: 3, carbsPer100g: 82 },
  { id: "kukuricny-chlebik", names: ["Kukuričný chlebík", "corn cake"], caloriesPer100g: 380, proteinPer100g: 8, fatPer100g: 3, carbsPer100g: 82 },
  { id: "nutella", names: ["Nátierka lieskovcová", "hazelnut spread", "nutella"], caloriesPer100g: 539, proteinPer100g: 6, fatPer100g: 31, carbsPer100g: 57 },
  { id: "cokolada-mliecna", names: ["Čokoláda mliečna", "milk chocolate"], caloriesPer100g: 535, proteinPer100g: 8, fatPer100g: 30, carbsPer100g: 60 },
  { id: "susienka", names: ["Sušienka", "cookie", "sušienky"], caloriesPer100g: 470, proteinPer100g: 6, fatPer100g: 21, carbsPer100g: 65 },
];

// Simple case- and diacritic-insensitive substring match.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function searchSeeds(query: string): SeedFood[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];

  const scored: { food: SeedFood; score: number }[] = [];
  for (const f of SEED_FOODS) {
    let best = 0;
    for (const name of f.names) {
      const n = normalize(name);
      if (n === q) {
        best = Math.max(best, 100);
      } else if (n.startsWith(q)) {
        best = Math.max(best, 50);
      } else if (n.includes(q)) {
        best = Math.max(best, 20);
      }
    }
    if (best > 0) scored.push({ food: f, score: best });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.food);
}
