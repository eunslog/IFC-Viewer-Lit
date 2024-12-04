import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import groupings from "./Sections/Groupings";
import { ProjectsManager } from "../classes/ProjectsManager";
import { Manager } from "@thatopen/ui";

Manager.init();

const projectsManager = new ProjectsManager();
projectsManager.loadProjects();
let panel: BUI.Panel;

export default (components: OBC.Components) => {

  const worlds = components.get(OBC.Worlds);
  const loadedModels: Record<number, string> = {};

  const [modelsList] = CUI.tables.modelsList({
    components,
    tags: {schema: true, viewDefinition: true},
    actions: { download: true, visibility: true, dispose: true }
  });

  const [relationsTree] = CUI.tables.relationsTree({
    components,
    models: [],
    hoverHighlighterName: "hover",
    selectHighlighterName: "select",
  });
  relationsTree.preserveStructureOnFilter = true;


  const loadIFCModel = async (ifcId: number) => {
    try {
      const ifcLoader = components.get(OBC.IfcLoader);
      const project = await projectsManager.loadIFC(ifcId);
      if (project) {
        const model = await ifcLoader.load(project);
        const world = components.get(OBC.Worlds).list.values().next().value;
        world.scene.three.add(model);

        // add model uuid
        projectsManager.addModelUUID(ifcId, model.uuid);
        loadedModels[ifcId] = model.uuid;
        console.log(`Model loaded with UUID: ${model.uuid}`);

      } else {
        console.error("Project or IFC data not found for ifc ID:", ifcId);
      }
    } catch (error) {
      console.error("Error loading IFC model:", error);
    }
  };

  // Delete model in world (not yet modelsList)
  const deleteIFCModel = (ifcId: number) => {
    try {
      const modelUUID = projectsManager.getModelUUID(ifcId);
      if (!modelUUID) {
        console.warn(`Not Found UUID for ifc ID: ${ifcId}`);
        return;
      }

      for (const world of worlds.list.values()) {
        const model = world.scene.three.getObjectByProperty("uuid", modelUUID);
        if (model) {
          world.scene.three.remove(model);
          
          projectsManager.removeModelUUID(ifcId);
          delete loadedModels[ifcId];

          return;
        }
      }
      console.warn(`Not found model with UUID: ${modelUUID}`);
    } catch (error) {
      console.error("Error deleting model:", error);
    }
  };

  // Get project List from sqlite database
  const getProjectList = () => {
    if (projectsManager.list.length > 0) {
      return BUI.html`
        <div>
          ${projectsManager.list.map(
            (project) => BUI.html`
              <div style="display: flex; gap: 0.375rem; margin-bottom: 0.5rem;">
                <bim-label icon="mingcute:building-5-line">${project.name}</bim-label>
                <bim-button style="flex:0;" 
                @click=${() => {
                    loadIFCModel(project.project_ifc);
                  }}                 
                  icon="mage:box-3d-fill" label="Load">
                </bim-button>
                <bim-button style="flex:0;" 
                @click=${() => {
                  deleteIFCModel(project.project_ifc);
                 }}
                 icon="mage:box-3d-fill" label="Delete">
                 </bim-button>
              </div>
            `
          )}
        </div>
      `;
    } else {
      return BUI.html`<div>No projects available.</div>`;
    }
  };

  const search = (e: Event) => {
    const input = e.target as BUI.TextInput;
    relationsTree.queryString = input.value;
  };


  panel = BUI.Component.create<BUI.Panel>(() => {
    return BUI.html`
      <bim-panel>
        <bim-panel-section label="IFC Files" icon="material-symbols:list">
          ${getProjectList()}
        </bim-panel-section>
        <bim-panel-section label="Loaded Models" icon="mage:box-3d-fill">
          ${modelsList}
        </bim-panel-section>
        <bim-panel-section label="Spatial Structures" icon="ph:tree-structure-fill">
          <div style="display: flex; gap: 0.375rem;">
            <bim-text-input @input=${search} vertical placeholder="Search..." debounce="200"></bim-text-input>
            <bim-button style="flex: 0;" 
            @click=${() => (relationsTree.expanded = !relationsTree.expanded)} 
            icon="eva:expand-fill"
            ></bim-button>
          </div>
          ${relationsTree}
        </bim-panel-section>
        ${groupings(components)}
      </bim-panel>
    `;
  });

  return panel;
};