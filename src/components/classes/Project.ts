import { v4 as uuidv4 } from 'uuid'

export type ProjectStatus = "pending" | "active" | "finished"
export type UserRole = "architect" | "engineer" | "developer"

export interface IProject {
  id: number
  name: string
  project_ifc: number
}

export class Project implements IProject {
	//To satisfy IProject
  id!: number
  name!: string
  project_ifc!: number
  ifc_data!: Uint8Array
  
  //Class internals
  ui!: HTMLDivElement
  cost: number = 0
  progress: number = 0

  // constructor(data: IProject) {
  //   Object.keys(data).forEach((key) => {
  //     (this as any)[key] = data[key as keyof IProject];
  //   });
  //   this.id = uuidv4()
  // }
}