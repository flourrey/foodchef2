export interface SampleItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  mockIngredients: string[];
  isCookedDish?: boolean;
}

export const SAMPLE_INGREDIENT_SCENARIOS: SampleItem[] = [
  {
    id: 'sample-mediterranean',
    title: 'Fresh Garden Produce',
    subtitle: 'Tomatoes, Bell Peppers, Garlic, Basil, Onion',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=700&q=80',
    mockIngredients: ['Tomato', 'Bell Pepper', 'Garlic', 'Red Onion', 'Fresh Basil', 'Olive Oil'],
  },
  {
    id: 'sample-chicken',
    title: 'Poultry & Veggie Night',
    subtitle: 'Chicken breast, broccoli, lemon, rosemary',
    imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=700&q=80',
    mockIngredients: ['Chicken Breast', 'Broccoli', 'Lemon', 'Garlic', 'Rosemary', 'Butter'],
  },
  {
    id: 'sample-breakfast',
    title: 'Morning Breakfast Staples',
    subtitle: 'Eggs, avocado, bread, cherry tomatoes, cheese',
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=700&q=80',
    mockIngredients: ['Eggs', 'Avocado', 'Sourdough Bread', 'Cherry Tomatoes', 'Cheddar Cheese'],
  },
  {
    id: 'sample-salmon-dish',
    title: 'Restaurant Garlic Salmon (Plated Dish)',
    subtitle: 'Crispy pan-seared salmon with lemon herb butter & asparagus',
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=700&q=80',
    mockIngredients: ['Salmon Fillet', 'Butter', 'Garlic', 'Lemon', 'Fresh Dill', 'Asparagus'],
    isCookedDish: true,
  },
];
