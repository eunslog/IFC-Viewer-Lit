/* eslint-disable no-alert */
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as FRAGS from "@thatopen/fragments";
import Zip from "jszip";

const askForFile = (extension: string) => {
  const input = document.createElement("input");
  return new Promise<File | null>((resolve) => {
    input.type = "file";
    input.accept = extension;
    input.multiple = false;
    input.onchange = () => {
      const filesList = input.files;
      if (!(filesList && filesList[0])) {
        resolve(null);
        return;
      }
      const file = filesList[0];
      resolve(file);
    };
    input.click();
  });
};

const saveManagersToDB = async (ifcId: number, managerIds: number[]) => {
  const payload = {
    ifcId,
    managerIds,
  };
  
  const response = await fetch("/api/ifc_manager", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return response;
};

const saveToDB = async (file: File, content: Uint8Array | string) => {

  try {
    // Create modal
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';

    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'hsl(210 10% 5%)';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '5px';
    modalContent.style.width = '300px';
    modal.appendChild(modalContent);

    const messageLabel = document.createElement('bim-label');
    messageLabel.textContent = 'Please select managers.';
    messageLabel.style.fontSize = '15px';
    messageLabel.style.marginBottom = '10px';
    messageLabel.style.lineHeight = '1.5';
    modalContent.appendChild(messageLabel);

    // Manager dropdown
    const managerDropdown = document.createElement('bim-dropdown');
    managerDropdown.multiple = true;
    await fetch('/api/manager')
      .then(response => response.json())
      .then(managers => {
        managers.forEach((manager: { id: number; name: string; position: string }) => {
          const option = document.createElement('bim-option');
          option.setAttribute('label', `${manager.name} [${manager.position}]`);
          option.setAttribute('value', manager.id.toString());
          managerDropdown.appendChild(option);
        });
      });

    modalContent.appendChild(managerDropdown);

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.marginTop = '20px';

    const confirmButton = document.createElement('bim-button');
    confirmButton.label = "확인";
    confirmButton.style.marginRight = '10px';
    buttonContainer.appendChild(confirmButton);

    const cancelButton = document.createElement('bim-button');
    cancelButton.label = "취소";
    cancelButton.onclick = () => {
      document.body.removeChild(modal);
    };
    buttonContainer.appendChild(cancelButton);

    modalContent.appendChild(buttonContainer);

    document.body.appendChild(modal);

    // Insert DB
    confirmButton.onclick = async () => {
      const selectedOptions = Array.from(managerDropdown.value);

      const payload = {
        name: file.name,
        content: content instanceof Uint8Array ? Array.from(content) : content,
      };

      const ifcResponse = await fetch("/api/ifc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (ifcResponse.ok) {
        const result = await ifcResponse.json();
        const ifcId = result.id;
        const saveManagers = await saveManagersToDB(ifcId, selectedOptions);
        document.body.removeChild(modal);
  
        if (saveManagers.ok) {
          alert(`데이터베이스에 저장되었습니다.`);
          const event = new CustomEvent("ifcSaved");
          window.dispatchEvent(event);
        } else {
          console.error("데이터베이스 저장 실패");
          alert("데이터베이스 저장에 실패하였습니다.");
        }
          } else {
        const errorText = await ifcResponse.text();
        console.error("데이터베이스 저장 실패:", errorText);
        alert("데이터베이스 저장에 실패하였습니다.");
      }

    };
    
    return true;

    } catch (error) {
      console.error("DB 저장 중 오류 발생:", error);
      alert("DB 저장 중 오류가 발생하였습니다.");
      return false;
    }
};



export default (components: OBC.Components) => {
  const [loadBtn] = CUI.buttons.loadIfc({ components });
  loadBtn.label = "IFC";
  loadBtn.tooltipTitle = "Load IFC";
  loadBtn.tooltipText =
    "Loads an IFC file into the scene. The IFC gets automatically converted to Fragments.";

  const fragments = components.get(OBC.FragmentsManager);
  const indexer = components.get(OBC.IfcRelationsIndexer);
  const fragmentIfcLoader = components.get(OBC.IfcLoader);

  const loadFragments = async () => {
    const fragmentsZip = await askForFile(".zip");
    if (!fragmentsZip) return;

    const zipBuffer = await fragmentsZip.arrayBuffer();
    const uint8ArrayBuffer = new Uint8Array(zipBuffer);

    // Check if file saves
    if (confirm("데이터베이스에 저장하시겠습니까?")) 
    {
      const isSaved = await saveToDB(fragmentsZip, uint8ArrayBuffer);
      if (isSaved) {
        return;
      } 
    }

    const zip = new Zip();
    await zip.loadAsync(zipBuffer);
    const geometryBuffer = zip.file("geometry.frag");
    if (!geometryBuffer) {
      alert("No geometry found in the file!");
      return;
    }

    const geometry = await geometryBuffer.async("uint8array");

    let properties: FRAGS.IfcProperties | undefined;
    const propsFile = zip.file("properties.json");
    if (propsFile) {
      const json = await propsFile.async("string");
      properties = JSON.parse(json);
    }

    let relationsMap: OBC.RelationsMap | undefined;
    const relationsMapFile = zip.file("relations-map.json");
    if (relationsMapFile) {
      const json = await relationsMapFile.async("string");
      relationsMap = indexer.getRelationsMapFromJSON(json);
    }

    fragments.load(geometry, { properties, relationsMap });
  };

  const loader = components.get(OBF.IfcStreamer);

  // WIP!!
  async function loadTiles() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.multiple = true;
    input.addEventListener("change", async () => {
      if (!input.files) return;
      const grouped: Record<string, { geometry: File; properties?: File }> = {};
      for (const file of input.files) {
        const { name } = file;
        const key = name
          .replace("-processed.json", "")
          .replace("-processed-properties.json", "");
        if (!grouped[key]) {
          grouped[key] = { geometry: new File([], "asd") };
        }
        if (name.includes("-processed.json")) {
          grouped[key].geometry = file;
        } else if (name.includes("-processed-properties.json")) {
          grouped[key].properties = file;
        }
      }

      const pairs: { geometry: File; properties?: File }[] = [];
      for (const key in grouped) {
        const pair = grouped[key];
        if (pair.geometry) pairs.push(pair);
      }

      for (const pair of pairs) {
        const { geometry, properties } = pair;
        const geometryData = JSON.parse(await geometry.text());
        let propertiesData;
        if (properties) {
          propertiesData = JSON.parse(await properties.text());
        }
        try {
          loader.load(geometryData, true, propertiesData);
        } catch (error) {
          alert(error);
        }
      }
    });

    input.click();
  }


  function download(file: File) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function streamIfc() {
    const ifcFile = await askForFile(".ifc");
    if (!ifcFile) return;

    const data = new Uint8Array(await ifcFile.arrayBuffer());

    // Check if file saves
    const shouldSave = confirm("데이터베이스에 저장하시겠습니까?");
    if (shouldSave) {
      const isSaved = await saveToDB(ifcFile, data);
      if (isSaved) {
        return; 
      }
    }
    
    try {
      const model = await fragmentIfcLoader.load(data);
      model.name = ifcFile.name.replace(".ifc", "");
    } catch (error) {
      console.error("Error while loading IFC model:", error);
    }
  }

  async function exportFragments() {
    if (!fragments.groups.size) {
      return;
    }
    const group = Array.from(fragments.groups.values())[0];
    const data = fragments.export(group);
    download(new File([new Blob([data])], "exported_fragment.frag"));
  
    const properties = group.getLocalProperties();
    if (properties) {
      download(new File([JSON.stringify(properties)], "exported_properties.json"));
    }
  }

  function disposeFragments() {
    fragments.dispose();
  }

  return BUI.Component.create<BUI.PanelSection>(() => {
    return BUI.html`
      <bim-panel-section label="Import" icon="solar:import-bold" collapsed style="flex: 1;">
        ${loadBtn}
        <bim-button @click=${loadFragments} label="Fragments" icon="fluent:puzzle-cube-piece-20-filled" tooltip-title="Load Fragments"
          tooltip-text="Loads a pre-converted IFC from a Fragments file. Use this option if you want to avoid the conversion from IFC to Fragments."></bim-button>
        <bim-button @click=${streamIfc} label="IFC Streamer" icon="mdi:file-import" tooltip-title="Load IFC Model"
          tooltip-text="Loads an IFC file using the IfcLoader and converts it into fragments for the scene."></bim-button>
        <!-- <bim-button @click=${loadTiles} label="Tiles" icon="fe:tiled" tooltip-title="Load BIM Tiles"
        tooltip-text="Loads a pre-converted IFC from a Tiles file to stream the model. Perfect for big models."></bim-button> -->
      </bim-panel-section>

      <bim-panel-section label="Export" icon="solar:export-bold" collapsed style="flex: 1;">
      <bim-button label="Export fragments"
          @click="${() => {
            exportFragments();
          }}">
        </bim-button>  
        <bim-button label="Dispose fragments"
          @click="${() => {
            disposeFragments();
          }}">
        </bim-button>
      </bim-panel-section>
    `;
  });
};