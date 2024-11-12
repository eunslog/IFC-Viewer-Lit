import { html, css, LitElement } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import type { ToDoPriority } from './bim-components/TodoCreator';
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as WEBIFC from 'web-ifc';
import * as OBCF from "@thatopen/components-front";
import * as THREE from 'three';
import { ProjectsManager } from '../components/classes/ProjectsManager';
import './ifc_page.css';
import { ToDo } from './bim-components/TodoCreator';
import { AppManager } from "../bim-components";
import { IProject, ProjectStatus, UserRole } from "../components/classes/Project"
import projectInformation from "../components/Panels/ProjectInformation";
import elementData from "../components/Panels/Selection";
import settings from "../components/Panels/Settings";
import load from "../components/Toolbars/Sections/Import";
import help from "../components/Panels/Help";
import camera from "../components/Toolbars/Sections/Camera";
import selection from "../components/Toolbars/Sections/Selection";
import clipEdges from "../components/Toolbars/Sections/ClipEdges";
import hiderPanel from "../components/Panels/Sections/Hider";

@customElement('ifc-page')
export class IFCPage extends LitElement {
  @property({ type: Object }) projectsManager!: ProjectsManager;
  // private projectsManager = new ProjectsManager();
  @state() private components : OBC.Components | null = null;
  @state() private todoList: ToDo[] = [];
  @state() private description: string = '';
  @state() private priority?: ToDoPriority;
  @state() private isViewerInitialized: boolean = false; // 추가: 뷰어 초기화 상태 확인
  @state() private areComponentsReady: boolean = false; // 모든 컴포넌트가 준비되었는지 확인하는 플래그

  static styles = css`
    .ifc_page_container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .ifc_page_header {
      display: flex;
      justify-content: space-between;
      padding: 1rem;
      background-color: #f0f0f0;
    }
    .todo_card_container {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
  `;

  firstUpdated() {
    console.log("First updated - initializing viewer...");
    //try1 this.createViewer();
    //try2 this.updateComplete.then(() => {
    //   if(!this.isViewerInitialized) {
    //     this.createViewer();
    //   }
    // });  
    this.updateComplete.then(() => {
      if (!this.isViewerInitialized) {
        const viewport = BUI.Component.create<BUI.Viewport>(() => {
          return BUI.html`
            <bim-viewport>
              <bim-grid floating></bim-grid>
            </bim-viewport>
          `;
        });
        if (viewport) {
          console.log("Components are ready, initializing viewer...");
          this.createViewer();
        } else {
          console.error("Viewer container not found after updateComplete.");
        }
      }
    });
  }

  connectedCallback() {
    super.connectedCallback();
    console.log("IFCPage connected to DOM.");
    this.components = new OBC.Components(); // Components 초기화

    // components가 제대로 초기화되었는지 확인하기 위해 로깅 추가
    if (this.components) {
      console.log("Components initialized in connectedCallback.");
    }
    // this.createViewer(); // Components 초기화 후 createViewer 호출
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    console.log("IFCPage disconnected from DOM.");
  }

