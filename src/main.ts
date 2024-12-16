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
import placeMarker from "./components/Toolbars/Sections/PlaceMarker";
import hiderPanel from "./components/Panels/Sections/Hider";
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

// Setup fragments manager
const fragments = components.get(OBC.FragmentsManager);
const indexer = components.get(OBC.IfcRelationsIndexer);
const classifier = components.get(OBC.Classifier);
classifier.list.CustomSelections = {};

// Setup Ifc Loader
const fragmentIfcLoader  = components.get(OBC.IfcLoader);
await fragmentIfcLoader.setup();
// await fragmentIfcLoader.setup({
//   autoSetWasm: false,
//   wasm: {
//     path: "/node_modules/web-ifc/",
//     absolute: true,
//   }
// })

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

const placeMarkerOnSelected = placeMarker(components, world);

const fragmentsManager = components.get(OBC.FragmentsManager);
fragmentsManager.onFragmentsLoaded.add((model) => {
  if (world.scene) world.scene.three.add(model);
});

fragmentsManager.onFragmentsLoaded.add(async (model) => {

  await classifier.byPredefinedType(model);

  for (const fragment of model.items) {
    world.meshes.add(fragment.mesh);
    culler.add(fragment.mesh);
  }

  world.scene.three.add(model);
  setTimeout(async () => {
    world.camera.fit(world.meshes, 0.8);
  }, 50);

  if(model.hasProperties) {
    await indexer.process(model);
    classifier.byEntity(model);
    await classifier.bySpatialStructure(model, {
      isolate: new Set([WEBIFC.IFCBUILDINGSTOREY]),
    });

  updateHiderPanel(); 
  }

});

fragments.onFragmentsDisposed.add(({ fragmentIDs }) => {
  for (const fragmentID of fragmentIDs) {
    const mesh = [...world.meshes].find((mesh) => mesh.uuid === fragmentID);
    if (mesh) world.meshes.delete(mesh);
  }
});

function updateHiderPanel() {
  const hiderTab = document.querySelector<BUI.Tab>('bim-tab[name="hider"]');

  if (hiderTab) {
    hiderTab.innerHTML = '';

    const newHiderPanel = hiderPanel(components);

    if (newHiderPanel !== null) {
      hiderTab.append(newHiderPanel);
    } else {
      console.error('No elements to display.');
    }
  } else {
    console.error('Not found hider tab.');
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
        ${hiderPanel(components)}
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
      ${measurement(components, world, viewport)}
      <bim-button @click=${placeMarkerOnSelected} 
        label="Place Marker" 
        icon="mdi:map-marker" 
        tooltip-title="Place Marker" 
        tooltip-text="Places a marker on the selected fragment.">
      </bim-button>
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