import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";

interface MeasurementTools {
  edge: OBF.EdgeMeasurement;
  face: OBF.FaceMeasurement;
  volume: OBF.VolumeMeasurement;
}

export default function measurement(components: OBC.Components, worlds: OBC.World, viewport: BUI.Viewport) {
  
  let edgeCnt = 0;
  let faceCnt = 0;
  const fragmentsManager = components.get(OBC.FragmentsManager);
  const edgeMeasurementsMap = new Map<string, Map<string, number[]>>();   
  const faceMeasurementsMap = new Map<string, Map<string, OBF.AreaSelection>>();   

  const tools: MeasurementTools = {
    edge: components.get(OBF.EdgeMeasurement),
    face: components.get(OBF.FaceMeasurement),
    volume: components.get(OBF.VolumeMeasurement)
  };

  Object.values(tools).forEach(tool => {
    tool.world = worlds;
    tool.enabled = false;
  });

  const createEdgeMeasurement = () => {

    if (!components) {
      throw new Error("Components instance is not initialized.");
    }

    const select = highlighter.selection.select;
    const fragmentKeys = Object.keys(select);
    const fragmentID = fragmentKeys[0];
    const fragment = fragmentsManager.list.get(fragmentID);

    if (!fragment || !fragment.mesh || !fragment.mesh.parent) {
      console.error("Fragment or its mesh/parent is not valid.");
      return;
    }

    const modelUUID = fragment.mesh.parent?.uuid;
    if (!modelUUID) {
      console.error('Not found Model UUID');
      return;
    }

    if (!edgeMeasurementsMap.has(modelUUID)) {
      edgeMeasurementsMap.set(modelUUID, new Map<string, number[]>());
    }

    const edgeMeasurementsForModel = edgeMeasurementsMap.get(modelUUID);
    if (edgeMeasurementsForModel?.has(fragmentID)) {
      return edgeMeasurementsForModel.get(fragmentID); 
    }

    tools.edge.create();
    console.log("createEdge --- edgeCnt:", edgeCnt);

    const edgeMeasurement = tools.edge.get().at(edgeCnt++);
    if (edgeMeasurement)
    {
      edgeMeasurementsForModel?.set(fragmentID, edgeMeasurement); 
    }

  };


  const createFaceMeasurement = () => {

    if (!components) {
      throw new Error("Components instance is not initialized.");
    }

    const select = highlighter.selection.select;
    const fragmentKeys = Object.keys(select);
    const fragmentID = fragmentKeys[0];
    const fragment = fragmentsManager.list.get(fragmentID);

    if (!fragment || !fragment.mesh || !fragment.mesh.parent) {
      console.error("Fragment or its mesh/parent is not valid.");
      return;
    }

    const modelUUID = fragment.mesh.parent?.uuid;
    if (!modelUUID) {
      console.error('Not found Model UUID');
      return;
    }

    if (!faceMeasurementsMap.has(modelUUID)) {
      faceMeasurementsMap.set(modelUUID, new Map<string, OBF.AreaSelection>());
    }
    const faceMeasurementsForModel = faceMeasurementsMap.get(modelUUID);
    
    if (faceMeasurementsForModel?.has(fragmentID)) {
      return faceMeasurementsForModel.get(fragmentID); 
    }

    tools.face.create();

    const faceMeasurement = tools.face.selection.at(faceCnt++);
    if (faceMeasurement)
    {
      faceMeasurementsForModel?.set(fragmentID, faceMeasurement); 
    }
  };


  viewport.ondblclick = () => {
    if (tools.edge.enabled) {
      createEdgeMeasurement();
    }
    if (tools.face.enabled) {
      createFaceMeasurement();
    }
  };


  let savedEdgeMeasurements: number[][] = [];
  let savedFaceMeasurements: OBF.SerializedAreaMeasure[] = [];


  const updateButtons = () => {
    const edgeButton = document.getElementById('edge-measurement-button') as BUI.Button;
    const faceButton = document.getElementById('face-measurement-button') as BUI.Button;
    const volumeButton = document.getElementById('volume-measurement-button') as BUI.Button;

    if (edgeButton) {
      edgeButton.label = tools.edge.enabled ? "Disable Edge" : "Enable Edge";
      edgeButton.active = tools.edge.enabled;
    }

    if (faceButton) {
      faceButton.label = tools.face.enabled ? "Disable Face" : "Enable Face";
      faceButton.active = tools.face.enabled;
    }

    if (volumeButton) {
      volumeButton.label = tools.volume.enabled ? "Disable Volume" : "Enable Volume";
      volumeButton.active = tools.volume.enabled;
    }
  };

  window.addEventListener("keydown", (event) => {

    const selectedFragments = highlighter.selection.select;
    const fragmentKeys = Object.keys(selectedFragments);
    
    if (fragmentKeys.length === 0) return; 
  
    const fragmentID = fragmentKeys[0];
    const fragment = fragmentsManager.list.get(fragmentID);
  
    if (!fragment || !fragment.mesh || !fragment.mesh.parent) {
      console.error("Fragment or its mesh/parent is not valid.");
      return;
    }

    if (event.code === "KeyO") {
      if (tools.edge.enabled) {
        tools.edge.delete();
      } else if (tools.face.enabled) {
        tools.face.delete();
      }
    } else if (event.code === "KeyS") {
      if (tools.edge.enabled) {
        savedEdgeMeasurements = tools.edge.get();
        tools.edge.deleteAll();
      } else if (tools.face.enabled) {
        savedFaceMeasurements = tools.face.get();
        tools.face.deleteAll();
      }
    } else if (event.code === "KeyL") {
      if (tools.edge.enabled && savedEdgeMeasurements.length > 0) {
        tools.edge.set(savedEdgeMeasurements);
        savedEdgeMeasurements = [];
      } else if (tools.face.enabled && savedFaceMeasurements.length > 0) {
        tools.face.set(savedFaceMeasurements);
        savedFaceMeasurements = [];
      }
    }
  });


  const highlighter = components.get(OBF.Highlighter);

  highlighter.events.select.onHighlight.add((event) => {

    const selectedFragments = highlighter.selection.select;
    const fragmentKeys = Object.keys(selectedFragments);
    
    if (fragmentKeys.length === 0) return;

    const fragmentID = fragmentKeys[0];
    const fragment = fragmentsManager.list.get(fragmentID);

    if (!fragment || !fragment.mesh || !fragment.mesh.parent) {
      console.error("Fragment or its mesh/parent is not valid.");
      return;
    }

    const modelId = fragment.mesh.parent?.uuid; 
    if (!modelId) {
      console.error('Model ID not found for the selected fragment.');
      return;
    }

    if (tools.volume.enabled) {
      tools.volume.getVolumeFromFragments(event);
    }
  });

  highlighter.events.select.onClear.add(() => {
    tools.volume.clear();
  });



  fragmentsManager.onFragmentsDisposed.add(({ fragmentIDs }) => {

    // Delete volumeMeasurements
    highlighter.clear();

    // Delete edgeMeasurements
    fragmentIDs.forEach(fragmentID => {
      const modelUUID = Array.from(edgeMeasurementsMap.keys()).find(uuid => {
        const measurements = edgeMeasurementsMap.get(uuid);
        return measurements && measurements.has(fragmentID);
      });

      if (modelUUID) {
        console.log("modelUUID?", modelUUID);
        if (tools.edge.get().length != 0){
          console.log("여기?", tools.edge.get());
          tools.edge.deleteAll();
          console.log("deleteAll--?", tools.edge.get());
          edgeCnt = 0;
        }
        const measurements = edgeMeasurementsMap.get(modelUUID);
        if (measurements) {
          const edgeMeasurement = measurements?.get(fragmentID); 
          if (edgeMeasurement) {
            console.log("edgeMeasurement? " , measurements?.get(fragmentID));
            measurements.delete(fragmentID);
            console.log("===after delete edgeMeasurement?====" , measurements?.get(fragmentID));
            if (measurements.size === 0) {
              edgeMeasurementsMap.delete(modelUUID);
            }
          }
        }
      }
    });

    // Delete faceMeasurements
    fragmentIDs.forEach(fragmentID => {
      const modelUUID = Array.from(faceMeasurementsMap.keys()).find(uuid => {
          const measurements = faceMeasurementsMap.get(uuid);        
          return measurements && measurements.has(fragmentID);
      });

      if (modelUUID) {
        const measurements = faceMeasurementsMap.get(modelUUID);
        if (measurements) {
          const faceMeasurement = measurements?.get(fragmentID); 
          if (faceMeasurement) {
            faceMeasurement.mesh.removeFromParent();
            faceMeasurement.label.dispose();
            measurements.delete(fragmentID);
            if (measurements.size === 0) {
              faceMeasurementsMap.delete(modelUUID);
            }
          }
        }
      }
    });
  });



  return BUI.html`
    <bim-panel-section label="Measurement" icon="mdi:ruler" collapsed>
      <bim-label vertical>
        Use Keyboard
      </bim-label>
      <bim-label vertical>
        O: Delete one
        S: Save & Delete all
        L: Recover all
      </bim-label>
      <bim-button 
        id="edge-measurement-button"
        @click=${() => {
          tools.edge.enabled = !tools.edge.enabled;
          tools.face.enabled = false;
          tools.volume.enabled = false;
          updateButtons();
        }}
        label="Enable Edge"
      >
      </bim-button>
      <bim-button 
        id="face-measurement-button"
        @click=${() => {
          tools.face.enabled = !tools.face.enabled;
          tools.edge.enabled = false;
          tools.volume.enabled = false;
          updateButtons();
        }}
        label="Enable Face"
      >
      </bim-button>
      <bim-button 
        id="volume-measurement-button"
        @click=${() => {
          tools.volume.enabled = !tools.volume.enabled;
          tools.edge.enabled = false;
          tools.face.enabled = false;
          updateButtons();
        }}
        label="Enable Volume"
      >
      </bim-button>
    </bim-panel-section>
  `;
}