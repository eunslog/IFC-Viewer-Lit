
// import * as OBC from "@thatopen/components";


// interface IViewerContext {
//   viewer: OBC.Components | null
//   setViewer: (viewer: OBC.Components | null) => void
// }

// export const ViewerContext = React.createContext<IViewerContext>({
//   viewer: null,
//   setViewer: () => {}
// })

// export function ViewerProvider(props: {children: React.ReactNode}) {
//   const [viewer, setViewer] = React.useState<OBC.Components | null>(null)
//   return (
//     <ViewerContext.Provider value={{ viewer, setViewer }}>
//       {props.children}
//     </ViewerContext.Provider>
//   )
// }
import { html, LitElement, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import * as THREE from 'three';
import * as OBC from "@thatopen/components";

@customElement('ifc-viewer')
export class IFCViewer extends LitElement {
  @state() viewer: OBC.Components | null = null;
  @state() scene: THREE.Scene | null = null;
  @state() renderer: THREE.WebGLRenderer | null = null;
  @state() camera: THREE.PerspectiveCamera | null = null;

  // static styles = css`
  //   :host {
  //     display: block;
  //     width: 100%;
  //     height: 100%;
  //   }
  //   #viewer-container {
  //     width: 100%;
  //     height: 100%;
  //     position: relative;
  //   }
  // `;

  firstUpdated() {
    this.updateComplete.then(() => {
      this.initViewer();
    });
    // this.initViewer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.disposeViewer();
  }

  private initViewer() {

    const container = this.shadowRoot?.getElementById('viewer-container') as HTMLElement;

    if (container) {

      this.viewer = new OBC.Components();
      this.viewer.init();


      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
      this.camera.position.set(10, 10, 10);

      this.renderer = new THREE.WebGLRenderer();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(this.renderer.domElement);


      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(10, 10, 10);
      this.scene.add(light);


      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      this.scene.add(cube);


      this.startAnimationLoop();
    } else {
      console.error('Viewer container not found.');
    }
  }

  private startAnimationLoop() {
    const animate = () => {
      requestAnimationFrame(animate);

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  private disposeViewer() {
    if (this.viewer) {
      this.viewer.dispose();
      this.viewer = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    if (this.scene) {
      this.scene = null;
    }

    if (this.camera) {
      this.camera = null;
    }
  }

  render() {
    return html`
      <div id="viewer-container"></div>
    `;
  }
}
