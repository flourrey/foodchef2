/**
 * SnapChef Culinary Dish Photo Resolution & Visual Plating Engine
 * Intelligently matches and adjusts dish photos based on recipe titles,
 * pantry ingredients, culinary categories, and user visual preferences.
 */

export interface DishPlatingPreset {
  id: string;
  name: string;
  description: string;
  tag: string;
  photoUrl: string;
  previewUrl: string;
}

// Curated registry of high-res food photography matched with culinary tags & ingredients
export const CULINARY_IMAGE_REGISTRY: Record<string, string[]> = {
  pasta: [
    'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=1200&q=80', // Pasta pomodoro
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80', // Creamy fettuccine
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80', // Pesto rigatoni
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80', // Aglio e olio
  ],
  stirfry: [
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80', // Wok stir fry
    'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=1200&q=80', // Vegetable noodles
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=80', // Fried rice
  ],
  chicken: [
    'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=1200&q=80', // Herb roasted chicken
    'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=1200&q=80', // Crispy chicken breast
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1200&q=80', // Grilled chicken bowl
  ],
  salmon: [
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80', // Pan-seared salmon with asparagus
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1200&q=80', // Salmon fillet
  ],
  seafood: [
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=80', // Garlic butter shrimp
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80', // Seafood paella
  ],
  curry: [
    'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=1200&q=80', // Golden curry
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80', // Tikka masala
    'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=1200&q=80', // Thai green curry
  ],
  soup: [
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80', // Rich tomato soup
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80', // Miso ramen soup
    'https://images.unsplash.com/photo-1604152135912-04a022e23696?auto=format&fit=crop&w=1200&q=80', // Hearty vegetable stew
  ],
  salad: [
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80', // Mediterranean grain bowl
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80', // Vibrant green salad
  ],
  beef: [
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80', // Seared steak with rosemary
    'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=80', // Roast beef
  ],
  tacos: [
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=80', // Street tacos with cilantro lime
    'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1200&q=80', // Quesadillas
  ],
  pizza: [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80', // Wood fired margherita
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80', // Artisanal pizza
  ],
  eggs: [
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80', // Shakshuka with poached eggs
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=1200&q=80', // French omelette
  ],
  dessert: [
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80', // Chocolate lava cake
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80', // Berry tart
  ],
  sandwich: [
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80', // Gourmet grilled cheese
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80', // Burger
  ],
  asian: [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80', // Tonkotsu ramen
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80', // Sushi platter
    'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=1200&q=80', // Dumplings
  ],
};

/**
 * Plating presets that users can choose to restyle any dish photo
 */
export const PLATING_PRESETS: DishPlatingPreset[] = [
  {
    id: 'rustic-bistro',
    name: 'Rustic Bistro Plating',
    description: 'Cast-iron skillet presentation with coarse sea salt, cracked black pepper, and wooden board backdrop',
    tag: 'rustic',
    photoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'fine-dining',
    name: 'Michelin Star Minimalist',
    description: 'Wide rim white porcelain, micro-greens garnish, artistic sauce reduction droplet trails',
    tag: 'fine-dining',
    photoUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'cozy-homestyle',
    name: 'Cozy Homestyle Bowl',
    description: 'Generous deep ceramic bowl with steaming warmth, fresh parsley, and crusty bread',
    tag: 'homestyle',
    photoUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'street-food-vibrant',
    name: 'Vibrant Street Market',
    description: 'Dynamic close-up with lime wedges, charred chili, fresh scallions and bright colors',
    tag: 'street',
    photoUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'modern-artisan',
    name: 'Artisan Cafe Gourmet',
    description: 'Top-down natural light presentation on matte stoneware with olive oil sheen',
    tag: 'artisan',
    photoUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80',
  },
];

/**
 * Intelligent photo resolver that examines recipe attributes and pantry ingredients
 * to produce the most visually accurate dish photo.
 */
export function resolveDishPhoto(
  title: string,
  ingredients: string[] = [],
  visualType?: string
): string {
  const query = `${title} ${ingredients.join(' ')} ${visualType || ''}`.toLowerCase();

  // 1. Check for specific dish matches
  if (/salmon|trout|fish|cod|halibut/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.salmon[0];
  }
  if (/shrimp|prawn|lobster|crab|calamari|seafood/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.seafood[0];
  }
  if (/pasta|spaghetti|penne|rigatoni|carbonara|fettuccine|lasagna|noodles/.test(query)) {
    if (/creamy|alfredo|carbonara|cheese/.test(query)) {
      return CULINARY_IMAGE_REGISTRY.pasta[1];
    }
    if (/pesto|basil|green/.test(query)) {
      return CULINARY_IMAGE_REGISTRY.pasta[2];
    }
    return CULINARY_IMAGE_REGISTRY.pasta[0];
  }
  if (/curry|masala|korma|tikka|dal/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.curry[0];
  }
  if (/stir.?fry|wok|fried rice|chow mein/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.stirfry[0];
  }
  if (/taco|burrito|quesadilla|fajita|mexican/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.tacos[0];
  }
  if (/soup|stew|chowder|broth|bisque/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.soup[0];
  }
  if (/ramen|udon|pho|soba/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.asian[0];
  }
  if (/dumpling|gyoza|wonton|sushi|sashimi/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.asian[2];
  }
  if (/steak|beef|ribeye|tenderloin|roast/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.beef[0];
  }
  if (/chicken|poultry|turkey/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.chicken[0];
  }
  if (/egg|frittata|omelet|shakshuka|benedict/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.eggs[0];
  }
  if (/pizza|flatbread|calzone/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.pizza[0];
  }
  if (/salad|bowl|greens|quinoa/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.salad[0];
  }
  if (/burger|sandwich|toast|panini/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.sandwich[0];
  }
  if (/cake|pie|tart|brownie|dessert|sweet|cookie/.test(query)) {
    return CULINARY_IMAGE_REGISTRY.dessert[0];
  }

  // Default balanced culinary photography
  return CULINARY_IMAGE_REGISTRY.pasta[0];
}

/**
 * Adjust a recipe's photo based on user-selected plating style and garnish
 */
export function adjustDishPhotoPresentation(
  originalPhotoUrl: string,
  platingStyleId: string,
  garnishNotes?: string
): { photoUrl: string; platingStyleName: string } {
  const preset = PLATING_PRESETS.find((p) => p.id === platingStyleId);
  if (preset) {
    return {
      photoUrl: preset.photoUrl,
      platingStyleName: preset.name,
    };
  }

  return {
    photoUrl: originalPhotoUrl,
    platingStyleName: 'Chef Standard',
  };
}
