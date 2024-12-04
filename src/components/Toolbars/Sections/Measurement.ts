import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";

interface MeasurementTools {
  edge: OBF.EdgeMeasurement;
  face: OBF.FaceMeasurement;
  volume: OBF.VolumeMeasurement;
}

export default function measurement(components: OBC.Components, world: OBC.World, viewport: BUI.Viewport) {

  const tools: MeasurementTools = {
    edge: components.get(OBF.EdgeMeasurement),
    face: components.get(OBF.FaceMeasurement),
    volume: components.get(OBF.VolumeMeasurement)
  };

  Object.values(tools).forEach(tool => {
    tool.world = world;
    tool.enabled = false;
  });

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
      } else if (tools.face.enabled && savedFaceMeasurements.length > 0) {
        tools.face.set(savedFaceMeasurements);
      }
    }
  });

  const highlighter = components.get(OBF.Highlighter);
  highlighter.events.select.onHighlight.add((event) => {
    if (tools.volume.enabled) {
      const volume = tools.volume.getVolumeFromFragments(event);
      console.log(volume);
    }
  });

  highlighter.events.select.onClear.add(() => {
    if (tools.volume.enabled) {
      tools.volume.clear();
    }
  });

  viewport.ondblclick = () => {
    if (tools.edge.enabled) {
      tools.edge.create();
    } else if (tools.face.enabled) {
      tools.face.create();
    }
  };

  return BUI.html`
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