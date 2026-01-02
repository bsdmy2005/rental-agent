import { InsertMovingInspectionCategory } from "@/db/schema/moving-inspection-categories-schema"

export const movingInspectionCategoriesData: InsertMovingInspectionCategory[] = [
  { name: "Motor Gate", displayOrder: 1 },
  { name: "Entrance Hall", displayOrder: 2 },
  { name: "Lounge", displayOrder: 3 },
  { name: "Dining Room", displayOrder: 4 },
  { name: "Family Room", displayOrder: 5 },
  { name: "Passage / Stairs", displayOrder: 6 },
  { name: "Kitchen & Scullery", displayOrder: 7 },
  { name: "Pantry", displayOrder: 8 },
  { name: "Main Bedroom", displayOrder: 9 },
  { name: "Other Bedrooms", displayOrder: 10 }, // Expandable
  { name: "Bathrooms", displayOrder: 11 }, // Expandable
  { name: "Garages", displayOrder: 12 },
  { name: "Pool", displayOrder: 13 },
  { name: "Patio / Balcony", displayOrder: 14 },
  { name: "Garden", displayOrder: 15 },
  { name: "General", displayOrder: 16 },
  { name: "Other", displayOrder: 17 }
]

