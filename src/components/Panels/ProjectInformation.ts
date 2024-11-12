import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import groupings from "./Sections/Groupings";
import { ProjectsManager } from "../classes/ProjectsManager";
import { Project } from "../classes/Project";
import { Manager } from "@thatopen/ui";

Manager.init();

export default (components: OBC.Components) => {
  const [modelsList] = CUI.tables.modelsList({ components });
  const [relationsTree] = CUI.tables.relationsTree({
    components,
    models: [],
    hoverHighlighterName: "hover",
    selectHighlighterName: "select",
  });
  relationsTree.preserveStructureOnFilter = true;

  const projectsManager = new ProjectsManager();

  const search = (e: Event) => {
    const input = e.target as BUI.TextInput;
    relationsTree.queryString = input.value;
  };

  const loadIFCModel = async (projectId: string) => {
    try {
      const ifcLoader = components.get(OBC.IfcLoader);
      const project = projectsManager.getProject(projectId);
      if (project && project.ifc_data) {
        const model = await ifcLoader.load(project.ifc_data);
        const world = components.get(OBC.Worlds).list.values().next().value;
        world.scene.three.add(model);
        console.log("IFC model loaded:", model);
      } else {
        console.error("Project or IFC data not found for project ID:", projectId);
      }
    } catch (error) {
      console.error("Error loading IFC model:", error);
    }
  };


// material-symbols:check-indeterminate-small-rounded
  const showProjectDetails = (project: Project) => {
    return BUI.html`
        <div class="form-field-container">
          <bim-label icon="material-symbols:play-arrow-rounded">
            Name: ${project.name}
          </bim-label> 
        </div>
        <div class="form-field-container">
          <bim-label icon="material-symbols:play-arrow-rounded">
            Description: ${project.description}
          </bim-label>
        </div>
        <div class="form-field-container">
          <bim-label icon="material-symbols:play-arrow-rounded">
            Role: ${project.userRole}
          </bim-label>
        </div>
        <div class="form-field-container">
          <bim-label icon="material-symbols:play-arrow-rounded">
            Status: ${project.status}
          </bim-label>
        </div>
        <div class="form-field-container">
          <bim-label icon="material-symbols:play-arrow-rounded">
            Finish Date: ${project.finishDate.toISOString().split('T')[0]}
          </bim-label>
        </div>
    `;
  };


  const ifcFilesList = projectsManager.list.map((project) => {
    return BUI.html`
      <bim-panel-section
        icon="mingcute:building-5-line"
        label=${project.name}
      >
        ${showProjectDetails(project)}
        <bim-button @click=${() => loadIFCModel(project.id)}
          icon="mage:box-3d-fill" label="Load">
      </bim-button> 
      </bim-panel-section>
    `;
  });

  return BUI.Component.create<BUI.Panel>(() => {
    return BUI.html`
      <bim-panel>
        <bim-panel-section label="IFC Files" icon="material-symbols:list">
          ${ifcFilesList}
        </bim-panel-section>        
        <bim-panel-section label="Loaded Models" icon="mage:box-3d-fill">
          ${modelsList}
        </bim-panel-section>
        <bim-panel-section label="Spatial Structures" icon="ph:tree-structure-fill">
          <div style="display: flex; gap: 0.375rem;">
            <bim-text-input @input=${search} vertical placeholder="Search..." debounce="200"></bim-text-input>
            <bim-button style="flex: 0;" @click=${() => (relationsTree.expanded = !relationsTree.expanded)} icon="eva:expand-fill"></bim-button>
          </div>
          ${relationsTree}
        </bim-panel-section>
        ${groupings(components)}
      </bim-panel> 
    `;
  });
};
