/* eslint-disable no-alert */
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as WEBIFC from "web-ifc";
import { AppManager } from "./bim-components";
import projectInformation from "./components/Panels/ProjectInformation";
import elementData from "./components/Panels/Selection";
import settings from "./components/Panels/Settings";
import load from "./components/Toolbars/Sections/Import";
import camera from "./components/Toolbars/Sections/Camera";
import selection from "./components/Toolbars/Sections/Selection";
import clipEdges from "./components/Toolbars/Sections/ClipEdges";
import hiderPanel from "./components/Panels/Sections/Hider";
import ToDo from './components/classes/TodoCard';


BUI.Manager.init();

const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);

const world = worlds.create<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBF.PostproductionRenderer
>();
world.name = "Main";

world.scene = new OBC.SimpleScene(components);
world.scene.setup();
world.scene.three.background = null;

const viewport = BUI.Component.create<BUI.Viewport>(() => {
  return BUI.html`
    <bim-viewport>
      <bim-grid floating></bim-grid>
    </bim-viewport>
  `;
});

world.renderer = new OBF.PostproductionRenderer(components, viewport);
const { postproduction } = world.renderer;

world.camera = new OBC.OrthoPerspectiveCamera(components);

const worldGrid = components.get(OBC.Grids).create(world);
worldGrid.material.uniforms.uColor.value = new THREE.Color(0x424242);
worldGrid.material.uniforms.uSize1.value = 2;
worldGrid.material.uniforms.uSize2.value = 8;

const resizeWorld = () => {
  world.renderer?.resize();
  world.camera.updateAspect();
};

viewport.addEventListener("resize", resizeWorld);

components.init();

postproduction.enabled = true;
postproduction.customEffects.excludedMeshes.push(worldGrid.three);
postproduction.setPasses({ custom: true, ao: true, gamma: true });
postproduction.customEffects.lineColor = 0x17191c;

const appManager = components.get(AppManager);
const viewportGrid = viewport.querySelector<BUI.Grid>("bim-grid[floating]")!;
appManager.grids.set("viewport", viewportGrid);

const fragments = components.get(OBC.FragmentsManager);
const indexer = components.get(OBC.IfcRelationsIndexer);
const classifier = components.get(OBC.Classifier);
classifier.list.CustomSelections = {};


// IfcStreamer
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

const tilesLoader = components.get(OBF.IfcStreamer);
tilesLoader.url = "../resources/tiles/";
tilesLoader.world = world;
tilesLoader.culler.threshold = 10;
tilesLoader.culler.maxHiddenTime = 1000;
tilesLoader.culler.maxLostTime = 40000;

const highlighter = components.get(OBF.Highlighter);
highlighter.setup({ world });
highlighter.zoomToSelection = true;

const culler = components.get(OBC.Cullers).create(world);
culler.threshold = 5;

world.camera.controls.restThreshold = 0.25;
world.camera.controls.addEventListener("rest", () => {
  culler.needsUpdate = true;
  tilesLoader.culler.needsUpdate = true;
});


const marker = components.get(OBF.Marker);
marker.threshold = 10;

const markerMap = new Map<string, { position: THREE.Vector3, count: number, labelMarkerId?: string }>();

// place marker
const placeMarkerOnSelected = () => {
  const boundingBoxer = components.get(OBC.BoundingBoxer); 
  boundingBoxer.reset();
  
  const selectedFragments = highlighter.selection.select;
  if (Object.keys(selectedFragments).length === 0) {
    console.log("No fragments selected.");
    return;
  }

  const fragmentID = Object.keys(selectedFragments)[0];
  const fragment = fragments.list.get(fragmentID);

  if (!fragment) return;

  const expressIDs = selectedFragments[fragmentID]; 

  boundingBoxer.addMesh(fragment.mesh, expressIDs);

  const boundingSphere = boundingBoxer.getSphere(); 
  if (boundingSphere) {
    const center = boundingSphere.center; 

    const positionKey = `${center.x.toFixed(2)}_${center.y.toFixed(2)}_${center.z.toFixed(2)}`;

    marker.create(world, "🚀", center);

    if (markerMap.has(positionKey)) {
      const markerData = markerMap.get(positionKey)!;
      markerData.count++;

      // delete previous marker
      if (markerData.labelMarkerId) {
        marker.delete(markerData.labelMarkerId);
      }

      // create new label
      const label = `${markerData.count}`; 
      const offsetPosition = center.clone();
      offsetPosition.x += 0.1;

      const newLabelMarkerId = marker.create(world, label, offsetPosition); 
      markerData.labelMarkerId = newLabelMarkerId || "";

    } else {
      markerMap.set(positionKey, { position: center, count: 1 });
    }
  } else {
    console.log("No valid bounding sphere for fragment", fragmentID);
  }

  boundingBoxer.reset(); 
};


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


const projectInformationPanel = projectInformation(components);
const elementDataPanel = elementData(components);
const ToDoPanel = ToDo(components);

const app = document.getElementById("app") as BUI.Grid;

// EdgeMeasurement
const edgeMeasurement = components.get(OBF.EdgeMeasurement);
edgeMeasurement.world = world;
edgeMeasurement.enabled = false;

// FaceMeasurement
const faceMeasurement = components.get(OBF.FaceMeasurement);
faceMeasurement.world = world;
faceMeasurement.enabled = false;

// VolumeMeasurement
const volumeMeasurement = components.get(OBF.VolumeMeasurement);
volumeMeasurement.world = world;
volumeMeasurement.enabled = false;

