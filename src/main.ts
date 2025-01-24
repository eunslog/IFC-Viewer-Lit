/* eslint-disable no-alert */
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as WEBIFC from "web-ifc";
import { AppManager } from "./bim-components";

// Components imports
import projectInformation from "./components/Panels/ProjectInformation";
import elementData from "./components/Panels/Selection";
import settings from "./components/Panels/Settings";
import load from "./components/Toolbars/Sections/Import";
import camera from "./components/Toolbars/Sections/Camera";
import selection from "./components/Toolbars/Sections/Selection";
import clipEdges from "./components/Toolbars/Sections/ClipEdges";
import measurement from "./components/Toolbars/Sections/Measurement";
import hider from "./components/Panels/Sections/Hider";
import ToDo from "./components/classes/TodoCard";
import PanelResizer from "./components/Panels/PanelResizer";
import { ProjectsManager } from "./components/classes/ProjectsManager";

// Initialize BUI
BUI.Manager.init();

// Initialize core components
const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);
const projectsManager = new ProjectsManager();

// Create and setup world
const world = worlds.create<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBF.PostproductionRenderer
>();
world.name = "Main";

// Setup Scene
world.scene = new OBC.SimpleScene(components);
world.scene.setup();
world.scene.three.background = null;

// Create viewport
const viewport = BUI.Component.create<BUI.Viewport>(() => {
  return BUI.html`
    <bim-viewport>
      <bim-grid floating></bim-grid>
    </bim-viewport>
  `;
});

// Setup Renderer
world.renderer = new OBF.PostproductionRenderer(components, viewport);
const { postproduction } = world.renderer;

// Setup tiles Loader
const tilesLoader = components.get(OBF.IfcStreamer);
tilesLoader.url = "../resources/tiles/";
tilesLoader.world = world;
tilesLoader.culler.threshold = 10;
tilesLoader.culler.maxHiddenTime = 1000;
tilesLoader.culler.maxLostTime = 40000;

const culler = components.get(OBC.Cullers).create(world);
culler.threshold = 5;

// Camera setup
world.camera = new OBC.OrthoPerspectiveCamera(components);
world.camera.controls.restThreshold = 0.25;
world.camera.controls.addEventListener("rest", () => {
  culler.needsUpdate = true;
  tilesLoader.culler.needsUpdate = true;
});

// Grid setup
const worldGrid = components.get(OBC.Grids).create(world);
worldGrid.material.uniforms.uColor.value = new THREE.Color(0x424242);
worldGrid.material.uniforms.uSize1.value = 2;
worldGrid.material.uniforms.uSize2.value = 8;

const resizeWorld = () => {
  world.renderer?.resize();
  world.camera.updateAspect();
};

viewport.addEventListener("resize", resizeWorld);

// Initialize components
components.init();

postproduction.enabled = true;
postproduction.customEffects.excludedMeshes.push(worldGrid.three);
postproduction.setPasses({ custom: true, ao: true, gamma: true });
postproduction.customEffects.lineColor = 0x17191c;

const appManager = components.get(AppManager);
const viewportGrid = viewport.querySelector<BUI.Grid>("bim-grid[floating]")!;
appManager.grids.set("viewport", viewportGrid);

// Setup Ifc Loader
const fragmentIfcLoader  = components.get(OBC.IfcLoader);
// await fragmentIfcLoader.setup();
await fragmentIfcLoader.setup({
  autoSetWasm: false,
  wasm: {
    path: "/node_modules/web-ifc/",
    absolute: true,
  }
})

const excludedCats = [
  WEBIFC.IFCTENDONANCHOR,
  WEBIFC.IFCREINFORCINGBAR,
  WEBIFC.IFCREINFORCINGELEMENT,
];

for (const cat of excludedCats) {
  fragmentIfcLoader.settings.excludedCategories.add(cat);
}
fragmentIfcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;

// Setup highlighter
const highlighter = components.get(OBF.Highlighter);
highlighter.setup({ world });
highlighter.zoomToSelection = true;

// Setup fragments manager
const indexer = components.get(OBC.IfcRelationsIndexer);
const classifier = components.get(OBC.Classifier);
classifier.list.CustomSelections = {};
const fragmentsManager = components.get(OBC.FragmentsManager);
const classificationData = new Map<string, OBC.Classification>();


fragmentsManager.onFragmentsLoaded.add(async (model) => {
  
  for (const fragment of model.items) {
    world.meshes.add(fragment.mesh);
    culler.add(fragment.mesh);
  }

  if (world.scene) 
  {
    world.scene.three.add(model);
  }

  setTimeout(async () => {
    world.camera.fit(world.meshes, 0.8);
  }, 50);

  if (model.hasProperties) {
    // Save current classification information.
    const savedClassifierState = {
      ...classifier.list
    };

    // Temporarily use classifier to generate classification information for a new model.
    classifier.list = {};
    classifier.list.CustomSelections = {};
    await classifier.byPredefinedType(model);
    await indexer.process(model);
    classifier.byEntity(model);
    await classifier.bySpatialStructure(model, {
      isolate: new Set([WEBIFC.IFCBUILDINGSTOREY]),
    });

    // Save new model's classifier in modelData
    classificationData.set(model.uuid, {...classifier.list});

    const modelProps = classificationData.get(model.uuid);
    if (modelProps) {
      // Save classification
      for (const [classificationType, classificationData] of Object.entries(classifier.list)) {
        if (classificationData && modelProps[classificationType]) {
          for (const [groupName, groupData] of Object.entries(classificationData)) {
            modelProps[classificationType][groupName] = {
              map: groupData.map,
              name: groupData.name,
              id: groupData.id,
            };
          }
        }
      }
    }

    // If classifier.list is not empty, restore classifier.list
    if (!savedClassifierState.CustomSelections || Object.keys(savedClassifierState.CustomSelections).length != 0)
    {
      classifier.list = savedClassifierState;
      return;
    }

    await indexer.process(model);
  }
  
  updateHiderPanel(); 
});

