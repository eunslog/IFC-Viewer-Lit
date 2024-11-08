import { FragmentIdMap } from "@thatopen/fragments"

export type ToDoPriority = "Low" | "Medium" | "High"

export interface ToDo {
  description: string
  date: Date
  fragmentMap: FragmentIdMap
  priority: ToDoPriority
}