// highlighter.events.select.onHighlight.add((event) => {
//   if (volumeMeasurement.enabled) {
//     const volume = volumeMeasurement.getVolumeFromFragments(event);
//   }
// });

highlighter.events.select.onClear.add(() => {
  if (volumeMeasurement.enabled) {
    volumeMeasurement.clear();
  }
});


viewport.ondblclick = () => {
  if (edgeMeasurement.enabled) {
    edgeMeasurement.create();
  } else if (faceMeasurement.enabled) {
    faceMeasurement.create();
  } 
};


const updateButtons = () => {
  const edgeButton = document.getElementById('edge-measurement-button') as BUI.Button;
  const faceButton = document.getElementById('face-measurement-button') as BUI.Button;
  const volumeButton = document.getElementById('volume-measurement-button') as BUI.Button;


  if (edgeButton) {
    edgeButton.label = edgeMeasurement.enabled ? "Disable Edge" : "Enable Edge";
    edgeButton.active = edgeMeasurement.enabled;
  }

  if (faceButton) {
    faceButton.label = faceMeasurement.enabled ? "Disable Face" : "Enable Face";
    faceButton.active = faceMeasurement.enabled; 
  }

  if (volumeButton) {
    volumeButton.label = volumeMeasurement.enabled ? "Disable Volume" : "Enable Volume";
    volumeButton.active = volumeMeasurement.enabled;
  }
};


const toolbar = BUI.Component.create(() => {
  return BUI.html`
    <bim-toolbar>
      ${load(components)}
      ${camera(world)}
      ${selection(components, world)}
      ${clipEdges(components, world)}

      <bim-panel-section label="Measurement" icon="mdi:ruler" collapsed>
        <bim-label vertical>
          Use Keyboard
        </bim-label>
        <bim-label vertical>
          O: Delete one
          S: Delete all
          L: Recover deleted Edges
        </bim-label>
        <bim-button 
          id="edge-measurement-button"
          @click=${() => {
            edgeMeasurement.enabled = !edgeMeasurement.enabled;
            faceMeasurement.enabled = false; 
            volumeMeasurement.enabled = false;
            updateButtons(); 
          }}
          label="Enable Edge"
          >
        </bim-button>

        <bim-button 
          id="face-measurement-button"
          @click=${() => {
            faceMeasurement.enabled = !faceMeasurement.enabled;
            edgeMeasurement.enabled = false; 
            volumeMeasurement.enabled = false;
            updateButtons();
          }}
          label="Enable Face"
          >
        </bim-button>

        <bim-button 
          id="volume-measurement-button"
          @click=${() => {
            volumeMeasurement.enabled = !volumeMeasurement.enabled;
            edgeMeasurement.enabled = false;
            faceMeasurement.enabled = false;
            updateButtons(); 
          }}
          label="Enable Volume"
          >
        </bim-button>
      </bim-panel-section> 
      <bim-button @click=${placeMarkerOnSelected} 
        label="Place Marker" 
        icon="mdi:map-marker" 
        tooltip-title="Place Marker" 
        tooltip-text="Places a marker on the selected fragment.">
      </bim-button>
    </bim-toolbar>
  `;
});


let savedEdgeMeasurements: number[][] = [];
let savedFaceMeasurements: OBF.SerializedAreaMeasure[] = [];

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyO") {
    if (edgeMeasurement.enabled) {
      edgeMeasurement.delete();
    } else if (faceMeasurement.enabled) {
      faceMeasurement.delete();
    } else {
      console.log("No measurement tool is active");
    }
  } else if (event.code === "KeyS") {
    if (edgeMeasurement.enabled) {
      savedEdgeMeasurements = edgeMeasurement.get();
      edgeMeasurement.deleteAll();
    } else if (faceMeasurement.enabled) {
      savedFaceMeasurements = faceMeasurement.get();
      faceMeasurement.deleteAll();
    }
  } else if (event.code === "KeyL") {
    if (edgeMeasurement.enabled && savedEdgeMeasurements.length > 0) {
      edgeMeasurement.set(savedEdgeMeasurements);
    } else if (faceMeasurement.enabled && savedFaceMeasurements.length > 0) {
      faceMeasurement.set(savedFaceMeasurements);
    }
  }
});


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



// control leftPanel size
let isResizing = false;
let initialMouseX = 0;
let initialPanelWidth = 0;

const onMouseMove = (event: MouseEvent) => {
  if (isResizing) {
    const deltaX = event.clientX - initialMouseX;
    const newWidth = initialPanelWidth + deltaX;
    if ((leftPanel && newWidth > 0) && (leftPanel && newWidth < app.offsetWidth * 2/3)) { // minimum & maximum size
      leftPanel.style.width = `${newWidth}px`;
    }
  }
};

const onMouseUp = () => {
  if (isResizing) {
    isResizing = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
};

const onResizeHandleMouseDown = (event: MouseEvent) => {
  isResizing = true;
  initialMouseX = event.clientX;
  if (leftPanel) {
    initialPanelWidth = leftPanel.offsetWidth;
  }
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};

leftPanel.addEventListener('mousedown', onResizeHandleMouseDown);
leftPanel.addEventListener('mousemove', (event) => {
  if (event.target instanceof HTMLElement) {
    const target = event.target as HTMLElement;
    if (event.clientX > leftPanel.offsetWidth - 5) {
      target.style.cursor = 'col-resize';
    } else {
      target.style.cursor = 'default';
    }
  }
});




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