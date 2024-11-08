import { html, css, LitElement } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import type { ToDoPriority } from './bim-components/TodoCreator';
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as WEBIFC from 'web-ifc';
import * as OBCF from "@thatopen/components-front";
import * as THREE from 'three';
import { ProjectsManager } from './classes/ProjectsManager';
import './ifc_page.css';
import { ToDo } from './bim-components/TodoCreator';
import { AppManager } from "../bim-components";
import { IProject, ProjectStatus, UserRole } from "./classes/Project"
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
    // this.createViewer();
    this.updateComplete.then(() => {
      this.createViewer();
    });  
  }

  connectedCallback() {
    super.connectedCallback();
    console.log("IFCPage connected to DOM.");
    this.components = new OBC.Components(); // Components 초기화
    this.createViewer(); // Components 초기화 후 createViewer 호출
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
        const worlds = this.components!.get(OBC.Worlds);
        console.log("World component:", worlds);

        const world = worlds.create<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBF.PostproductionRenderer>();
        console.log("World created:", world);

        // Scene 설정
        const sceneComponent = new OBC.SimpleScene(this.components!);
        sceneComponent.setup();
        console.log("Scene setup complete.");
        world.scene = sceneComponent;

        // Renderer 설정
        const rendererComponent = new OBF.PostproductionRenderer(this.components!, viewport);
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

        this.components!.init();
        console.log("Components initialized.");



        // // 하이라이터 설정
        // const highlighter = this.components.get(OBF.Highlighter);
        // // highlighter.add('low', new THREE.Color(89, 188, 89));
        // // highlighter.add('normal', new THREE.Color(89, 124, 255));
        // // highlighter.add('high', new THREE.Color(255, 118, 118));
        // // highlighter.setup({ world });
        // // console.log("Highlighter setup complete.");

        // // highlighter.events.select.onClear.add(() => {
        // //   console.log("Selection cleared.");
        // // });
        // // highlighter.events.select.onHighlight.add(() => {
        // //     console.log("Selection highlighted.");
        // // });
        // if (highlighter) {
        //   highlighter.add('low', new THREE.Color(89, 188, 89));
        //   highlighter.add('normal', new THREE.Color(89, 124, 255));
        //   highlighter.add('high', new THREE.Color(255, 118, 118));
        //   highlighter.setup({ world });
        //   console.log("Highlighter setup complete.");

        //   // 이벤트 핸들러를 안전하게 등록
        //   if (highlighter.events && highlighter.events.select) {
        //     highlighter.events.select.onClear?.add(() => {
        //       console.log("Selection cleared.");
        //     });
        //     highlighter.events.select.onHighlight?.add(() => {
        //       console.log("Selection highlighted.");
        //     });
        //     } 
        //   else {
        //     console.warn("Highlighter events are not initialized properly.");
        //   }
        // } 
        // else {
        //   console.warn("Highlighter is not initialized.");
        // }

          // 이벤트 핸들러를 안전하게 등록
          // highlighter.events.select.onClear?.add(() => {
          //     console.log("Selection cleared.");
          // });
          // highlighter.events.select.onHighlight?.add(() => {
          //     console.log("Selection highlighted.");
          // });
          // } else {
          //     console.warn("Highlighter is not initialized.");
          // }


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

      // // Highlighter 이벤트 설정을 위한 함수 정의
      // const setupHighlighterEvents = () => {
      //   const highlighter = this.components!.get(OBF.Highlighter);
      //   if (highlighter && highlighter.events && highlighter.events.select) {
      //     // 하이라이터 색상 설정
      //     highlighter.add('low', new THREE.Color(89, 188, 89));
      //     highlighter.add('normal', new THREE.Color(89, 124, 255));
      //     highlighter.add('high', new THREE.Color(255, 118, 118));
      //     highlighter.setup({ world });

      //     // 이벤트 리스너 추가
      //     highlighter.events.select.onClear.add(() => {
      //       console.log("Selection cleared.");
      //     });
      //     highlighter.events.select.onHighlight.add(() => {
      //       console.log("Selection highlighted.");
      //     });
      //     console.log("Highlighter setup complete and events registered.");
      //   } else {
      //     console.warn("Retrying Highlighter setup...");
      //     requestAnimationFrame(setupHighlighterEvents); // Highlighter가 초기화될 때까지 반복
      //   }
      // };

      // // Highlighter 이벤트 설정 함수 호출
      this.setupHighlighterEvents(world);

      // this.setupHighLighterEvents(world);

      // 뷰어 초기화 완료 설정
      this.isViewerInitialized = true;

      } catch (error) {
          console.error("Error during viewer initialization:", error);
      }
    }

    
