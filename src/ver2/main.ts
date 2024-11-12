import * as THREE from "three"
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import projectInformation from "../components/Panels/ProjectInformation";
import elementData from "../components/Panels/Selection";
import settings from "../components/Panels/Settings";
import load from "../components/Toolbars/Sections/Import";
import help from "../components/Panels/Help";
import camera from "../components/Toolbars/Sections/Camera";
import selection from "../components/Toolbars/Sections/Selection";
import clipEdges from "../components/Toolbars/Sections/ClipEdges";
import { AppManager } from "../bim-components";
import hiderPanel from "../components/Panels/Sections/Hider";
import * as WEBIFC from "web-ifc";
import * as OBCF from "@thatopen/components-front";
import { IProject, ProjectStatus, UserRole } from "../components/classes/Project"
import { ProjectsManager } from "../components/classes/ProjectsManager"

function showModal(id: string) {
  const modal = document.getElementById(id)
  if (modal && modal instanceof HTMLDialogElement) {
    modal.showModal()
  } else {
    console.warn("The provided modal wasn't found. ID: ", id)
  }
}

function closeModal(id: string) {
  const modal = document.getElementById(id)
  if (modal && modal instanceof HTMLDialogElement) {
    modal.close()
  } else {
    console.warn("The provided modal wasn't found. ID: ", id)
  }
}

const projectsListUI = document.getElementById("projects-list") as HTMLElement
const projectsManager = new ProjectsManager(projectsListUI)


// This document object is provided by the browser, and its main purpose is to help us interact with the DOM.
const newProjectBtn = document.getElementById("new-project-btn")
if (newProjectBtn) {
  newProjectBtn.addEventListener("click", () => {showModal("new-project-modal")})
} else {
  console.warn("New projects button was not found")
}

const projectForm = document.getElementById("new-project-form")
if (projectForm && projectForm instanceof HTMLFormElement) {
  projectForm.addEventListener("submit", (e) => {
    e.preventDefault()
    const formData = new FormData(projectForm)
    const projectData: IProject = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      status: formData.get("status") as ProjectStatus,
      userRole: formData.get("userRole") as UserRole,
      finishDate: new Date(formData.get("finishDate") as string)
    }
    try {
      const project = projectsManager.newProject(projectData)
      console.log(project)
      projectForm.reset()
      closeModal("new-project-modal")
    } catch (err) {
      alert(err)
    }
  })
} else {
	console.warn("The project form was not found. Check the ID!")
}


const exportProjectsBtn= document.getElementById("export-projects-btn")
if (exportProjectsBtn) {
  exportProjectsBtn.addEventListener("click", () => {
    projectsManager.exportToJSON()
  })
}

const importProjectsBtn = document.getElementById("import-projects-btn")
if (importProjectsBtn) {
  importProjectsBtn.addEventListener("click", () => {
    projectsManager.importFromJSON()
  })
}

BUI.Manager.init();


// OpenBIM Components Viewer
const components = new OBC.Components()
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
// ---


// const sceneComponent = new OBC.SimpleScene(components)
// components.scene = sceneComponent
// const scene = sceneComponent.get()
// sceneComponent.setup()
// scene.background = null

// const viewerContainer = document.getElementById("viewer-container") as HTMLDivElement
// const rendererComponent = new OBF.PostproductionRenderer(components, viewerContainer)
// components.renderer = rendererComponent

// const cameraComponent = new OBC.OrthoPerspectiveCamera(components)
// components.camera = cameraComponent

// const raycasterComponent = new OBC.SimpleRaycaster(components)
// components.raycaster = raycasterComponent

// components.init()
// cameraComponent.updateAspect()
// rendererComponent.postproduction.enabled = true

// const ifcLoader = new OBC.FragmentIfcLoader(components)
// ifcLoader.settings.wasm = {
//   path: "https://unpkg.com/web-ifc@0.0.43/",
//   absolute: true
// }

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

const marker = components.get(OBCF.Marker);
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



