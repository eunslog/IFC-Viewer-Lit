interface IfcRow {
  id: number;
  name: string;
  content: Uint8Array;
}

interface IfcBasicInfo {
  id: number;
  name: string;
}

export class ProjectsManager {

  list: IfcBasicInfo[] = [];
  modelUUIDMap: Map<number, string> = new Map();

  constructor() {
  }

  async loadIFCFiles() {
    try {
      // Load ifc files list
      const ifcResponse = await fetch('http://localhost:3000/api/ifcs/name');
      if (!ifcResponse.ok) {
        throw new Error("Failed to fetch ifcs");
      }
      const ifcRows: IfcBasicInfo[] = await ifcResponse.json();
      for (const row of ifcRows) {
        const ifcInfo: IfcBasicInfo = {
          id: row.id,
          name: row.name,
        };
        this.newProject(ifcInfo);
      }
      
    } catch (err) {
      console.error("Error loading projects from API:", err);
    }
  }

  async loadIFC(ifcId: number) {
    try{
      const ifcResponse = await fetch(`http://localhost:3000/api/ifc/${ifcId}`);
      if (!ifcResponse.ok) {
        console.warn(`Not found IFC data for ifc ID ${ifcId}`);
        return null;
      }
      const ifcRow: IfcRow = await ifcResponse.json();

      // Check ifcRow.content exists
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
      
      return {
        name: ifcRow.name,
        content: ifc_data, 
      };
    }
    }
    catch (error) {
      console.error("Error loading IFC data:", error);
      return null;
    }
  }



  addModelUUID(ifcId: number, modelUUID: string) {
    this.modelUUIDMap.set(ifcId, modelUUID);
  }

  getModelUUID(ifcId: number): string | undefined {
    return this.modelUUIDMap.get(ifcId);
  }

  getIfcIdByModelUUID(modelUUID: string): number | undefined {
    for (const [ifcId, uuid] of this.modelUUIDMap.entries()) {
      if (uuid === modelUUID) {
        return ifcId;
      }
    }
    return undefined;
  }

  removeModelUUID(ifcId: number) {
    this.modelUUIDMap.delete(ifcId);
  }

  filterProjects(value: string) {
    const filteredProjects = this.list.filter((project) => {
      return project.name.toLowerCase().includes(value.toLocaleLowerCase())
    })
    return filteredProjects
  }

  newProject(data: IfcBasicInfo) {
    this.list.push(data);
    return data
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
      const projects: IfcRow[] = JSON.parse(json as string)
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