// Highlighter 설정 함수
private setupHighlighterEvents(world: OBC.World) {
  const setupHighlighterEvents = () => {
      if (!this.components) {
          console.error("Components not initialized.");
          return;
      }

      const highlighter = this.components.get(OBF.Highlighter);
      if (highlighter && highlighter.events && highlighter.events.select) {
          // 하이라이터 색상 설정
          highlighter.add('low', new THREE.Color(89, 188, 89));
          highlighter.add('normal', new THREE.Color(89, 124, 255));
          highlighter.add('high', new THREE.Color(255, 118, 118));
          highlighter.setup({ world });

          // 이벤트 리스너 추가
          highlighter.events.select.onClear.add(() => {
              console.log("Selection cleared.");
          });
          highlighter.events.select.onHighlight.add(() => {
              console.log("Selection highlighted.");
          });
          console.log("Highlighter setup complete and events registered.");
      } else {
          console.warn("Retrying Highlighter setup...");
          requestAnimationFrame(setupHighlighterEvents); // Highlighter가 초기화될 때까지 반복
      }
  };

  setupHighlighterEvents();
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
    const todo: ToDo = {
      description: this.description,
      date: new Date(),
      fragmentMap: highlighter.selection.select,
      priority: this.priority,
    };
    this.addTodo(todo);
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
    highlighter.highlightByID('select', todo.fragmentMap, true, true);
  }

  private createLeftPanel() {
    if (!this.components) {
      return html`<p>Loading...</p>`;
    }

    return BUI.Component.create(() => {
      return BUI.html`
        <bim-tabs switchers-full>

          <bim-tab name="help" label="Help" icon="material-symbols:help">
            ${help}
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
          <bui-toolbar>
            <bui-toolbar-section>
              <bui-button @click=${() => history.back()} label="back"></bui-button>
              <bui-label style="margin: 0 2rem; color: white;">Project Name</bui-label>
            </bui-toolbar-section>
          </bui-toolbar>
          <bui-toolbar>
            <bui-toolbar-section>
              <bui-button @click=${this.loadIFC} label="Load IFC"></bui-button>
              <bui-button @click=${this.loadFrag} label="Load FRAG"></bui-button>
            </bui-toolbar-section>
          </bui-toolbar>
        </div>

        <!-- 페이지 바디 -->
        <div style="display: flex; width: 100%; height: 90%; justify-content: space-between;">
          <!-- 왼쪽 패널 -->
          <bui-panel style="min-width: 15vw;">
            ${leftPanel}
          </bui-panel>

          <!-- 중앙 뷰어 -->
          <div>
            <div id="ifc_viewer" style="height: 100%; width: 100%;"></div>
            <!-- 페이지 하단 -->
            <bui-panel>
              <bui-panel-section label="Model Queries"></bui-panel-section>
            </bui-panel>
          </div>

          <!-- 오른쪽 패널 -->
          <bui-panel style="min-width: 15vw;">
            <bui-panel-section label="Create Todo">
              <bui-label>Description</bui-label>
              <bui-text-input @input=${(e: Event) => (this.description = (e.target as HTMLInputElement).value)}></bui-text-input>
              <bui-dropdown @change=${(e: Event) => (this.priority = (e.target as HTMLSelectElement).value as ToDoPriority)}>
                <bui-option label="Low"></bui-option>
                <bui-option label="Normal"></bui-option>
                <bui-option label="High"></bui-option>
              </bui-dropdown>
              <bui-button @click=${this.createTodo} label="Create"></bui-button>
            </bui-panel-section>
            <bui-panel-section label="Todo List">
              ${this.todoList.map(
                (todo) => html`
                  <div class="todo_card_container">
                    <bui-label>${todo.description}</bui-label>
                    <div class="todo_btn">
                      <bui-button @click=${() => this.focusFragment(todo)} label="tracking"></bui-button>
                      <bui-button @click=${() => this.deleteTodo(todo)} label="delete"></bui-button>
                    </div>
                  </div>
                `
              )}
            </bui-panel-section>
            <bui-panel-section label="Properties" id="propertyRef"></bui-panel-section>
          </bui-panel>
        </div>
      </div>
    `;
  }
}