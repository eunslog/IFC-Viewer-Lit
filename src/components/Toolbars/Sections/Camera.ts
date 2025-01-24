import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";

export default (world: OBC.World) => {

  const { camera } = world;
  const onFitModel = () => {
    if (camera instanceof OBC.OrthoPerspectiveCamera && world.meshes.size > 0) {
      camera.fit(world.meshes, 0.5);
    }
  };

  const onLock = (e: Event) => {
    const button = e.target as BUI.Button;
    camera.enabled = !camera.enabled;
    button.active = !camera.enabled;
    button.label = camera.enabled ? "Disable" : "Enable";
    button.icon = camera.enabled
      ? "tabler:lock-filled"
      : "majesticons:unlock-open";
  };

  const onProjectionDropdownCreated = (e?: Element) => {
      if (!(e && camera instanceof OBC.OrthoPerspectiveCamera)) return;
      const dropdown = e as BUI.Dropdown
      dropdown.value = [camera.projection.current]
  }

  const onProjectionChange = (e: Event) => {
    if (camera instanceof OBC.OrthoPerspectiveCamera) {
      const dropdown = e.target as BUI.Dropdown;
      const value = dropdown.value[0] as OBC.CameraProjection;
      camera.projection.set(value);
    }
  };

  return BUI.Component.create<BUI.PanelSection>(() => {
    return BUI.html`
      <bim-panel-section label="Camera" icon="ph:camera-fill" style="pointer-events: auto" collapsed>
        <bim-button label="Fit Model" icon="material-symbols:fit-screen-rounded" @click=${onFitModel}></bim-button>
        <bim-button label="Disable" icon="tabler:lock-filled" @click=${onLock} .active=${!camera.enabled}></bim-button>
        <bim-dropdown
          required
          label="Camera Projection"
          @change=${onProjectionChange}
          @bui-ready=${(e: Event) => onProjectionDropdownCreated(e.target as BUI.Dropdown)}
        >
          ${camera instanceof OBC.OrthoPerspectiveCamera
            ? BUI.html`
                <bim-option label="Perspective" ?checked=${camera.projection.current === "Perspective"}></bim-option>
                <bim-option label="Orthographic" ?checked=${camera.projection.current === "Orthographic"}></bim-option>
              `
            : ""}
        </bim-dropdown>
      </bim-panel-section>
    `;
  });

};