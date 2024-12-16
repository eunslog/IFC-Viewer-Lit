import express, { Application, Request, Response } from "express";
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';


const app: Application = express();
const port: number = 3000;
const db = new Database('testDB.db');
const IFC_BASE_PATH = 'C:/Users/Owner/Desktop/sampleIFC';

const corsOptions = {
  origin: 'http://localhost:5173', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'], 
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.listen(port, () => {
  console.log(`Connected successfully on port ${port}`)
});

app.get('/', (res: Response) =>  {
  res.send('IFC Viewer')
});

  
// Get managers
app.get('/api/manager', (_req: Request, res: Response) => {
  try {
    const selectManagerSQL = db.prepare("SELECT id, name, position FROM manager");
    const managers = selectManagerSQL.all();
    console.log('managers: ', managers);
    res.json(managers);
  } catch (err) {
    console.error("Error fetching managers: ", err);
    res.status(500).json({ error: "Failed to fetch managers" });  }
});
  
// Get ifcs name
app.get('/api/ifcs/name', (_req: Request, res: Response) => {
  try {
    const selectIFCsSQL = db.prepare("SELECT id, name FROM ifc");
    const ifcs = selectIFCsSQL.all();
    console.log('ifcs info: ', ifcs);
    res.json(ifcs);
  } catch (err) {
    console.error("Error fetching ifcs: ", err);
    res.status(500).json({ error: "Failed to fetch ifcs" });  }
});
  
// Get IFC
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


// Post IFC
app.post('/api/ifc', (req: Request, res: Response) => {
  try {
    console.log('Request body:', req.body); 
    const { name, content } = req.body; 
    if (!name || !content) {
      res.status(400).json({ error: "Name and content are required." });
      return;
    }

    // Convert content to Uint8Array
    const bufferContent = Buffer.from(content);

    const insertIfcSQL = db.prepare(`
      INSERT INTO ifc (name, content)
      VALUES (?, ?)
    `);

    const result = insertIfcSQL.run(
      name,
      bufferContent
    );

    console.log('ifc inserted:', result);
    res.status(201).json({ 
      message: "IFC inserted successfully", 
      id: result.lastInsertRowid 
    });

  } catch (err) {
    console.error('Error reading or inserting the ifc file:', err);
  }
});

// Delete IFC
app.delete('/api/ifc/:id', (req: Request, res: Response) => {
  try {
    const ifcId = parseInt(req.params.id, 10);
    if (isNaN(ifcId)) {
      res.status(400).json({ error: "Invalid IFC ID" });
      return;
    }

    const deleteIFCSQL = db.prepare("DELETE FROM ifc WHERE id = ?");
    const result = deleteIFCSQL.run(ifcId);

    if (result.changes > 0) {
      console.log(`IFC with ID ${ifcId} deleted successfully.`);
      res.status(200).json({ message: "IFC deleted successfully." });
    } else {
      console.warn(`IFC with ID ${ifcId} not found.`);
      res.status(404).json({ error: "IFC not found." });
    }
  } catch (err) {
    console.error("Error deleting IFC:", err);
    res.status(500).json({ error: "Failed to delete IFC" });
  }
});

// Create todo
app.post('/api/todo', (req: Request, res: Response) => {
  try {
    const { content, writer, ifc, manager, deadline, priority, fragmentMap } = req.body;
    
    console.log('Received Priority:', priority);
    console.log('Request Body:', req.body);


    const insertTodoSQL = db.prepare(`
      INSERT INTO todo (
        content, 
        writer, 
        ifc, 
        manager, 
        createDate, 
        deadline, 
        priority,
        fragmentMap
      ) VALUES (?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'), ?, ?, ?)
    `);

    const result = insertTodoSQL.run(
      content,
      writer,
      ifc,
      manager,
      deadline,
      priority,
      JSON.stringify(fragmentMap)
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

// Get TodoList
app.get('/api/todo', (req: Request, res: Response) => {
  try {
    const selectTodoSQL = db.prepare(`
    SELECT 
      todo.*,
      manager.name as manager_name,
      manager.position as manager_position
    FROM todo
    LEFT JOIN manager ON todo.manager = manager.id
  `);

    const todos = selectTodoSQL.all();
    console.log('todos info: ', todos);
    res.json(todos);
  } 
   catch (err) {
    console.error("Error fetching todos:", err); 
    res.status(500).json({ error: "Failed to fetch todos" });
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
    name TEXT,
    position TEXT,
    company TEXT,
    department TEXT,
    team TEXT
  )
`;

const todoSQL  = `
  CREATE TABLE IF NOT EXISTS todo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    writer INTEGER,
    ifc INTEGER,
    manager INTEGER,
    createDate TEXT,
    deadline TEXT,
    priority TEXT CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH')),
    fragmentMap TEXT,
    FOREIGN KEY (ifc) REFERENCES ifc(id),
    FOREIGN KEY (manager) REFERENCES manager(id)
  )
`;


function setupIfcDatabase() {
  try {
    db.prepare("DROP TABLE IF EXISTS ifc").run();

    db.prepare(ifcSQL).run();
  } catch (error) {
    console.error('Error setting up ifc database:', error);
  }
}

// function insertIfcSQL() {
//   try {
//       const fileContent = fs.readFileSync(filePath);
//       const insertIfcSQL = `
//           INSERT INTO ifc (name, content)
//           VALUES (?, ?)
//       `;
//       db.prepare(insertIfcSQL).run("HNS-CTL-MOD-EST-001.ifc", fileContent);
//       console.log("IFC file inserted into the database.");
//       } catch (err) {
//       console.error('Error reading or inserting the file:', err);
//   }
// }

function insertIfcSQL() {
  try {

    const ifcFiles = [
      'small.ifc',
      'HNS-CTL-MOD-EST-001.ifc'
    ];

    const insertIfcSQL = db.prepare(`
      INSERT INTO ifc (name, content)
      VALUES (?, ?)
    `);

    for (const fileName of ifcFiles) {
      const filePath = path.join(IFC_BASE_PATH, fileName);

      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        continue;
      }

      const name = path.basename(fileName, '.ifc');
      const fileContent = fs.readFileSync(filePath);
      
      insertIfcSQL.run(name, fileContent);
      console.log(`IFC file ${name} inserted into the ifc database.`);
    }

  } catch (err) {
    console.error('Error reading or inserting the files:', err);
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
      console.log("Manager inserted into the database.");
    } catch (err) {
      console.error('Error inserting manager:', err);
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
    // setupTodoDatabase();
    // setupIfcDatabase();    
    // setupManagerDatabase();

    // insertIfcSQL();
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