import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";

export default (components: OBC.Components, world: OBC.World) => {
  const clipper = components.get(OBC.Clipper);
  clipper.enabled = false;

  const edges = components.get(OBF.ClipEdges);
  clipper.Type = OBF.EdgesPlane;

  const highlighter = components.get(OBF.Highlighter);

  // clipping style
  const blueFill = new THREE.MeshBasicMaterial({ color: "lightblue", side: THREE.DoubleSide });
  const blueLine = new THREE.LineBasicMaterial({ color: "blue" });
  const blueOutline = new THREE.MeshBasicMaterial({
    color: "blue",
    opacity: 0.5,
    side: THREE.DoubleSide,
    transparent: true,
  });

  const applyClippingStyles = (fragments: OBC.FragmentsManager) => {
    fragments.list.forEach(fragment => {
      edges.styles.create("Blue lines", new Set([fragment.mesh]), world, blueLine, blueFill, blueOutline);
    });
  };

  // apply clipping
  const fragments = components.get(OBC.FragmentsManager);
  fragments.onFragmentsLoaded.add(model => {
    applyClippingStyles(fragments);
  });

  const createClippingPlaneForSelection = () => {
    const selection = highlighter.selection; 
    const boundingBox = new THREE.Box3();

    if (selection && Object.keys(selection).length > 0) {
      Object.entries(selection).forEach(([fragmentID, fragmentSelection]) => {
        const fragment = fragments.list.get(fragmentID);
        if (fragment) {
          fragmentSelection.ids.forEach(() => {
            boundingBox.expandByObject(fragment.mesh); 
          });
        }
      });

      clipper.create(world); 
      edges.update(true);
      
    } else {
      console.error('Not found clipping');
    }
  };

  // create clipping plane
  const appContainer = document.getElementById("app");
  if (appContainer) {
    appContainer.ondblclick = () => {
      if (clipper.enabled) {
        createClippingPlaneForSelection();
      }
    };
  } else {
    console.error("Not found appContainer");
  }

  // delete clipping plane
  window.onkeydown = (event) => {
    if (event.code === "Delete" || event.code === "Backspace") {
      if (clipper.enabled) {
        clipper.delete(world);
      }
    }
  };

  return BUI.Component.create<BUI.PanelSection>(() => {
    return BUI.html`
      <bim-panel-section label="Clipping Controls" icon="mdi:content-cut" collapsed>
        <bim-checkbox label="Clipper enabled" 
          @change="${({ target }: { target: BUI.Checkbox }) => {
            clipper.enabled = target.value;
            edges.visible = target.value;
          }}">
        </bim-checkbox>
        
        <bim-checkbox label="Clipper visible" checked 
          @change="${({ target }: { target: BUI.Checkbox }) => {
            clipper.visible = target.value;
          }}">
        </bim-checkbox>   

        <bim-color-input 
          label="Planes Color" color="#202932" 
          @input="${({ target }: { target: BUI.ColorInput }) => {
            clipper.material.color.set(target.color);
          }}">
        </bim-color-input>
        
        <bim-number-input 
          slider step="0.01" label="Planes opacity" value="0.2" min="0.1" max="1"
          @change="${({ target }: { target: BUI.NumberInput }) => {
            clipper.material.opacity = target.value;
          }}">
        </bim-number-input>
        
        <bim-number-input 
          slider step="0.1" label="Planes size" value="5" min="2" max="10"
          @change="${({ target }: { target: BUI.NumberInput }) => {
            clipper.size = target.value;
          }}">
        </bim-number-input>
        
        <bim-button 
          label="Delete all" 
          @click="${() => {
            clipper.deleteAll();
          }}">  
        </bim-button>
        
      </bim-panel-section>
    `;
  });
}