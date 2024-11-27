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

const projectsManager = new ProjectsManager();
let isLoadingProjects = true;
let panel: BUI.Panel;


export default (components: OBC.Components) => {
  
  const [modelsList] = CUI.tables.modelsList({ components });
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
      } else {
        console.error("Project or IFC data not found for ifc ID:", ifcId);
      }
    } catch (error) {
      console.error("Error loading IFC model:", error);
    }
  };

  const getIfcFilesListTemplate = () => {

    if(projectsManager.list.length > 0) {
      return BUI.html`
        <div>
          ${projectsManager.list.map(
            (project) => BUI.html`
              <div style="display: flex; gap: 0.375rem; margin-bottom: 0.5rem;">
                <bim-label icon="mingcute:building-5-line">${project.name}</bim-label>
                <bim-button style="flex:0;" @click=${() => loadIFCModel(project.project_ifc)}
                 icon="mage:box-3d-fill" label="Load">
                 </bim-button>
              </div>
            `
          )}
        </div>
      `;
    } else {
      return BUI.html `<div>No projects available.</div>`;
    }

  };
  

  const search = (e: Event) => {
    const input = e.target as BUI.TextInput;
    relationsTree.queryString = input.value;
  };


  panel = BUI.Component.create<BUI.Panel>(() => {
    console.log('panel create');


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
          ${getIfcFilesListTemplate()} 
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