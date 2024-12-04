import express, { Application, Request, Response } from "express";
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';


const app: Application = express();
const port: number = 3000;
const db = new Database('testDB.db');


app.use(express.json());
app.use(cors());

app.listen(port, () => {
  console.log(`Connected successfully on port ${port}`)
});

app.get('/', (res: Response) =>  {
  res.send('IFC Viewer')
});


// get all projects
app.get('/api/projects', (_req: Request, res: Response) => {
  try {
    const selectProjectSQL = db.prepare("SELECT * FROM project");
    const projects = selectProjectSQL.all();
    console.log('projects: ', projects);
    res.json(projects);
  } catch (err) {
    console.error("Error fetching projects: ", err);
    res.status(500).json({ error: "Failed to fetch projects" });  }
});

// get project
app.get('/api/projects/simple', (_req: Request, res: Response) => {
  try {
    const selectProjectSQL = db.prepare("SELECT id, name, project_ifc FROM project");
    const projects = selectProjectSQL.all();
    console.log('projects simple info: ', projects);
    res.json(projects);
  } catch (err) {
    console.error("Error fetching projects: ", err);
    res.status(500).json({ error: "Failed to fetch projects" });  }
});
  
// get project
app.get('/api/projects/manager', (_req: Request, res: Response) => {
  try {
    const selectManagerSQL = db.prepare("SELECT name, position FROM manager");
    const managers = selectManagerSQL.all();
    console.log('managers: ', managers);
    res.json(managers);
  } catch (err) {
    console.error("Error fetching managers: ", err);
    res.status(500).json({ error: "Failed to fetch managers" });  }
});
  

// get IFC
app.get('/api/ifc/:id', (req: Request, res: Response) => {
  try {
    const ifcId = parseInt(req.params.id, 10);
    const selectIFCSQL = db.prepare("SELECT * FROM ifc WHERE id = ?");
    const ifc = selectIFCSQL.get(ifcId) as { content: Buffer };

    if (!ifc) {
      console.warn(`IFC data not found for id: ${ifcId}`);
      res.status(404).json({ error: "IFC data not found" });
      return;
    }

    if (ifc.content) {
      // Buffer to Base64 string
      const base64Content = ifc.content.toString('base64');
      const ifcResponse = {
        content: base64Content,
      };    
      res.json(ifcResponse);  
    }  else {
      console.error("IFC content is empty for id:", ifcId);
      res.status(404).json({ error: "IFC content is empty" });
    }
  } 
   catch (err) {
    console.error("Error fetching IFC:", err);
    res.status(500).json({ error: "Failed to fetch IFC" });
  }
});

// get Manager info
app.get('/api/manager/info', (_req: Request, res: Response) => {
  try {
    const selectProjectSQL = db.prepare("SELECT id, name, project_ifc FROM manager");
    const projects = selectProjectSQL.all();
    console.log('projects simple info: ', projects);
    res.json(projects);
  } catch (err) {
    console.error("Error fetching projects: ", err);
    res.status(500).json({ error: "Failed to fetch projects" });  }
});


// create todo
app.post('/api/todo', (req: Request, res: Response) => {
  try {
    const { description, manager, deadline, priority } = req.body;
    
    const insertTodoSQL = db.prepare(`
      INSERT INTO todo (content, manager, createDate, deadline, priority)
      VALUES (?, ?, datetime('now'), ?, ?)
    `);

    const result = insertTodoSQL.run(
      description,
      manager,
      deadline,
      priority
    );

    console.log('Todo created:', result);
    res.status(201).json({ 
      message: "Todo created successfully", 
      id: result.lastInsertRowid 
    });
  } catch (err) {
    console.error("Error creating todo:", err);
    res.status(500).json({ error: "Failed to create todo" });
  }
});


const ifcSQL = `
  CREATE TABLE IF NOT EXISTS ifc (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    content BLOB
  )
`;

