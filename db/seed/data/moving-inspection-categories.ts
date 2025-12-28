import { InsertMovingInspectionCategory } from "@/db/schema/moving-inspection-categories-schema"

export const movingInspectionCategoriesData: InsertMovingInspectionCategory[] = [
  { name: "Kitchen", displayOrder: 1 },
  { name: "Bathroom", displayOrder: 2 },
  { name: "Living Room", displayOrder: 3 },
  { name: "Bedroom(s)", displayOrder: 4 },
  { name: "Outdoor/Patio", displayOrder: 5 },
  { name: "Garage/Parking", displayOrder: 6 },
  { name: "General", displayOrder: 7 }
]

