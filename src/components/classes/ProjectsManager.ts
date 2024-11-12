import { IProject, Project } from "./Project"

//TODO 삭제예정
//sample ifc file load
//이후 데이터베이스에서 받아오는 방식으로 변경 필요
const file = await fetch("src/resource/small.ifc");
const buffer = await file.arrayBuffer();
const project1_data = new Uint8Array(buffer);

const file2 = await fetch("src/resource/HNS-CTL-MOD-EST-001.ifc")
const buffer2 = await file2.arrayBuffer();
const project2_data = new Uint8Array(buffer2)

export class ProjectsManager {
  list: Project[] = []
  onProjectCreated = (project: Project) => {}
  onProjectDeleted = () => {}

  constructor() {
    //TODO 삭제예정
    //더미데이터 생성
    this.newProject({
      name: "Default Project",
      description: "This is just a default app project1",
      status: "pending",
      userRole: "architect",
      finishDate: new Date(),
      ifc_data: project1_data
    })
    this.newProject({
      name: "Default Project2",
      description: "This is just a default app project2",
      status: "active",
      userRole: "developer",
      finishDate: new Date(),
      ifc_data: project2_data
    })
  }

  filterProjects(value: string) {
    console.log("this val: ", value);
    const filteredProjects = this.list.filter((project) => {
      return project.name.toLowerCase().includes(value.toLocaleLowerCase())
    })
    return filteredProjects
  }

  newProject(data: IProject) {
    const projectNames = this.list.map((project) => {
      return project.name
    })
    const nameInUse = projectNames.includes(data.name)
    if (nameInUse) {
      throw new Error(`A project with the name "${data.name}" already exists`)
    }
    const project = new Project(data)
    this.list.push(project)
    this.onProjectCreated(project)
    return project
  }

  getProject(id: string) {
    const project = this.list.find((project) => {
      return project.id === id
    })
    return project
  }
  
  deleteProject(id: string) {
    const project = this.getProject(id)
    if (!project) { return }
    const remaining = this.list.filter((project) => {
      return project.id !== id
    })
    this.list = remaining
    this.onProjectDeleted()
  }
  
  exportToJSON(fileName: string = "projects") {
    const json = JSON.stringify(this.list, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }
  
  importFromJSON() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    const reader = new FileReader()
    reader.addEventListener("load", () => {
      const json = reader.result
      if (!json) { return }
      const projects: IProject[] = JSON.parse(json as string)
      for (const project of projects) {
        try {
          this.newProject(project)
        } catch (error) {
          
        }
      }
    })
    input.addEventListener('change', () => {
      const filesList = input.files
      if (!filesList) { return }
      reader.readAsText(filesList[0])
    })
    input.click()
  }
}