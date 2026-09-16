import { integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import type { Meal, MealTrip } from "../meal-planner";
import { user } from "./auth";

export const mealPlanner = pgTable("meal_planner", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  revision: integer("revision").notNull().default(0),
  meals: jsonb("meals").$type<Meal[]>().notNull().default([]),
  trip: jsonb("trip").$type<MealTrip>(),
});
