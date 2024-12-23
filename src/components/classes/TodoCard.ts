import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import placeMarker from '../Toolbars/Sections/PlaceMarker';
import * as OBF from "@thatopen/components-front";
import { ProjectsManager } from "./ProjectsManager";
import * as THREE from "three";


export type ToDoPriority = "LOW" | "MEDIUM" | "HIGH";

export interface ToDo {
  id: number,
  content: string;
  writer: number,
  ifc: number,
  createDate: Date;
  deadline: Date;
  manager: number;
  manager_name: string,
  manager_position: string,
  expressIDs: string;
  priority: ToDoPriority;
  camera: { position: THREE.Vector3, target: THREE.Vector3, cameraType: string; };
}

export default (components: OBC.Components, projectsManager: ProjectsManager) => {

  const fragmentsManager = components.get(OBC.FragmentsManager);
  const world = components.get(OBC.Worlds).list.values().next().value;
  const { camera } = world;

  const highlighter = components.get(OBF.Highlighter);

  highlighter.events.select.onHighlight.add(() => {
    const selectedFragments = highlighter.selection.select;
    const fragmentKeys = Object.keys(selectedFragments);
    const fragmentID = fragmentKeys[0];
    const fragment = fragmentsManager.list.get(fragmentID);

   if (!fragment || !fragment.mesh || !fragment.mesh.parent) {
     console.error("Fragment or its mesh/parent is not valid.");
     return;
   }

   const modelUUID = fragment.mesh.parent?.uuid;
   if (!modelUUID) {
     console.error('Not found Model UUID');
     return;
   }

   const ifcId = projectsManager.getIfcIdByModelUUID(modelUUID);
   if (!ifcId) {
     console.error('IFC ID not found for selected model');
     return;
   }

    updateToDoList(ifcId);
  });


  const handleCreateClick = async () => {

    const descriptionInput = document.querySelector<HTMLInputElement>("#description-input");
    const deadlineInput = document.querySelector<HTMLInputElement>("#deadline-input");
    const priorityDropdown = document.querySelector<HTMLSelectElement>("#priority");
    const managerSelect = document.querySelector<HTMLSelectElement>("#manager-select");

    const selectedFragments = highlighter.selection.select;
    const fragmentKeys = Object.keys(selectedFragments);
    const expressIDs = Object.values(selectedFragments);
    const expressIDsArray = expressIDs.flat().map(set => Array.from(set));
    const uniqueExpressIDs = [...new Set(expressIDsArray.flat())];
  
    const expressIDsJson = JSON.stringify(uniqueExpressIDs);
  
    if (fragmentKeys.length === 0) {
      console.error("Please select at least one fragment before creating a TODO.");
      return;
    }
  
    const fragmentMap: { [key: string]: Set<number> } = {};
    const fragmentsManager = components.get(OBC.FragmentsManager);
  
    fragmentKeys.forEach((id) => {
      if (fragmentsManager.list.has(id)) {
        const expressIds = selectedFragments[id];
        if (expressIds instanceof Set) {
          fragmentMap[id] = new Set(expressIds);
        } else {
          console.warn(`Fragment ID ${id} does not have valid values for Set.`);
        }
      } else {
        console.warn(`Fragment ID ${id} is not valid or does not exist in fragmentsManager.`);
      }
    });

    if (Object.keys(fragmentMap).length === 0) {
      console.error("No valid fragments found to include in TODO.");
      return;
    }

    // Check Fragment, Model UUID
    const fragmentID = fragmentKeys[0];
    const fragment = fragmentsManager.list.get(fragmentID);

    if (!fragment || !fragment.mesh || !fragment.mesh.parent) {
      console.error("Fragment or its mesh/parent is not valid.");
      return;
    }

    const modelUUID = fragment.mesh.parent?.uuid;
    if (!modelUUID) {
      console.error('Not found Model UUID');
      return;
    }

    const ifcId = projectsManager.getIfcIdByModelUUID(modelUUID);

    if (!ifcId) {
      console.error('IFC ID not found for selected model');
      return;
    }

    if (!descriptionInput?.value.trim() || !deadlineInput?.value || !managerSelect?.value) {
      console.error("Please fill in all required fields.");
      return;
    }

    // Camera
    const position = world.camera.three.position.clone();
    
    const direction = new THREE.Vector3();
    world.camera.three.getWorldDirection(direction); 

    const targetDistance = 10; 
    const target = position.clone().add(direction.multiplyScalar(targetDistance));

    const todoCamera = {
        position,
        target
    };

 
    // Request TODO creation
    try {
      const requestBody = {
        content: descriptionInput.value,
        writer: 1,
        ifc: ifcId,
        manager: parseInt(managerSelect.value),
        deadline: deadlineInput.value,
        priority: priorityDropdown?.value || "LOW",
        expressIDs: expressIDsJson,
        camera: todoCamera
      };
  
      console.log("Request Body:", requestBody);
  
      const response = await fetch("http://localhost:3000/api/todo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }  

      await updateToDoList(ifcId)  

      if (descriptionInput) descriptionInput.value = '';
      if (managerSelect) managerSelect.value = '';
      if (deadlineInput) deadlineInput.value = '';
      if (priorityDropdown) priorityDropdown.value = 'LOW';
      highlighter.clear("select");

    } catch (error) {
      console.error("Error creating todo:", error);
    }
  };
  

  const getPriorityValue = (priority: string): number => {
    switch (priority.toUpperCase()) {
        case 'HIGH': return 3;
        case 'MEDIUM': return 2;
        case 'LOW': return 1;
        default: return 0;
    }
  };


  const sortTodos = (todos: any[], sortBy: 'title' | 'deadline' | 'priority') => {
    const sortedTodos = [...todos];
    
    if(sortBy === 'title') {

    }
    else if (sortBy === 'deadline') {
        sortedTodos.sort((a, b) => {
            const dateA = new Date(a.deadline);
            const dateB = new Date(b.deadline);
            return dateA.getTime() - dateB.getTime();
        });
    } 
    else if (sortBy === 'priority') {
        sortedTodos.sort((a, b) => {
            const priorityA = getPriorityValue(a.priority);
            const priorityB = getPriorityValue(b.priority);
            if (priorityA === priorityB) {
                const dateA = new Date(a.deadline);
                const dateB = new Date(b.deadline);
                return dateA.getTime() - dateB.getTime();
            }
            return priorityB - priorityA;
        });
    }
    
    return sortedTodos;
  };


  const updateToDoList = async (ifcId: number) => {
    try {

        const expressIDsResponse = await fetch(`http://localhost:3000/api/expressIDs/${ifcId}`);
        if (!expressIDsResponse.ok) {
          throw new Error(`HTTP error! status: ${expressIDsResponse.status}`);
        }

        const expressIdsJson = await expressIDsResponse.json();
        placeMarker(components, world, expressIdsJson);


        const selectedFragments = highlighter.selection.select;
        const fragmentKeys = Object.keys(selectedFragments);
        const fragmentID = fragmentKeys[0];
    
        const expressIDs = selectedFragments[fragmentID];
        const expressIDsArray = Array.from(expressIDs); 
        const selectedExpressIDs = new Set<number>(expressIDsArray);
    

        const response = await fetch(`http://localhost:3000/api/todo/${ifcId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const todos = await response.json();
        const todoListContainer = document.querySelector<HTMLElement>('#todo-list');
        
        if (!todoListContainer) {
            console.error('Todo list container not found');
            return;
        }

        const sortedTodos = sortTodos(todos, 'deadline');
        renderTodos(sortedTodos, todoListContainer, selectedExpressIDs);


    } catch (error) {
        console.error('Error updating todo list:', error);
      
      }
  };




  const renderTodos = (todos: any[], container: HTMLElement, selectedExpressIDs: Set<number>) => {

    container.innerHTML = '';

    // Sort dropdown
    const sortDropdown = document.createElement('bim-dropdown');
    sortDropdown.setAttribute('label', 'Sort By');

    // Title option
    const titleOption = document.createElement('bim-option');
    titleOption.setAttribute('label', 'Title');
    titleOption.id = 'title-sort';
    titleOption.addEventListener('click', () => {
      const sortedTodos = sortTodos(todos, 'title');
      renderTodos(sortedTodos, container, selectedExpressIDs);
    });
    sortDropdown.appendChild(titleOption);

    // Deadline option
    const deadlineOption = document.createElement('bim-option');
    deadlineOption.setAttribute('label', 'Deadline');
    deadlineOption.id = 'deadline-sort';
    deadlineOption.addEventListener('click', () => {
      const sortedTodos = sortTodos(todos, 'deadline');
      renderTodos(sortedTodos, container, selectedExpressIDs);
    });
    sortDropdown.appendChild(deadlineOption);

    // Priority option
    const priorityOption = document.createElement('bim-option');
    priorityOption.setAttribute('label', 'Priority');
    priorityOption.id = 'priority-sort';
    priorityOption.addEventListener('click', () => {
        const sortedTodos = sortTodos(todos, 'priority');
        renderTodos(sortedTodos, container, selectedExpressIDs);
    });
    sortDropdown.appendChild(priorityOption);

    container.appendChild(sortDropdown);

    // Todos
    todos.forEach(todo => {
      const todoSection = createTodoSection(todo, selectedExpressIDs);
      container.appendChild(todoSection);
    });
  };


  const trackFragment = (todo: ToDo) => {
    try {
  
      const highlighter = components.get(OBF.Highlighter);
      const fragmentsManager = components.get(OBC.FragmentsManager)

      const expressIDsArray: number[][] = JSON.parse(todo.expressIDs);
      const expressIDs: Set<number> = new Set<number>();

      if (!Array.isArray(expressIDsArray)) {
        console.error("not array:", expressIDsArray);
        return; 
      }

      expressIDsArray.forEach((idArray) => {
        if (!Array.isArray(idArray)) {
          expressIDs.add(idArray); 
          return; 
        }

        idArray.forEach((id) => expressIDs.add(id));
        console.log("this idArray:", idArray);
      });
    
      const fragmentsGroup = fragmentsManager.groups.values().next().value; 
      if (!fragmentsGroup) {
        console.error("Not found fragments group.");
        return;
      }

      const fragmentMap = fragmentsGroup.getFragmentMap(expressIDs);

      highlighter.highlightByID('select', fragmentMap)
        .catch((error) => {
          console.error("Error highlighting fragments:", error);
        });

      const cameraData = typeof todo.camera === 'string' ? JSON.parse(todo.camera) : todo.camera;
    
      world.camera.controls.setLookAt(
        cameraData.position.x,
        cameraData.position.y,
        cameraData.position.z,
        cameraData.target.x,
        cameraData.target.y,
        cameraData.target.z,
        true
      );


      
    } catch (error) {
      console.error('Error in trackFragment:', error);
    }
  };
    

  const deleteTodo = async (todo: ToDo) => {
      if (!confirm("데이터베이스에서 삭제하시겠습니까?")) return;
      try {
        const response = await fetch(`http://localhost:3000/api/todo/${todo.id}`, {
          method: "DELETE",
        });
        console.log("response:", response);

      if (response.ok) {
        alert(`데이터베이스에서 삭제되었습니다.`);
        updateToDoList(todo.ifc);
      } 
      else
      {
        const errorText = await response.text();
        console.error("ToDo 삭제 실패:", errorText);
        alert("ToDo 삭제에 실패하였습니다.");
        throw new Error(`HTTP error! status: ${response.status}`);
      }

  }
    catch {
      console.log("Error deleteing todo");
    }
  }


  const createTodoSection = (todo: ToDo, selectedExpressIDs: Set<number>) => {

    const todoSection = document.createElement('div');

    const todoExpressIDsArray: number[][] = JSON.parse(todo.expressIDs);
    const todoExpressIDs = new Set(todoExpressIDsArray.flat());

    if ([...todoExpressIDs].some(id => selectedExpressIDs.has(id))) {
        todoSection.style.border = '2px solid yellow'; 
        todoSection.style.padding = '10px'; 
        todoSection.style.margin = '10px 0'; 
        todoSection.style.borderRadius = '5px'; 
    } else {
        todoSection.style.border = '2px solid transparent'; 
    }
        
    const panelSection = document.createElement('bim-panel-section');
  
    panelSection.setAttribute('label', todo.content);
    panelSection.setAttribute('icon', 'mdi:card-text-outline');
  
    // Manager
    const managerLabel = document.createElement('bim-label');
    managerLabel.textContent = `Manager: ${todo.manager_name} [${todo.manager_position}]`;
    panelSection.appendChild(managerLabel);
  
    // Deadline
    const deadlineLabel = document.createElement('bim-label');
    const todoDate = new Date(todo.deadline).toLocaleDateString();
    deadlineLabel.textContent = `Deadline: ${todoDate}`;
    panelSection.appendChild(deadlineLabel);
  
    // Priority
    const priorityLabel = document.createElement('bim-label');
    priorityLabel.textContent = `Priority: ${todo.priority}`;
    panelSection.appendChild(priorityLabel);
  
    // Track Button
    const trackButton = document.createElement('bim-button');
    trackButton.setAttribute('label', 'Track');
    trackButton.id = `track-${todo.id}`;
    trackButton.addEventListener('click',function handleClick() {
      trackFragment(todo);
    });
    panelSection.appendChild(trackButton);
    todoSection.appendChild(panelSection);
  
    // Delete Button
    const deletButton = document.createElement('bim-button');
    deletButton.setAttribute('label', 'Delete');
    deletButton.id = `delete-${todo.id}`;
    deletButton.addEventListener('click',function handleClick() {
      deleteTodo(todo);
    });
    panelSection.appendChild(deletButton);
  
    return todoSection;
  };
    
  
  const createManagerDropdown = () => {

    const dropdown = BUI.Component.create(() => {
      return BUI.html`
        <bim-dropdown id="manager-select" label="Manager"></bim-dropdown>
      `;
    });

    // Update managers list
    fetch('http://localhost:3000/api/manager')
      .then(response => response.json())
      .then(managers => {
        dropdown.innerHTML = managers
          .map((manager: { id: number, name: string, position: string }) => `
            <bim-option 
              label="${manager.name} [${manager.position}]" 
              value="${manager.id}"
            ></bim-option>
          `)
          .join('');
      })
      .catch(error => {
        console.error('Error loading managers:', error);
      });

    return dropdown;

  };

  const fragment = BUI.Component.create(() => {
    
    const managerDropdown = createManagerDropdown();

    return BUI.html`
      <bim-panel-section label="Todo" icon="mdi:clipboard-list">
        <bim-panel-section label="New Todo" icon="mdi:card-text">
          <bim-label>Description</bim-label>
          <bim-text-input 
            id="description-input" 
            vertical 
            placeholder="Please write a description.">
          </bim-text-input>
            ${managerDropdown}
          <bim-label>Deadline</bim-label>
          <bim-text-input 
            id="deadline-input" 
            type="date" 
            vertical 
            placeholder="Deadline">
          </bim-text-input>
          <bim-dropdown id="priority" label="Priority">
            <bim-option label="LOW"></bim-option>
            <bim-option label="MEDIUM"></bim-option>
            <bim-option label="HIGH"></bim-option>
          </bim-dropdown>
          <bim-button 
            @click=${handleCreateClick} 
            label="Create Todo"
          ></bim-button>
        </bim-panel-section>
        <bim-panel-section 
          label="Todo List" 
          icon="mdi:format-list-bulleted" 
          id="todo-list" 
          style="margin-top: 1rem;"
        >
        </bim-panel-section>
      </bim-panel-section>
    `;
  });

  return fragment;
}