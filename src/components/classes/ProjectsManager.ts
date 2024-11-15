import { IProject, Project, ProjectStatus } from "./Project"

interface ProjectRow {
  id: number;
  name: string;
  description: string;
  status: ProjectStatus;
  finishDate: string;
  project_ifc: number;
}

interface IfcRow {
  id: number;
  name: string;
  content: Uint8Array;
}


export class ProjectsManager {
  list: Project[] = []
  onProjectCreated = (project: Project) => {}
  onProjectDeleted = () => {}
  onProjectsUpdated = () => {}  // add

  constructor() {
    this.loadProjects();
  }

  async loadProjects() {
    try {
      // 프로젝트 목록 가져오기
      const projectResponse = await fetch('http://localhost:3000/api/projects');
      if (!projectResponse.ok) {
        throw new Error("Failed to fetch projects");
      }
      const projectRows: ProjectRow[] = await projectResponse.json();

      for (const row of projectRows) {
        // 각 프로젝트에 연결된 IFC 데이터 가져오기
        const ifcResponse = await fetch(`http://localhost:3000/api/ifc/${row.project_ifc}`);
        if (!ifcResponse.ok) {
          console.warn(`No IFC data found for project ID ${row.id}`);
          continue;
        }
        const ifcRow: IfcRow = await ifcResponse.json();

        // 중복 확인
        // const nameInUse = this.list.some((project) => project.name === row.name);
        // if (nameInUse) {
        //   console.warn(`Project with the name "${row.name}" already exists.`);
        //   continue;
        // }

        const projectData: IProject = {
          name: row.name,
          description: row.description,
          status: row.status,
          userRole: "architect",
          finishDate: new Date(row.finishDate),
          ifc_data: new Uint8Array(ifcRow.content)
        };
        this.newProject(projectData);
      }

      console.log("Projects loaded from API successfully.");
      this.onProjectsUpdated(); // add
      
    } catch (err) {
      console.error("Error loading projects from API:", err);
    }
  }


  filterProjects(value: string) {
    console.log("this val: ", value);
    const filteredProjects = this.list.filter((project) => {
      return project.name.toLowerCase().includes(value.toLocaleLowerCase())
    })
    return filteredProjects
  }

  newProject(data: IProject) {
    // const projectNames = this.list.map((project) => {
    //   return project.name
    // })
    // const nameInUse = projectNames.includes(data.name)
    // if (nameInUse) {
    //   throw new Error(`A project with the name "${data.name}" already exists`)
    // }
    const project = new Project(data);
    this.list.push(project);
    this.onProjectCreated(project);
    this.onProjectsUpdated(); //add
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