  private async createViewer() {

    if (!this.components) {
      console.error("Components are not initialized yet.");
      return;
    }

    const viewport = this.shadowRoot?.getElementById('ifc_viewer') as HTMLElement;

    if (!viewport) {
      console.error("Viewer container not found.");
      return;
    }

    console.log("Initializing viewer...");
    try {
        // 초기화
        const worlds = this.components.get(OBC.Worlds);
        console.log("World component:", worlds);

        const world = worlds.create<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBF.PostproductionRenderer>();
        console.log("World created:", world);

        // Scene 설정
        const sceneComponent = new OBC.SimpleScene(this.components);
        sceneComponent.setup();
        console.log("Scene setup complete.");
        world.scene = sceneComponent;

        // Renderer 설정
        const rendererComponent = new OBF.PostproductionRenderer(this.components, viewport);
        world.renderer = rendererComponent;
        console.log("Renderer setup complete.");

        // Camera 설정
        const cameraComponent = new OBC.OrthoPerspectiveCamera(this.components!);
        world.camera = cameraComponent;
        console.log("Camera setup complete.");

        // 배경 그리드 추가
        const grids = this.components!.get(OBC.Grids);
        grids.create(world);
        console.log("Background grid added.");

        this.components.init();
        console.log("Components initialized.");


        // // AppManager 사용하여 컴포넌트 연결
        // const appManager = this.components.get(AppManager);
        // const viewportGrid = viewport.querySelector<BUI.Grid>("bim-grid[floating]");
        // if (viewportGrid) {
        //   appManager.grids.set("viewport", viewportGrid);
        //   console.log("viewport grid found.")
        // } else {
        //   console.warn("Viewport grid not found.");
        // }

        // 하이라이터 설정 및 이벤트 리스너 추가
        const highlighter = this.components.get(OBF.Highlighter);
        if (highlighter) {
          highlighter.add('low', new THREE.Color(89, 188, 89));
          highlighter.add('normal', new THREE.Color(89, 124, 255));
          highlighter.add('high', new THREE.Color(255, 118, 118));
          highlighter.setup({ world });

          // 이벤트 리스너 추가
          if (highlighter.events && highlighter.events.select) {
            highlighter.events.select.onClear?.add(() => {
              console.log("Selection cleared.");
            });
            highlighter.events.select.onHighlight?.add(() => {
              console.log("Selection highlighted.");
            });
            console.log("Highlighter setup complete and events registered.");
          } else {
            console.warn("Highlighter events are not initialized properly.");
          }
        } else {
          console.warn("Highlighter is not initialized.");
        }


        // IFC 로더 설정
        const ifcLoader = this.components!.get(OBC.IfcLoader);
        ifcLoader.settings.wasm = {
            path: '../../../node_modules/web-ifc/',
            absolute: true,
        };
        await ifcLoader.setup({ autoSetWasm: false });
        console.log("IFC loader setup complete.");

        // 프로젝트 목록에서 유효한 프로젝트 가져오기
        const projects = this.projectsManager.list;
        if (projects.length > 0) {
            const project = projects[0];
            if (project) {
                console.log(`Loading project: ${project.name}`);
                const model = await ifcLoader.load(project.ifc_data);
                world.scene.three.add(model);
                console.log("Model loaded and added to scene.");
            }
        } else {
            console.warn("No projects found in ProjectsManager.");
        }

        console.log("Components initialized.");
        this.areComponentsReady = true; // 모든 컴포넌트가 준비됨을 표시
        // 뷰어 초기화 완료 설정
        this.isViewerInitialized = true;

      } catch (error) {
          console.error("Error during viewer initialization:", error);
      }
    }


  private addTodo(todo: ToDo) {
    console.log("Adding ToDo:", todo);
    this.todoList = [...this.todoList, todo];
  }

  private createTodo() {
    console.log("Creating new ToDo...");
    if (!this.components) return;

    if (!this.description) {
      alert('Please enter description');
      return;
    }
    if (!this.priority) {
      alert('Please select priority');
      return;
    }

    const highlighter = this.components.get(OBF.Highlighter);
    if (highlighter) {
      const todo: ToDo = {
        description: this.description,
        date: new Date(),
        fragmentMap: highlighter.selection.select,
        priority: this.priority,
      };
      this.addTodo(todo);
    } else {
      console.error("Highlighter is not available.");
    }
  }

  private deleteTodo(todo: ToDo) {
    console.log("Deleting ToDo:", todo);
    if (confirm(`Do you want to delete todo '${todo.description}' ?`)) {
      this.todoList = this.todoList.filter((item) => item.description !== todo.description);
    }
  }

  private loadIFC() {
    console.log("Loading IFC...");
    if (!this.components) return;

    const ifcLoader = this.components.get(OBC.IfcLoader);
    const fileOpener = document.createElement('input');
    fileOpener.type = 'file';
    fileOpener.accept = '.ifc';
    fileOpener.onchange = async () => {
      if (fileOpener.files === null || fileOpener.files.length === 0) return;
      const file = fileOpener.files[0];
      fileOpener.remove();
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const model = await ifcLoader.load(data);
      model.name = file.name.replace('.ifc', '');
      const world = this.components!.get(OBC.Worlds).list.values().next().value;
      if (world && world.scene) {
        world.scene.three.add(model);
        console.log("IFC model loaded:", model);
      }
    };
    fileOpener.click();
  }