highlighter.events.select.onHighlight.add(async () => {

  const selectedFragments = highlighter.selection.select;
  const fragmentKeys = Object.keys(selectedFragments);
  const fragmentID = fragmentKeys[0];
  const fragment = fragmentsManager.list.get(fragmentID);

  if (!fragment || !fragment.mesh || !fragment.mesh.parent) {
    console.error("Fragment or its mesh/parent is not valid.");
    return;
  }

  const modelUUID = fragment.mesh.parent?.uuid;
  if (modelUUID) {

    if(JSON.stringify(classificationData.get(modelUUID)) === JSON.stringify(classifier.list)) {
      return;
    }

    const model = fragment.group;
    if (model) {
      classifier.list = {};
      await indexer.process(model);

      const modelProps = classificationData.get(model.uuid);
      if (modelProps) {
        for (const [classificationType, classificationData] of Object.entries(modelProps)) {
          if (!classifier.list[classificationType]) {
            classifier.list[classificationType] = {};
          }
          if (classificationData && modelProps[classificationType]) {
            for (const [groupName, groupData] of Object.entries(classificationData)) {
              classifier.list[classificationType][groupName] = {
                map: groupData.map,
                name: groupData.name,
                id: groupData.id,
              };
            }
          }
        }
      }
    }
    updateHiderPanel(); 
  }
});

fragmentsManager.onFragmentsDisposed.add(({ groupID, fragmentIDs }) => {

  const modelID =  (() => {
    for (const uuid of classificationData.keys()) {
      if (uuid == groupID)
      {
        return uuid;
      }
    }
  })();

  if (modelID) {
    // Init classifier's list if this model's classifier equals classifier.list.
    if(JSON.stringify(classificationData.get(modelID)) === JSON.stringify(classifier.list)) {
      classifier.list = {};
      classifier.list.CustomSelections = {};
    }
    // Delete map
    classificationData.delete(modelID);
  }

  for (const fragmentID of fragmentIDs) {
    const mesh = [...world.meshes].find((mesh) => mesh.uuid === fragmentID);
    if (mesh) world.meshes.delete(mesh);
  }

  updateHiderPanel();

});

function updateHiderPanel() {

  const hiderTab = document.querySelector<BUI.Tab>('bim-tab[name="hider"]');
  const newHider = hider(components);

  if (!hiderTab)
  {
    return;
  }
  hiderTab.innerHTML = "";
  if (newHider) 
  {
    hiderTab.append(newHider);
  }
}

await projectsManager.loadIFCFiles();
const projectInformationPanel = projectInformation(components, projectsManager);
const elementDataPanel = elementData(components);
const ToDoPanel = ToDo(components, projectsManager);
// Setup UI components
const app = document.getElementById("app") as BUI.Grid;

const leftPanel = BUI.Component.create(() => {
  return BUI.html`
    <bim-tabs switchers-full>
      <bim-tab name="project" label="Project" icon="ph:building-fill">
        ${projectInformationPanel}
      </bim-tab>
      <bim-tab name="settings" label="Settings" icon="solar:settings-bold">
        ${settings(components)}
      </bim-tab>
      <bim-tab name="hider" label="Hider" icon="mdi:eye-off-outline">
        ${hider(components)}
      </bim-tab>
    </bim-tabs> 
  `;
});

const rightPanel = BUI.Component.create(() => {
  return BUI.html`
    <bim-panel>
      ${ToDoPanel}
      ${elementDataPanel}
    </bim-panel>
  `;
});

const toolbar = BUI.Component.create(() => {
  return BUI.html`
    <bim-toolbar>
      ${load(components)}
      ${camera(world)}
      ${selection(components, world)}
      ${clipEdges(components, world)}
      ${measurement(components, world)}
    </bim-toolbar>
  `;
});

// Control LeftPanel's width
PanelResizer(leftPanel, app);

// Setup layouts
app.layouts = {
  main: {
    template: `
      "leftPanel viewport" 1fr
      / auto 1fr
    `,
    elements: {
      leftPanel,
      viewport,
    },
  },
};

app.layout = "main";

viewportGrid.layouts = {
  main: {
    template: `
      "empty" 1fr
      "toolbar" auto
      /1fr
    `,
    elements: { toolbar },
  },
  second: {
    template: `
      "empty rightPanel" 1fr
      "toolbar rightPanel" auto
      /1fr 24rem
    `,
    elements: {
      toolbar,
      rightPanel,
    },
  },
};

viewportGrid.layout = "main";