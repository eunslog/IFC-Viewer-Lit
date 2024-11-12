import { v4 as uuidv4 } from 'uuid'

export type ProjectStatus = "pending" | "active" | "finished"
export type UserRole = "architect" | "engineer" | "developer"

export interface IProject {
  name: string
	description: string
	status: ProjectStatus
	userRole: UserRole
	finishDate: Date
  //자동으로 불러올 설계 파일을 저장
  ifc_data: Uint8Array
}

export class Project implements IProject {
	//To satisfy IProject
  name!: string
  description!: string
  status!: "pending" | "active" | "finished"
  userRole!: "architect" | "engineer" | "developer"
  finishDate!: Date
  ifc_data!: Uint8Array
  
  //Class internals
  ui!: HTMLDivElement
  cost: number = 0
  progress: number = 0
  id: string

  constructor(data: IProject) {
    Object.keys(data).forEach((key) => {
      (this as any)[key] = data[key as keyof IProject];
    });
    this.id = uuidv4()
  }
}