  private loadFrag() {
    if (!this.components) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.frag';
    const reader = new FileReader();
    reader.addEventListener('load', async () => {
      const binary = reader.result;
      if (!(binary instanceof ArrayBuffer)) return;
      const fragmentBinary = new Uint8Array(binary);
      const fragmentsManager = this.components!.get(OBC.FragmentsManager);
      fragmentsManager.load(fragmentBinary);
    });
    input.addEventListener('change', () => {
      const filesList = input.files;
      if (!filesList) return;
      reader.readAsArrayBuffer(filesList[0]);
    });
    input.click();
  }

  private focusFragment(todo: ToDo) {
    const highlighter = this.components!.get(OBF.Highlighter);
    if (highlighter) {
      highlighter.highlightByID('select', todo.fragmentMap, true, true);
    } else {
      console.error("Highlighter is not available.");
    }
    // highlighter.highlightByID('select', todo.fragmentMap, true, true);
  }

  private createLeftPanel() {
    if (!this.components || !this.areComponentsReady) {
      console.log("Loading - Components not ready");
      return html`<p>Loading...</p>`;
    }

    const hiderContent = hiderPanel(this.components);
    if (!hiderContent) {
        console.log("Failed to load hider content.");
        return html`<p>Loading hider content...</p>`;
    }


    return BUI.Component.create(() => {
      return BUI.html`
      <bim-tabs switchers-full>
        <bim-tab name="project" label="Project" icon="ph:building-fill">
        </bim-tab>
        <bim-tab name="settings" label="Settings" icon="solar:settings-bold">
        </bim-tab>
        <bim-tab name="help" label="Help" icon="material-symbols:help">
          ${help}
        </bim-tab>
        <bim-tab name="hider" label="Hider" icon="mdi:eye-off-outline">
          ${hiderContent}
        </bim-tab>
      </bim-tabs>
      `;
  });
}


  render() {

    const leftPanel = this.createLeftPanel();

    return BUI.html`
      <div class="ifc_page_container">
        <div class="ifc_page_header">
          <bim-toolbar>
            <bim-toolbar-section>
              <bim-button @click=${() => history.back()} label="back"></bim-button>
              <bim-label style="margin: 0 2rem; color: white;">Project Name</bim-label>
            </bim-toolbar-section>
          </bim-toolbar>
          <bim-toolbar>
            <bim-toolbar-section>
              <bim-button @click=${this.loadIFC} label="Load IFC"></bim-button>
              <bim-button @click=${this.loadFrag} label="Load FRAG"></bim-button>
            </bim-toolbar-section>
          </bim-toolbar>
        </div>

        <!-- 페이지 바디 -->
        <div style="display: flex; width: 100%; height: 90%; justify-content: space-between;">
          <!-- 왼쪽 패널 -->
          <bim-panel style="min-width: 15vw;">
            ${leftPanel}
          </bim-panel>

          <!-- 중앙 뷰어 -->
          <div>
            <div id="ifc_viewer" style="height: 100%; width: 100%;"></div>
            <!-- 페이지 하단 -->
            <bim-panel>
              <bim-panel-section label="Model Queries"></bim-panel-section>
            </bim-panel>
          </div>

          <!-- 오른쪽 패널 -->
          <bim-panel style="min-width: 15vw;">
            <bim-panel-section label="Create Todo">
              <bim-label>Description</bim-label>
              <bim-text-input @input=${(e: Event) => (this.description = (e.target as HTMLInputElement).value)}></bim-text-input>
              <bim-dropdown @change=${(e: Event) => (this.priority = (e.target as HTMLSelectElement).value as ToDoPriority)}>
                <bim-option label="Low"></bim-option>
                <bim-option label="Normal"></bim-option>
                <bim-option label="High"></bim-option>
              </bim-dropdown>
              <bim-button @click=${this.createTodo} label="Create"></bim-button>
            </bim-panel-section>
            <bim-panel-section label="Todo List">
              ${this.todoList.map(
                (todo) => html`
                  <div class="todo_card_container">
                    <bim-label>${todo.description}</bim-label>
                    <div class="todo_btn">
                      <bim-button @click=${() => this.focusFragment(todo)} label="tracking"></bim-button>
                      <bim-button @click=${() => this.deleteTodo(todo)} label="delete"></bim-button>
                    </div>
                  </div>
                `
              )}
            </bim-panel-section>
            <bim-panel-section label="Properties" id="propertyRef"></bim-panel-section>
          </bim-panel>
        </div>
      </div>
    `;
  }
}