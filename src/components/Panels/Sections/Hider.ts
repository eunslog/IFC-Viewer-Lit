import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";

export default (components: OBC.Components) => {

  const hider = components.get(OBC.Hider); 
  const classifier = components.get(OBC.Classifier); 
  const fragmentsManager = components.get(OBC.FragmentsManager);
  const indexer = components.get(OBC.IfcRelationsIndexer); 

  if (!classifier || !classifier.list || !fragmentsManager || !indexer) {
    return BUI.Component.create<BUI.PanelSection>(() => {
      return BUI.html``;
    });
  }

  const spatialStructures: Record<string, any> = {};
  const structureNames = Object.keys(classifier.list.spatialStructures || {});
  for (const name of structureNames) {
    spatialStructures[name] = true;
  }

  const classes: Record<string, any> = {};
  const classNames = Object.keys(classifier.list.entities || {});
  for (const name of classNames) {
    classes[name] = true;
  }

  const predefinedTypes: Record<string, any> = {};
  const predefinedTypeNames = Object.keys(classifier.list.predefinedTypes || {});
  for (const name of predefinedTypeNames) {
    predefinedTypes[name] = true;
  }

  const objectTypes: Record<string, any> = {};
  const objectTypeNames = Object.keys(classifier.list.objectTypes || {});
  for (const name of objectTypeNames) {
    objectTypes[name] = true;
  }

  const panel = BUI.Component.create<BUI.Panel>(() => {
    return BUI.html`
      <bim-panel>
        <bim-panel-section label="Controls">
          <bim-panel-section label="Floors" name="Floors">
          </bim-panel-section>
          <bim-panel-section label="Classes" name="Classes">
          </bim-panel-section>
          <bim-panel-section label="Predefined Types" name="PredefinedTypes">
          </bim-panel-section>
          <bim-panel-section label="Object Types" name="ObjectTypes">
          </bim-panel-section>
        </bim-panel-section>
      </bim-panel>
    `;
  });

  document.body.append(panel);

  const floorSection = panel.querySelector(
    "bim-panel-section[name='Floors']",
  ) as BUI.PanelSection;

  const classSection = panel.querySelector(
    "bim-panel-section[name='Classes']",
  ) as BUI.PanelSection;

  const predefinedTypeSection = panel.querySelector(
    "bim-panel-section[name='PredefinedTypes']",
  ) as BUI.PanelSection;

  const objectTypeSection = panel.querySelector(
    "bim-panel-section[name='ObjectTypes']",
  ) as BUI.PanelSection;

  for (const name in spatialStructures) {
    const panel = BUI.Component.create<BUI.Checkbox>(() => {
      return BUI.html`
        <bim-checkbox checked label="${name}"
          @change="${({ target }: { target: BUI.Checkbox }) => {
            const found = classifier.list.spatialStructures[name];
            if (found && found.id !== null) {
              for (const [_id, model] of fragmentsManager.groups) {
                const foundIDs = indexer.getEntityChildren(model, found.id);
                const fragMap = model.getFragmentMap(foundIDs);
                hider.set(target.checked, fragMap);
              }
            }
          }}">
        </bim-checkbox>
      `;
    });
    floorSection.append(panel);
  }

  for (const name in classes) {
    const checkbox = BUI.Component.create<BUI.Checkbox>(() => {
      return BUI.html`
      <bim-checkbox checked label="${name}"
        @change="${({ target }: { target: BUI.Checkbox }) => {
          const found = classifier.find({ entities: [name] });
          hider.set(target.checked, found);
        }}">
        </bim-checkbox>
      `;
    });
    classSection.append(checkbox);
  }

  for (const name in predefinedTypes) {
    const checkbox = BUI.Component.create<BUI.Checkbox>(() => {
      return BUI.html`
      <bim-checkbox checked label="${name}"
        @change="${({ target }: { target: BUI.Checkbox }) => {
          const found = classifier.find({ predefinedTypes: [name] });
          hider.set(target.checked, found);
        }}">
        </bim-checkbox>
      `;
    });
    predefinedTypeSection.append(checkbox);
  }

  for (const name in objectTypes) {
    const checkbox = BUI.Component.create<BUI.Checkbox>(() => {
      return BUI.html`
      <bim-checkbox checked label="${name}"
        @change="${({ target }: { target: BUI.Checkbox }) => {
          const found = classifier.find({ objectTypes: [name] });
          hider.set(target.checked, found);
        }}">
        </bim-checkbox>
      `;
    });
    objectTypeSection.append(checkbox);
  }

  return panel;

}