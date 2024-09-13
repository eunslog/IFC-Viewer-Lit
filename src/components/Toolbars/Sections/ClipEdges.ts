import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";

export default (components: OBC.Components, world: OBC.World) => {
  const clipper = components.get(OBC.Clipper);
  clipper.enabled = true;

  const edges = components.get(OBF.ClipEdges);
  clipper.Type = OBF.EdgesPlane;

  const highlighter = components.get(OBF.Highlighter);

  // 클리핑 스타일 정의
  const blueFill = new THREE.MeshBasicMaterial({ color: "lightblue", side: THREE.DoubleSide });
  const blueLine = new THREE.LineBasicMaterial({ color: "blue" });
  const blueOutline = new THREE.MeshBasicMaterial({
    color: "blue",
    opacity: 0.5,
    side: THREE.DoubleSide,
    transparent: true,
  });

  // IFC 모델에 클리핑 스타일 적용
  const applyClippingStyles = (fragments: OBC.FragmentsManager) => {
    fragments.list.forEach(fragment => {
      edges.styles.create("Blue lines", new Set([fragment.mesh]), world, blueLine, blueFill, blueOutline);
    });
  };

  // IFC 파일이 로드되었을 때 클리핑 적용
  const fragments = components.get(OBC.FragmentsManager);
  fragments.onFragmentsLoaded.add(model => {
    applyClippingStyles(fragments);
  });

  // 선택한 도형의 경계에 맞게 클리핑 평면 생성
  const createClippingPlaneForSelection = () => {
    const selection = highlighter.selection; // 선택된 도형 가져오기
    const boundingBox = new THREE.Box3(); // 경계 상자

    if (selection && Object.keys(selection).length > 0) {
      // 경계 상자 확장
      Object.entries(selection).forEach(([fragmentID, fragmentSelection]) => {
        const fragment = fragments.list.get(fragmentID);
        if (fragment) {
          fragmentSelection.ids.forEach(() => {
            boundingBox.expandByObject(fragment.mesh); // 선택된 도형의 경계 확장
          });
        }
      });

      clipper.create(world); // 클리핑 평면 생성
      edges.update(true);
      
    } else {
      console.error('Not found clipping');
    }
  };

  // 클리핑 플레인 생성 이벤트 (더블 클릭)
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

  // 클리핑 플레인 삭제 이벤트 (Delete 키)
  window.onkeydown = (event) => {
    if (event.code === "Delete" || event.code === "Backspace") {
      if (clipper.enabled) {
        clipper.delete(world);
      }
    }
  };

  // UI 생성
  return BUI.Component.create<BUI.PanelSection>(() => {
    return BUI.html`
      <bim-toolbar-section label="Clipping Controls" icon="mdi:content-cut">
        <bim-checkbox label="Clipper enabled" checked 
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
        
      </bim-toolbar-section>
    `;
  });
}