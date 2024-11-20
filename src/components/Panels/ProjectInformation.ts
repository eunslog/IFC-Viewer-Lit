import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import groupings from "./Sections/Groupings";
import { ProjectsManager } from "../classes/ProjectsManager";
import { Manager } from "@thatopen/ui";
// import Iconify from "../../../node_modules/@iconify/iconify";
// import Iconify from 'iconify-icon';
//import Iconify from "@iconify/iconify";

// declare global {
//   interface Window {
//     iconifyData: any; 
//   }
// }


Manager.init();

// if (window.iconifyData) {
//   Iconify.addCollection(window.iconifyData);
// }



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

  //add
  projectsManager.onProjectsUpdated = () => {
    updateIfcFilesList();
    panel.requestUpdate();
  };

  
  // IFC file list update
  const updateIfcFilesList = () => {
    ifcFilesList = projectsManager.list.map((project) => {
      return BUI.html`
        <div style="display: flex; gap: 0.375rem;">
          <bim-label icon="mingcute:building-5-line">${project.name}</bim-label>
          <bim-button style="flex: 0;" @click=${() => loadIFCModel(project.id)}
            icon="mage:box-3d-fill" label="Load">
          </bim-button> 
        </div>
      `;
    });

    panel.requestUpdate();
  };

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
      } else {
        console.error
        ("Project or IFC data not found for project ID:", projectId);
      }
    } catch (error) {
      console.error("Error loading IFC model:", error);
    }
  };


  let ifcFilesList = projectsManager.list.map((project) => {
    return BUI.html`
      <div style="display: flex; gap: 0.375rem;">
        <bim-label icon="mingcute:building-5-line">${project.name}</bim-label>
        <bim-button style="flex: 0;" @click=${() => loadIFCModel(project.id)}
          icon="mage:box-3d-fill" label="Load">
        </bim-button> 
      </div>
    `;
  });

  const panel = BUI.Component.create<BUI.Panel>(() => {
    return BUI.html`
      <bim-panel>   
        <bim-panel-section label="IFC Files" icon="material-symbols:list">
          <!-- <div style="display: flex; align-items: center;">
            <span class="material-icons">list</span>
          </div> -->
          <!-- <div slot="header" style="display: flex; align-items: center;">
            <span class="material-icons" style="margin-right: 8px;">list</span>
            IFC Files
          </div> -->
          <!-- <div slot="header" style="display: flex; align-items: center;"> -->
          <!-- <bim-label>IFC Files</bim-label> -->
          <!-- <iconify-icon icon="mdi:home" /> -->
          <!-- <span class="iconify" data-icon="eva:people-outline"></span>           -->
          <!-- </div> -->
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

  return panel;
};


