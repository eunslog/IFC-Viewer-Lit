import express, { Application, Request, Response } from "express";
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import Database from "better-sqlite3";
import { fileURLToPath } from 'url';


const app: Application = express();
const port: number = 3000;
const db = new Database('testDB.db');

app.use(express.json());
app.use(cors());

app.listen(port, () => {
  console.log(`Connected successfully on port ${port}`)
});

app.get('/', (req: Request, res: Response) =>  {
  res.send('Hello World')
});


// 모든 프로젝트 가져오기
app.get('/api/projects', (req: Request, res: Response) => {
  try {
    const selectProjectSQL = db.prepare("SELECT * FROM project");
    const projects = selectProjectSQL.all();
    console.log('proejcts:', projects);
    res.json(projects);
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});
  

// 특정 IFC 가져오기
app.get('/api/ifc/:id', (req: Request, res: Response) => {
  try {
    const ifcId = parseInt(req.params.id, 10);
    const selectIFCSQL = db.prepare("SELECT * FROM ifc WHERE id = ?");
    const ifc = selectIFCSQL.get(ifcId) as { id: number, name: string, content: Buffer };     if (ifc) {
      // res.json(ifc);
    if (ifc) {
        // Buffer를 Base64 문자열로 변환
      const base64Content = ifc.content.toString('base64');
      const ifcResponse = {
        id: ifc.id,
        name: ifc.name,
        content: base64Content,
      };    
      res.json(ifcResponse);  
    } else {
      res.status(404).json({ error: "IFC not found" });
    }
  } 
}catch (err) {
    console.error("Error fetching IFC:", err);
    res.status(500).json({ error: "Failed to fetch IFC" });
  }
});


const ifcSQL = `
  CREATE TABLE IF NOT EXISTS ifc (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    content BLOB
  )
`;

// const managerSQL = `
//   CREATE TABLE IF NOT EXISTS manager (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     name VARCHAR(255),
//     position VARCHAR(255),
//     company VARCHAR(255),
//     department VARCHAR(255),
//     team VARCHAR(255)
//   )
// `;

//     name TEXT UNIQUE -?
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

// 파일 경로 
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const filePath = path.join(__dirname, '../../sampleIFC/small.ifc');

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
      db.prepare(insertIfcSQL).run("small.ifc", fileContent);
      console.log("IFC file inserted into the database.");
      } catch (err) {
      console.error('Error reading or inserting the file:', err);
  }
}

function selectIFCs() {
  try {
    const selectIFCSQL = db.prepare("SELECT * FROM ifc");
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

function selectIFC() {
  try {
    const selectIFCSQL = db.prepare("SELECT * FROM ifc WHERE id = ?");
    const row = selectIFCSQL.get(1);
    if (row) {
      console.log('Retrieved row:', row);
    } else {
      console.log('No row found with the given ID.');
    }
  } catch (err) {
    console.error('Error selecting IFC:', err);
  }
}

// async function setupManagerDatabase() {
//   return new Promise<void>((resolve, reject) => {
  
//     db.run(managerSQL, (err: Error | null) => {
//       if (err) {
//         console.error(err.message);
//         reject(err);
//       } else {
//         console.log('Manager Table created or already exists');
//         resolve();
//       }
//     });
//   });
// }

// async function insertManager() {
//   return new Promise<void>((resolve, reject) => {

//     const insertManagaerSQL = `
//       INSERT INTO manager (name, position, company)
//       VALUES ("seo", "intern", "kepcoenc")
//     `;
  
//     db.run(insertManagaerSQL, (err: Error | null) => {
//       if (err) {
//         console.error(err.message);
//         reject(err);
//       } else {
//         console.log('Manager insert Row added to the table');
//         resolve();
//       }
//     });
//   });
// }

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
      db.prepare(insertProjectSQL).run("project", "description", "pending", "2024-11-13", 1);
      console.log("Project inserted into the database.");
    } catch (err) {
      console.error('Error inserting project:', err);
    }
}

function selectProject() {
  try {
    const selectProjectSQL = db.prepare("SELECT * FROM project WHERE id = ?");
    const row = selectProjectSQL.get(1);
    if (row) {
      console.log('Retrieved row:', row);
    } else {
      console.log('No row found with the given ID.');
    }
  } catch (err) {
    console.error('Error selecting project:', err);
  }
}
  


// async function setupTodoDatabase() {
//   return new Promise<void>((resolve, reject) => {
  
//     db.run(todoSQL, (err: Error | null) => {
//       if (err) {
//         console.error(err.message);
//         reject(err);
//       } else {
//         console.log('Todo Table created or already exists');
//         resolve();
//       }
//     });
//   });
// }

// async function insertTodo() {
//   return new Promise<void>((resolve, reject) => {
//     const insertTodoSQL = `
//       INSERT INTO todo (content, writer, ifc, manager, createDate, deadline, priority)
//       VALUES ("todo", 1, 1, 1, datetime('now'), datetime('now'), 'LOW')
//     `;
  
//     db.run(insertTodoSQL, (err: Error | null) => {
//       if (err) {
//         console.error(err.message);
//         reject(err);
//       } else {
//         console.log('Todo insert Row added to the table');
//         resolve();
//       }
//     });
//   });
// }

// async function selectTodo() {
//   return new Promise<void>((resolve, reject) => {
//     const selectTodoSQL = `SELECT * FROM todo WHERE id = ?`;
//     db.get(selectTodoSQL, 1, (err: Error | null, row: any) => {
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

function closeDatabase() {
  db.close();
  console.log("Close Database.");
}

function main() {
  try {
    setupIfcDatabase();
    insertIfcSQL();
    selectIFC();

    setupProjectDatabase();
    insertProject();
    selectProject();
    
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    closeDatabase();
  }
}

// main();