import { IProject, ProjectStatus } from "./Project"

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

  list: IProject[] = [];

  constructor() {
    // this.loadProjects();
  }

  async loadProjects() {
    try {
      // Load project list
      const projectResponse = await fetch('http://localhost:3000/api/projects/simple');
      if (!projectResponse.ok) {
        throw new Error("Failed to fetch projects");
      }
      const projectRows: ProjectRow[] = await projectResponse.json();
      for (const row of projectRows) {
        const projectData: IProject = {
          id: row.id,
          name: row.name,
          project_ifc: row.project_ifc
        };
        this.newProject(projectData);
      }
      console.log("Projects loaded from API successfully.");
      
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
    this.list.push(data);
    return data
  }

  async loadIFC(ifcId: number) {
    try{
      const ifcResponse = await fetch(`http://localhost:3000/api/ifc/${ifcId}`);
      if (!ifcResponse.ok) {
        console.warn(`Not found IFC data for ifc ID ${ifcId}`);
        return null;
      }
      const ifcRow: IfcRow = await ifcResponse.json();

      // check ifcRow.content exists
      if (!ifcRow.content || ifcRow.content.length === 0) {
        console.error("Not found IFC data found.");
        return null;
      }

      if (typeof ifcRow.content === 'string') {
      const decodedContent = atob(ifcRow.content);
      const ifc_data = new Uint8Array(decodedContent.length);
      for (let i = 0; i < decodedContent.length; i++) {
        ifc_data[i] = decodedContent.charCodeAt(i);
      }

      return ifc_data;
      }
    }
    catch (error) {
      console.error("Error loading IFC data:", error);
      return null;
    }
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