const managerSQL = `
  CREATE TABLE IF NOT EXISTS manager (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255),
    position VARCHAR(255),
    company VARCHAR(255),
    department VARCHAR(255),
    team VARCHAR(255)
  )
`;

// name TEXT UNIQUE -?
const projectSQL = `
  CREATE TABLE IF NOT EXISTS project (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    status TEXT,
    finishDate TEXT,
    project_ifc INTEGER,
    FOREIGN KEY (project_ifc) REFERENCES ifc(id)
  )
`;

const todoSQL  = `
CREATE TABLE IF NOT EXISTS todo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content VARCHAR(255),
  writer INTEGER,
  project_ifc INTEGER,
  manager INTEGER,
  createDate DATE,
  deadline DATE,
  priority TEXT CHECK(priority IN ('LOW', 'Medium', 'High')),
  FOREIGN KEY (project_ifc) REFERENCES ifc(id),
  FOREIGN KEY (manager) REFERENCES manager(id)
)
`;

// const todoSQL = `
//   CREATE TABLE IF NOT EXISTS todo (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     content VARCHAR(255),
//     writer INTEGER,
//     ifc INTEGER,
//     manager INTEGER,
//     createDate DATE,
//     deadline DATE,
//     priority TEXT CHECK(priority IN ('LOW', 'Medium', 'High')),
//     FOREIGN KEY (IFC) REFERENCES ifc(id),
//     FOREIGN KEY (manager) REFERENCES manager(id)
//   )
// `;

// ifc file path
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const filePath = path.join(__dirname, '../../sampleIFC/HNS-CTL-MOD-EST-001.ifc');

function setupIfcDatabase() {
    db.exec(ifcSQL);
    console.log('IFC Table created or already exists.');
}

function insertIfcSQL() {
  try {
      const fileContent = fs.readFileSync(filePath);
      const insertIfcSQL = `
          INSERT INTO ifc (name, content)
          VALUES (?, ?)
      `;
      db.prepare(insertIfcSQL).run("HNS-CTL-MOD-EST-001.ifc", fileContent);
      console.log("IFC file inserted into the database.");
      } catch (err) {
      console.error('Error reading or inserting the file:', err);
  }
}

function selectIFCs() {
  try {
    const selectIFCSQL = db.prepare("SELECT id FROM ifc");
    const rows = selectIFCSQL.get();
    if (rows) {
      console.log('Retrieved rows:', rows);
    } else {
      console.log('No row found with the given ID.');
    }
  } catch (err) {
    console.error('Error selecting IFCs:', err);
  }
}

function selectIFC(id: number) {
  try {
    const selectIFCSQL = db.prepare("SELECT * FROM ifc WHERE id = ?");
    const row = selectIFCSQL.get(id);
    if (row) {
      console.log('Retrieved row:', row);
    } else {
      console.log('No row found with the given ID.');
    }
  } catch (err) {
    console.error('Error selecting IFC:', err);
  }
}

function deleteIFC(id: number) {
  try {
    const deleteIFCSQL = db.prepare("DELETE FROM ifc WHERE id = ?");
    const row = deleteIFCSQL.run(id);
    if (row) {
      console.log('Retrieved row:', row);
    } else {
      console.log('No row found with the given ID.');
    }
  } catch (err) {
    console.error('Error deleting IFC:', err);
  }
}

function deleteProject(id: number) {
  try {
    const deleteProejctSQL = db.prepare("DELETE FROM project WHERE id = ?");
    const row = deleteProejctSQL.run(id);
    if (row) {
      console.log('Retrieved row:', row);
    } else {
      console.log('No row found with the given ID.');
    }
  } catch (err) {
    console.error('Error deleting Project:', err);
  }
}

function setupManagerDatabase() {
  try {
    db.prepare("DROP TABLE IF EXISTS manager").run();

    db.prepare(managerSQL).run();
  } catch (error) {
    console.error('Error setting up manager database:', error);
  }
}

