import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";

export default function hiderPanel(components: OBC.Components): BUI.PanelSection | null {

  const hider = components.get(OBC.Hider); 
  const classifier = components.get(OBC.Classifier); 
  const fragments = components.get(OBC.FragmentsManager);
  const indexer = components.get(OBC.IfcRelationsIndexer); 

  if (!classifier || !classifier.list || !fragments || !indexer) {
    return BUI.Component.create<BUI.PanelSection>(() => {
      return BUI.html`<bim-label>No elements to display</bim-label>`;
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
  const objectTypeNames = Object.keys(classifier.list.objectTypees || {});
  for (const name of objectTypeNames) {
    objectTypes[name] = true;
  }

  return BUI.Component.create<BUI.PanelSection>(() => {
    return BUI.html`
      <bim-panel>
        <bim-panel-section label="Controls">
          <bim-panel-section label="Floors" name="Floors">
            ${Object.keys(spatialStructures).map((name) => BUI.html`
              <bim-checkbox checked label="${name}"
                @change="${({ target }: { target: BUI.Checkbox }) => {
                  const found = classifier.list.spatialStructures[name];
                  if (found && found.id !== null) {
                    for (const [_id, model] of fragments.groups) {
                      const foundIDs = indexer.getEntityChildren(model, found.id);
                      const fragMap = model.getFragmentMap(foundIDs);
                      hider.set(target.checked, fragMap);
                    }
                  }
                }}"
              ></bim-checkbox>
            `)}
          </bim-panel-section>
          <bim-panel-section label="Classes" name="Classes">
            ${Object.keys(classes).map((name) => BUI.html`
              <bim-checkbox checked label="${name}"
                @change="${({ target }: { target: BUI.Checkbox }) => {
                  const found = classifier.find({ entities: [name] });
                  hider.set(target.checked, found);
                }}"
              ></bim-checkbox>
            `)}
          </bim-panel-section>
          <bim-panel-section label="Predefined Types" name="PredefinedTypes">
            ${Object.keys(predefinedTypes).map((name) => BUI.html`
              <bim-checkbox checked label="${name}"
                @change="${({ target }: { target: BUI.Checkbox }) => {
                  const found = classifier.find({ predefinedTypes: [name] });
                  hider.set(target.checked, found);
                }}"
              ></bim-checkbox>
            `)}
          </bim-panel-section>
          <bim-panel-section label="Object Types" name="ObjectTypes">
            ${Object.keys(objectTypes).map((name) => BUI.html`
              <bim-checkbox checked label="${name}"
                @change="${({ target }: { target: BUI.Checkbox }) => {
                  const found = classifier.find({ objectTypes: [name] });
                  hider.set(target.checked, found);
                }}"
              ></bim-checkbox>
            `)}
          </bim-panel-section>
        </bim-panel-section>
      </bim-panel>
    `;
  });
}