fragments.onFragmentsLoaded.add(async (model) => {
  if (model.hasProperties) {
    await indexer.process(model);
    classifier.byEntity(model);
    await classifier.bySpatialStructure(model, {
      isolate: new Set([WEBIFC.IFCBUILDINGSTOREY]),
    });

    updateHiderPanel(); 
  }

  for (const fragment of model.items) {
    world.meshes.add(fragment.mesh);
    culler.add(fragment.mesh);
  }

  world.scene.three.add(model);
  setTimeout(async () => {
    world.camera.fit(world.meshes, 0.8);
  }, 50);
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


fragments.onFragmentsDisposed.add(({ fragmentIDs }) => {
  for (const fragmentID of fragmentIDs) {
    const mesh = [...world.meshes].find((mesh) => mesh.uuid === fragmentID);
    if (mesh) world.meshes.delete(mesh);
  }
});


const projectInformationPanel = projectInformation(components);
const elementDataPanel = elementData(components);

const app = document.getElementById("app") as BUI.Grid;

// EdgeMeasurement
const edgeMeasurement = components.get(OBCF.EdgeMeasurement);
edgeMeasurement.world = world;
edgeMeasurement.enabled = false;

// FaceMeasurement
const faceMeasurement = components.get(OBCF.FaceMeasurement);
faceMeasurement.world = world;
faceMeasurement.enabled = false;

// VolumeMeasurement
const volumeMeasurement = components.get(OBCF.VolumeMeasurement);
volumeMeasurement.world = world;
volumeMeasurement.enabled = false;

highlighter.events.select.onHighlight.add((event) => {
  if (volumeMeasurement.enabled) {
    const volume = volumeMeasurement.getVolumeFromFragments(event);
  }
});

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
let savedFaceMeasurements: OBCF.SerializedAreaMeasure[] = [];

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
      <bim-tab name="help" label="Help" icon="material-symbols:help">
        ${help}
      </bim-tab>
      <bim-tab name="hider" label="Hider" icon="mdi:eye-off-outline">
        ${hiderPanel(components)}
      </bim-tab>
    </bim-tabs> 
  `;
});

app.layouts = {
  main: {
    template: `
      "leftPanel viewport" 1fr
      /26rem 1fr
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
      "empty elementDataPanel" 1fr
      "toolbar elementDataPanel" auto
      /1fr 24rem
    `,
    elements: {
      toolbar,
      elementDataPanel,
    },
  },
};

viewportGrid.layout = "main";

// const highlighter = new OBC.FragmentHighlighter(components)
// highlighter.setup()

// const propertiesProcessor = new OBC.IfcPropertiesProcessor(components)
// highlighter.events.select.onClear.add(() => {
//   propertiesProcessor.cleanPropertiesList()
// })

// const classifier = new OBC.FragmentClassifier(components)

// const classificationsWindow = new OBC.FloatingWindow(components)
// components.ui.add(classificationsWindow)
// classificationsWindow.title = "Model Groups"
// classificationsWindow.visible = false

// const classificationsBtn = new OBC.Button(components)
// classificationsBtn.materialIcon = "account_tree"
// classificationsBtn.onClick.add(() => {
//   classificationsWindow.visible = !classificationsWindow.visible
//   classificationsBtn.active = classificationsWindow.visible
// })

// async function createModelTree() {
//   const fragmentTree = new OBC.FragmentTree(components)
//   await fragmentTree.init()
//   await fragmentTree.update(["model", "storeys", "entities"])
//   const tree = fragmentTree.get().uiElement.get("tree")
//   fragmentTree.onHovered.add((fragmentMap) => {
//     highlighter.highlightByID("hover", fragmentMap)
//   })
//   fragmentTree.onSelected.add((fragmentMap) => {
//     highlighter.highlightByID("select", fragmentMap)
//   })
//   return tree
// }


// const hider = new OBC.FragmentHider(components);
// await hider.loadCached();


// ifcLoader.onIfcLoaded.add(async (model) => {
//   highlighter.update()

//   classifier.byStorey(model)
//   classifier.byEntity(model)
//   classifier.byModel(model.name, model)
//   console.log(classifier)
//   const tree = await createModelTree()
//   await classificationsWindow.slots.content.dispose(true)
//   classificationsWindow.addChild(tree)

//   const classifications = classifier.get()
//   const storeys = {}
//   const storeyNames = Object.keys(classifications.storeys)
//   for (const name of storeyNames) {
//     storeys[name] = true
//   }
//   const classes = {}
//   const classNames = Object.keys(classifications.entities)
//   for (const name of classNames) {
//     classes[name] = true
//   }
//   const gui = new GUI()
//   const storeysGui = gui.addFolder("Storeys");
//   for (const name in storeys) {
//     storeysGui.add(storeys, name).onChange(async (visible) => {
//       const found = await classifier.find({ storeys: [name] });
//       hider.set(visible, found);
//     });
//   }
//   const entitiesGui = gui.addFolder("Classes");
//   for (const name in classes) {
//     entitiesGui.add(classes, name).onChange(async (visible) => {
//       const found = await classifier.find({ entities: [name] });
//       hider.set(visible, found);
//     });
//   }

//   propertiesProcessor.process(model)
//   highlighter.events.select.onHighlight.add((fragmentMap) => {
//     const expressID = [...Object.values(fragmentMap)[0]][0]
//     propertiesProcessor.renderProperties(model, Number(expressID))
//   })
// })

// const propertiesFinder = new OBC.IfcPropertiesFinder(components)
// await propertiesFinder.init()
// propertiesFinder.onFound.add((fragmentIdMap) => {
//   highlighter.highlightByID("select", fragmentIdMap)
// })

// const todoCreator = new TodoCreator(components)
// await todoCreator.setup()

// const simpleQto = new SimpleQto(components)
// await simpleQto.setup()


// const toolbar = new OBC.Toolbar(components)
// toolbar.addChild(
//   ifcLoader.uiElement.get("main"),
//   classificationsBtn,
//   propertiesProcessor.uiElement.get("main"),
//   todoCreator.uiElement.get("activationBtn"),
//   simpleQto.uiElement.get("activationBtn"),
//   propertiesFinder.uiElement.get("main"),
//   hider.uiElement.get("main"),
// )
// components.ui.addToolbar(toolbar)