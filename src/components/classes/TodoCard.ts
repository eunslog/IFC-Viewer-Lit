import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import placeMarker from '../Toolbars/Sections/PlaceMarker';
import * as OBF from "@thatopen/components-front";
import { ProjectsManager } from "./ProjectsManager";
import * as THREE from "three";
import { clearMarkers } from '../Toolbars/Sections/PlaceMarker';


export type ToDoPriority = "LOW" | "MEDIUM" | "HIGH";

export interface ToDo {
  id: number,
  title: string,
  description: string,
  writer: number,
  ifc: number,
  createDate: Date,
  deadline: Date,
  manager: number,
  manager_name: string,
  manager_position: string,
  expressIDs: string,
  priority: ToDoPriority,
  camera: { position: THREE.Vector3, target: THREE.Vector3, cameraType: string; };
}

export default (components: OBC.Components, projectsManager: ProjectsManager) => {

  const fragmentsManager = components.get(OBC.FragmentsManager);
  const world = components.get(OBC.Worlds).list.values().next().value;

  const highlighter = components.get(OBF.Highlighter);

  let currentSortBy: 'Title' | 'Deadline' | 'Priority' = 'Deadline';
  const selectedPriorities = new Set<ToDoPriority>();
  let currentFilterByManager: number = 0;
  let currentIfcId: number = 0;


  fragmentsManager.onFragmentsDisposed.add(() => {
    const world = components.get(OBC.Worlds).list.values().next().value;
    clearMarkers(components, world);
    highlighter.clear();
  });

  highlighter.events.select.onHighlight.add(async () => {
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
      currentIfcId = 0;
      return;
    }

    currentIfcId = ifcId;

    if (currentIfcId > 0) {
      const managerDropdown = await createManagerDropdown();
      const managerDropdownContainer = document.querySelector<HTMLElement>('#manager-dropdown-container');
      const filters = await createFilters();
      const filterContainer = document.querySelector<HTMLElement>('#filter-container');

      if (!filters) {
        console.error('filters container not found');
        return;
      }

      if (managerDropdownContainer) {
        managerDropdownContainer.innerHTML = '';
        managerDropdownContainer.appendChild(managerDropdown);
      } else {
        console.error('ManagerDropdown container not found');
      }

      if (filterContainer) {
        filterContainer.innerHTML = '';
        filterContainer.appendChild(filters);
      } else {
        console.error('filterContainer not found');
      }
        updateToDoList(currentIfcId);
    }  
  });
  

  const handleCreateClick = async () => {

    const titleInput = document.querySelector<HTMLInputElement>("#title-input");
    const descriptionInput = document.querySelector<HTMLInputElement>("#description-input");
    const deadlineInput = document.querySelector<HTMLInputElement>("#deadline-input");
    const priorityDropdown = document.querySelector<HTMLSelectElement>("#priority");
    const managerSelect = document.querySelector<HTMLSelectElement>("#managerDropdown");

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

    if (!titleInput?.value.trim())
    {
      alert("Please fill in title fields.");
      return;
    }
    else if (!descriptionInput?.value.trim())
    {
      alert("Please fill in all required fields.");
      return;
    }  
    else if  (!managerSelect?.value)
    {
      alert("Please select manager.");
      return;
    }
    else if (!deadlineInput?.value)
    {
      alert("Please select deadline.");
      return;
    }
    else if (!priorityDropdown?.value)
    {
      alert("Please select priority.");
      return;
    }

    // Check title length
    else if (titleInput.value.length > 20) {
      alert("Please do not exceed 20 characters for the title.");
      return; 
    }
    // Check description length
    else if (descriptionInput.value.length > 50) {
      alert("Please do not exceed 50 characters for the description.");
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
        title: titleInput.value,
        description: descriptionInput.value,
        writer: 1,
        ifc: ifcId,
        manager: parseInt(managerSelect.value),
        deadline: deadlineInput.value,
        priority: priorityDropdown?.value || "LOW",
        expressIDs: expressIDsJson,
        camera: todoCamera
      };
    
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

      if (titleInput) titleInput.value = '';
      if (descriptionInput) descriptionInput.value = '';
      if (managerSelect) managerSelect.value = '';
      if (deadlineInput) deadlineInput.value = '';
      if (priorityDropdown) priorityDropdown.value = 'LOW';
      highlighter.clear("select");

    } catch (error) {
      console.error("Error creating todo:", error);
    }
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
      const expressIDsArray = Array.from(expressIDs || []);
      const selectedExpressIDs = new Set<number>(expressIDsArray);
  
      const todoListContainer = document.querySelector<HTMLElement>('#todos');
      if (!todoListContainer) {
        console.error('Todo list container not found');
        return;
      }
  
      const filterByPriority = Array.from(selectedPriorities).join(',');
  
      await fetchAndRenderTodos(
        currentIfcId,
        todoListContainer,
        selectedExpressIDs,
        filterByPriority,
        currentFilterByManager
      );

    } catch (error) {
      console.error('Error updating todo list:', error);
    }
  };
    

  const fetchAndRenderTodos = async (
    ifcId: number,
    container: HTMLElement,
    selectedExpressIDs: Set<number>,
    filterByPriority: string,
    filterByManager?: number
  ) => {
    try {
      const url = new URL(`http://localhost:3000/api/todo/${ifcId}`);
      url.searchParams.append("sortBy", currentSortBy);
      if (filterByPriority) {
        url.searchParams.append("filter", filterByPriority);
      }
      if (filterByManager !== undefined) {
        url.searchParams.append("manager", filterByManager.toString())
      }
  
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch sorted todos: ${response.statusText}`);
      }
  
      const todos = await response.json();
      renderTodos(todos, container, selectedExpressIDs);
    } catch (error) {
      console.error('Error fetching and rendering sorted todos:', error);
    }
  };

  const renderTodos = (
    todos: any[],
    container: HTMLElement,
    selectedExpressIDs: Set<number>
  ) => {
    container.innerHTML = '';

    const todoListContainer = document.querySelector<HTMLSelectElement>('#todos'); 
    if (!todoListContainer) {
      console.error('Todo items container not found.');
      return;
    }
  
    todoListContainer.innerHTML = ''; 
  
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


  // Edit Todo
  const editTodo = async (todo: ToDo) => {
    try {
      const todoSection = document.getElementById(`edit-${todo.id}`)?.parentElement?.parentElement;

      if (!todoSection) {
        console.error("Todo section not found.");
        return;
      }

      todoSection.innerHTML = '';

      // Title Input
      const titleInput = document.createElement('bim-text-input');
      titleInput.setAttribute('label', 'Title');
      titleInput.value = todo.title;
      todoSection.appendChild(titleInput);

      // Description Input
      const descriptionInput = document.createElement('bim-text-input');
      descriptionInput.setAttribute('label', 'Description');
      descriptionInput.value = todo.description;
      todoSection.appendChild(descriptionInput);

      // Manager Dropdown
      const managerDropdown = document.createElement('bim-dropdown');
      managerDropdown.setAttribute('label', 'Manager');

      await fetch(`http://localhost:3000/api/managers/${currentIfcId}`)
        .then(response => response.json())
        .then(managers => {
          managers.forEach((manager: { id: number; name: string; position: string }) => {
            const option = document.createElement('bim-option');
            option.setAttribute('label', `${manager.name} [${manager.position}]`);
            option.setAttribute('value', manager.id.toString());
            managerDropdown.appendChild(option);
          });
        });
      todoSection.appendChild(managerDropdown);

      // Priority Dropdown
      const priorityDropdown = document.createElement('bim-dropdown');
      priorityDropdown.setAttribute('label', 'Priority');
      ['HIGH', 'MEDIUM', 'LOW'].forEach(priority => {
        const option = document.createElement('bim-option');
        option.setAttribute('label', priority);
        option.setAttribute('value', priority);
        priorityDropdown.appendChild(option);
      });

      // Dropdown value
      priorityDropdown.value = [todo.priority];
      todoSection.appendChild(priorityDropdown);

      // Deadline Input
      const deadlineInput = document.createElement('bim-text-input');
      deadlineInput.setAttribute('type', 'date');
      deadlineInput.setAttribute('label', 'Deadline');
      deadlineInput.value = new Date(todo.deadline).toISOString().split('T')[0];
      todoSection.appendChild(deadlineInput);

      // Save Button
      const saveButton = document.createElement('bim-button');
      saveButton.setAttribute('label', 'Save');
      saveButton.addEventListener('click', async () => {
        const updatedTodo = {
          ...todo,
          title: titleInput.value,
          description: descriptionInput.value,
          manager: managerDropdown.value && managerDropdown.value.length > 0
          ? parseInt(managerDropdown.value[0], 10)
          : parseInt(todo.manager.toString(), 10),
          priority: Array.isArray(priorityDropdown.value)
            ? (priorityDropdown.value[0] as ToDoPriority)
            : (priorityDropdown.value as ToDoPriority),
          deadline: new Date(deadlineInput.value),
        };

        try {
          const response = await fetch(`http://localhost:3000/api/todo/${todo.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedTodo),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }

          updateToDoList(todo.ifc);
        } catch (error) {
          console.error('Failed to update todo:', error);
        }
      });
      todoSection.appendChild(saveButton);

      // Cancel button
      const cancelButton = document.createElement('bim-button');
      cancelButton.setAttribute('label', 'Cancel');
      cancelButton.addEventListener('click', () => {
        updateToDoList(todo.ifc);
      });
      todoSection.appendChild(cancelButton);
    } catch (error) {
      console.error('Error in editTodo:', error);
    }
  };
  
    
  // Delete Todo
  const deleteTodo = async (todo: ToDo) => {
      if (!confirm("데이터베이스에서 삭제하시겠습니까?")) return;
      try {
        const response = await fetch(`http://localhost:3000/api/todo/${todo.id}`, {
          method: "DELETE",
        });

      if (response.ok) {
        alert(`데이터베이스에서 삭제되었습니다.`);
        updateToDoList(todo.ifc);
      } 
      else
      {
        const errorText = await response.text();
        console.error("ToDo 삭제 실패:", errorText);
        alert("Todo 삭제에 실패하였습니다.");
        throw new Error(`HTTP error! status: ${response.status}`);
      }

  }
    catch {
      console.log("Error deleteing todo");
    }
  }


  const createTodoSection = (todo: ToDo, selectedExpressIDs: Set<number>) => {

    const todoSection = document.createElement('div');
    todoSection.style.padding = '0';
    const todoExpressIDsArray: number[][] = JSON.parse(todo.expressIDs);
    const todoExpressIDs = new Set(todoExpressIDsArray.flat());

    if ([...todoExpressIDs].some(id => selectedExpressIDs.has(id))) {
      todoSection.style.border = '2px solid yellow'; 
      todoSection.style.borderRadius = '5px'; 
    }
        
    const panelSection = document.createElement('bim-panel-section');
    panelSection.collapsed = true;
    panelSection.style.padding = '0rem';
    panelSection.style.margin = '0rem';
    panelSection.setAttribute('label', todo.title);
    panelSection.setAttribute('icon', 'mdi:card-text-outline');

    // Description
    const descriptionLabel = document.createElement('bim-label');
    descriptionLabel.textContent = `Description: ${todo.description}`;
    panelSection.appendChild(descriptionLabel);
  
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

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
  
    // Track button
    const trackButton = document.createElement('bim-button');
    trackButton.setAttribute('label', 'Track');
    trackButton.id = `track-${todo.id}`;
    trackButton.addEventListener('click',function handleClick() {
      trackFragment(todo);
    });
    buttonContainer.appendChild(trackButton);

    // Edit button
    const editButton = document.createElement('bim-button');
    editButton.setAttribute('label', 'Edit');
    editButton.id = `edit-${todo.id}`;
    editButton.addEventListener('click',function handleClick() {
      editTodo(todo);
    });
    buttonContainer.appendChild(editButton);
  
    // Delete button
    const deletButton = document.createElement('bim-button');
    deletButton.setAttribute('label', 'Delete');
    deletButton.id = `delete-${todo.id}`;
    deletButton.addEventListener('click',function handleClick() {
      deleteTodo(todo);
    });
    buttonContainer.appendChild(deletButton);

    panelSection.appendChild(buttonContainer);
    todoSection.appendChild(panelSection);

    return todoSection;
  };
    
  
  const createManagerDropdown = async () => {

    const managerDropdown = document.createElement('bim-dropdown');
    managerDropdown.setAttribute('label', 'Manager');
    managerDropdown.setAttribute('id', 'managerDropdown');
  
    if (currentIfcId <= 0) {
      console.warn("currentIfcId is not valid. Cannot load managers.");
      return managerDropdown;
    }
  
    try {
      const response = await fetch(`http://localhost:3000/api/managers/${currentIfcId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const managers = await response.json();
  
      managers.forEach((manager: { id: number; name: string; position: string }) => {
        const option = document.createElement('bim-option');
        option.setAttribute('label', `${manager.name} [${manager.position}]`);
        option.setAttribute('value', manager.id.toString());
        managerDropdown.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  
    return managerDropdown;
  
  };


  const createFilters = async () => {

    const container = document.createElement('div');

    const priorityFilterContainer = document.createElement('div');
    priorityFilterContainer.style.marginBottom = '1rem';
    priorityFilterContainer.style.display = 'flex';
    priorityFilterContainer.style.gap = '10px';

    // Priority label
    const priorityLabel = document.createElement('bim-label');
    priorityLabel.textContent = 'Priority';
    priorityLabel.style.marginRight = '1rem';
    priorityFilterContainer.appendChild(priorityLabel);
  
    // Priority checkbox
    ['HIGH', 'MEDIUM', 'LOW'].forEach(priority => {
      const checkbox = document.createElement('bim-checkbox');
      checkbox.label = priority;
      checkbox.checked = selectedPriorities.has(priority as ToDoPriority);
  
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selectedPriorities.add(priority as ToDoPriority);
        } else {
          selectedPriorities.delete(priority as ToDoPriority);
        }
        updateToDoList(currentIfcId);
      });
  
      priorityFilterContainer.appendChild(checkbox);
    });
  

    container.appendChild(priorityFilterContainer);

    const managerDropdown = document.createElement('bim-dropdown');
    managerDropdown.label = 'Manager';
    managerDropdown.style.marginBottom = '1rem';
    if (!managerDropdown) {
      console.error('ManagerDropdown not found');
      return;
    }
  
    fetch(`http://localhost:3000/api/managers/${currentIfcId}`)
      .then(response => response.json())
      .then(managers => {
        managers.forEach((manager: { id: number; name: string; position: string }) => {
          const option = document.createElement('bim-option');
          option.setAttribute('label', `${manager.name} [${manager.position}]`);
          option.setAttribute('value', manager.id.toString());
          managerDropdown.appendChild(option);
        });
  
        managerDropdown.addEventListener('change', () => {
          const selectedManager = Array.isArray(managerDropdown.value)
            ? managerDropdown.value[0]
            : managerDropdown.value;
  
          currentFilterByManager = parseInt(selectedManager, 10);
  
          updateToDoList(currentIfcId);
        });
      });
  
      container.appendChild(managerDropdown);

    // Sort By - Sort dropdown
    const sortDropdown = document.createElement('bim-dropdown');
    sortDropdown.setAttribute('label', 'Sort By');
    sortDropdown.style.marginBottom = '1rem';
  
    ['Title', 'Deadline', 'Priority'].forEach(sortKey => {
      const option = document.createElement('bim-option');
      option.setAttribute('label', sortKey.charAt(0).toUpperCase() + sortKey.slice(1));
      option.addEventListener('click', () => {
        currentSortBy = sortKey as 'Title' | 'Deadline' | 'Priority';
        updateToDoList(currentIfcId);
      });
      sortDropdown.appendChild(option);
    });

    container.appendChild(sortDropdown);

    return container;
  
  };
  
  
  

  const fragment = BUI.Component.create(() => {
      
    return BUI.html`
      <bim-panel-section id='todo-panel-section' label="Todo" icon="mdi:clipboard-list">
        <bim-panel-section id="new-todo" label="New Todo" icon="mdi:card-text">
          <bim-label>Title</bim-label>
          <bim-text-input 
            id="title-input" 
            vertical 
            placeholder="Please write a title. (20 character limit)">
          </bim-text-input>
          <bim-label>Description</bim-label>
          <bim-text-input 
            id="description-input" 
            vertical 
            placeholder="Please write a description. (50 character limit)"> 
          </bim-text-input>
          <div id="manager-dropdown-container"></div>          
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
        <bim-panel-section id ="filter-container" label="Filters">
        </bim-panel-section>
        <bim-panel-section id="todos" label="Todos">
        </bim-panel-section>        
        </bim-panel-section>
      </bim-panel-section>
    `;
  });

  return fragment;
}