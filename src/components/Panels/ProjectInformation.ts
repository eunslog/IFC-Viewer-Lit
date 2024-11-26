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




  projectsManager.onProjectsUpdated = () => {
    console.log('Projects updated:', projectsManager.list);
    console.log('Projects length:', projectsManager.list.length);
    isLoadingProjects = false; 
    panel.requestUpdate(); 

  };

  

  projectsManager.loadProjects();
    


  const getIfcFilesListTemplate = () => {

    console.log('projectsManager list:', projectsManager.list);
    console.log('projectsManager list length:', projectsManager.list.length);

    if(projectsManager.list.length > 0) {
      return BUI.html`
        <div>
          ${projectsManager.list.map(
            (project) => BUI.html`
              <div style="display: flex; gap: 0.375rem; margin-bottom: 0.5rem;">
                <bim-label>${project.name}</bim-label>
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