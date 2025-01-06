import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import groupings from "./Sections/Groupings";
import { ProjectsManager } from "../classes/ProjectsManager";
import { Manager } from "@thatopen/ui";


Manager.init();

let panel: BUI.Panel;

export default (components: OBC.Components, projectsManager: ProjectsManager) => {

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
        const model = await ifcLoader.load(project.content);
        model.name = project.name;
        const world = components.get(OBC.Worlds).list.values().next().value;
        world.scene.three.add(model);

        // Add model uuid
        projectsManager.addModelUUID(ifcId, model.uuid);
        loadedModels[ifcId] = model.uuid;

      } else {
        console.error("Project or IFC data not found for ifc ID:", ifcId);
      }
    } catch (error) {
      console.error("Error loading IFC model:", error);
    }
  };

  // Delete model (not yet modelsList)
  const deleteIFCModel = async (ifcId: number) => {
    if (!confirm("데이터베이스에서 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`http://localhost:3000/api/ifc/${ifcId}`, {
        method: "DELETE",
      });
  
      if (response.ok) {
        alert(`데이터베이스에서 삭제되었습니다.`);
        refreshIFCFiles();      
      } 
      else {
        const errorText = await response.text();
        console.error("IFC 삭제 실패:", errorText);
        alert("IFC 파일 삭제에 실패하였습니다.");
      }

      // Delete from window
      const modelUUID = projectsManager.getModelUUID(ifcId);
      if (!modelUUID) {
        console.warn(`Not found UUID for ifc ID: ${ifcId}`);
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


  

  const getIFCFilesList = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/ifcs/name");
      if (!response.ok) {
        throw new Error("Failed to fetch IFC files");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching IFC files:", error);
      return [];
    }
  };

  const search = (e: Event) => {
    const input = e.target as BUI.TextInput;
    relationsTree.queryString = input.value;
  };

  const [createdPanel, updateState] = BUI.Component.create<BUI.Panel, { content: BUI.TemplateResult }>(
    (file) => {
      return BUI.html`
        <bim-panel>
          <bim-panel-section label="IFC Files" icon="material-symbols:list">
            ${file.content}
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
    },
    { content: BUI.html`<div>Loading...</div>` } 
  );
  
  panel = createdPanel;
  
  // Update IFC files list
  const refreshIFCFiles = async () => {
    const ifcFiles = await getIFCFilesList();
    const content = BUI.html`
      <div>
        ${ifcFiles.length > 0
          ? ifcFiles.map(
              (file: { id: number; name: string }) => BUI.html`
                <div style="display: flex; gap: 0.375rem; margin-bottom: 0.5rem;">
                  <bim-label icon="mingcute:building-5-line">${file.name}</bim-label>
                  <bim-button
                    style="flex:0;"
                    @click=${() => loadIFCModel(file.id)}
                    icon="mage:box-3d-fill"
                    label="Load"
                  ></bim-button>
                  <bim-button
                    style="flex:0;"
                    @click=${() => deleteIFCModel(file.id)}
                    icon="fluent:delete-28-filled"
                    label="Delete"
                  ></bim-button>
                </div>
              `
            )
          : BUI.html`<div>No projects available.</div>`}
      </div>
    `;
    updateState({ content });
  };
  
  refreshIFCFiles();
  
  window.addEventListener("ifcSaved", refreshIFCFiles);
  

  return panel;
};