function insertManager(name: string, position:string, company:string, department:string, team: string) {
  try {
      const insertManagerSQL = `
        INSERT INTO manager (name, position, company, department, team)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.prepare(insertManagerSQL).run(name, position, company, department, team);
      console.log("Project inserted into the database.");
    } catch (err) {
      console.error('Error inserting project:', err);
    }
}


function deleteManager(id: number) {
  try {
    const deleteManagerSQL = db.prepare("DELETE FROM manager WHERE id = ?");
    const row = deleteManagerSQL.run(id);
    if (row) {
      console.log('Retrieved row:', row);
    } else {
      console.log('No row found with the given ID.');
    }
  } catch (err) {
    console.error('Error deleting Manager:', err);
  }
}

// async function selectManager() {
//   return new Promise<void>((resolve, reject) => {
//     const selectManagerSQL = `SELECT * FROM manager WHERE id = ?`;
//     db.get(selectManagerSQL, 1, (err: Error | null, row: any) => {
//       if (err) {
//         console.error(err.message);
//         reject(err);
//       } else {
//         console.log('Retrieved row:', row);
//         resolve();
//       }
//     });
//   });
// }

function setupProjectDatabase() {
  db.exec(projectSQL);
  console.log('Project Table created or already exists.');
}

function insertProject() {
  try {
      const insertProjectSQL = `
        INSERT INTO project (name, description, status, finishDate, project_ifc)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.prepare(insertProjectSQL).run("project2", "description2", "pending", "2024-11-27", 14);
      console.log("Project inserted into the database.");
    } catch (err) {
      console.error('Error inserting project:', err);
    }
}

function selectProject(id: number) {
  try {
    const selectProjectSQL = db.prepare("SELECT * FROM project WHERE id = ?");
    const row = selectProjectSQL.get(id);
    if (row) {
      console.log('Retrieved row:', row);
    } else {
      console.log('No row found with the given ID.');
    }
  } catch (err) {
    console.error('Error selecting project:', err);
  }
}

function selectProjects() {
  try {
    const selectProjectSQL = db.prepare("SELECT * FROM project");
    const row = selectProjectSQL.all();
    if (row) {
      console.log('Retrieved row:', row);
    } else {
      console.log('No row found with the given ID.');
    }
  } catch (err) {
    console.error('Error selecting project:', err);
  }
}
  

function setupTodoDatabase() {
  try {
    db.prepare("DROP TABLE IF EXISTS todo").run();

    db.prepare(todoSQL).run();
  } catch (error) {
    console.error('Error setting up todo database:', error);
  }
}

function closeDatabase() {
  db.close();
  console.log("Close Database.");
}

function main() {
  try {

    setupTodoDatabase();

    // insertManager("Kim Wonsam", "Team Leader", "Kepcoenc", "Digital Transformation Department", "Data Management Team");
    // insertManager("Choi Yeonghui", "General Manager", "Kepcoenc", "Digital Transformation Department", "Data Management Team");
    // insertManager("Jeon Hyeseon", "Senior Manager", "Kepcoenc", "Digital Transformation Department", "Data Management Team");
    // insertManager("Lee Choonghyeon", "Senior Manager", "Kepcoenc", "Digital Transformation Department", "Data Management Team");
    // insertManager("Baek Ilhong", "Senior Manager", "Kepcoenc", "Digital Transformation Department", "Data Management Team");
    // insertManager("Oh Hyeontaek", "Senior Manager", "Kepcoenc", "Digital Transformation Department", "Data Management Team");
    // insertManager("Gwak Iseo", "Staff", "Kepcoenc", "Digital Transformation Department", "Data Management Team");
    // insertManager("Seo Youngeun", "Intern", "Kepcoenc", "Digital Transformation Department", "Data Management Team");


  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    closeDatabase();
  }
}

// main();