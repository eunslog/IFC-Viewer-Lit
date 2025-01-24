import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

const app = express();
const port: number = 3000;
const db = new Database("testDB.db");
const IFC_BASE_PATH = "C:/Users/Owner/Desktop/sampleIFC";

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));

app.listen(port, () => {
  console.log(`Connected successfully on port ${port}`);
});

app.get("/", (_req: Request, res: Response) => {
  res.send("IFC Viewer");
  return;
});


// Get managers
app.get("/api/manager", async (_req: Request, res: Response): Promise<any> => {
  try {
    const selectManagerSQL = db.prepare(
      "SELECT id, name, position FROM manager",
    );
    const managers = selectManagerSQL.all();
    return res.json(managers);
  } catch (err) {
    console.error("Error fetching managers: ", err);
    return res.status(500).json({ error: "Failed to fetch managers" });  }
});

// Get ifcs name
app.get("/api/ifcs/name", (_req: Request, res: Response) => {
  try {
    const selectIFCsSQL = db.prepare("SELECT id, name FROM ifc");
    const ifcs = selectIFCsSQL.all();
    res.json(ifcs);
  } catch (err) {
    console.error("Error fetching ifcs: ", err);
    res.status(500).json({ error: "Failed to fetch ifcs" });  }
});

// Get IFC
app.get("/api/ifc/:id", (req: Request, res: Response) => {
  try {
    const ifcId = parseInt(req.params.id, 10);
    const selectIFCSQL = db.prepare("SELECT * FROM ifc WHERE id = ?");
    const ifc = selectIFCSQL.get(ifcId) as { content: Buffer, name: string };

    if (!ifc) {
      console.warn(`IFC data not found for id: ${ifcId}`);
      res.status(404).json({ error: "IFC data not found" });
      return;
    }

    if (ifc.content) {
      // Buffer to Base64 string
      const base64Content = ifc.content.toString("base64");
      const ifcResponse = {
        name: ifc.name,
        content: base64Content,
      };
      res.json(ifcResponse);
    } else {
      console.error("IFC content is empty for id:", ifcId);
      res.status(404).json({ error: "IFC content is empty" });
    }
  } catch (err) {
    console.error("Error fetching IFC:", err);
    res.status(500).json({ error: "Failed to fetch IFC" });
  }
});

// Post IFC
app.post("/api/ifc", (req: Request, res: Response) => {
  try {
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

    const result = insertIfcSQL.run(name, bufferContent);

    res.status(201).json({
      message: "IFC inserted successfully",
      id: result.lastInsertRowid,
    });
  } catch (err) {
    console.error("Error reading or inserting the ifc file:", err);
  }
});

// Delete IFC
app.delete("/api/ifc/:id", (req: Request, res: Response) => {
  try {
    const ifcId = parseInt(req.params.id, 10);
    if (Number.isNaN(ifcId)) {
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
app.post("/api/todo", (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      writer,
      ifc,
      manager,
      deadline,
      priority,
      expressIDs,
    } = req.body;
    const camera = JSON.stringify(req.body.camera);

    const insertTodoSQL = db.prepare(`
      INSERT INTO todo (
        title,
        description, 
        writer, 
        ifc, 
        manager, 
        createDate, 
        deadline, 
        priority,
        expressIDs,
        camera
      ) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'), ?, ?, ?, ?)
    `);

    const result = insertTodoSQL.run(
      title,
      description,
      writer,
      ifc,
      manager,
      deadline,
      priority,
      expressIDs,
      camera,
    );

    res.status(201).json({
      message: "Todo created successfully",
      id: result.lastInsertRowid ,
    });
  } catch (err) {
    console.error("Error creating todo:", err);
    res.status(500).json({ error: "Failed to create todo" });
  }
});

// Get sorted and filtered todo list
app.get("/api/todo/:id", (req: Request, res: Response) => {
  try {
    const ifcId = parseInt(req.params.id, 10);
    if (Number.isNaN(ifcId)) {
      res.status(400).json({ error: "Invalid IFC ID" });
      return;
    }

    const sortBy = req.query.sortBy as
      | "Title"
      | "Deadline"
      | "Priority"
      | undefined;
    const filterByPriority = req.query.filter as string | undefined;
    const filterByManager = req.query.manager
      ? parseInt(req.query.manager as string, 10)
      : undefined;

    const priorityList = filterByPriority
      ? filterByPriority
          .split(",")
          .filter((priority) => ["HIGH", "MEDIUM", "LOW"].includes(priority))
      : [];

    let orderByClause = "ORDER BY createDate ASC";
    if (sortBy) {
      switch (sortBy) {
        case "Title":
          orderByClause = "ORDER BY title COLLATE NOCASE ASC";
          break;
        case "Deadline":
          orderByClause = "ORDER BY deadline ASC";
          break;
        case "Priority":
          orderByClause = `
            ORDER BY 
              CASE 
                WHEN priority = 'HIGH' THEN 3
                WHEN priority = 'MEDIUM' THEN 2
                WHEN priority = 'LOW' THEN 1
                ELSE 0
              END DESC,
              deadline ASC
          `;
          break;
        default:
          res.status(400).json({ error: "Invalid sort criteria" });
          return;
      }
    }

    let filterClause = "";
    const queryParams: (number | string)[] = [ifcId];

    if (priorityList.length > 0) {
      const placeholders = priorityList.map(() => "?").join(", ");
      filterClause += `AND priority IN (${placeholders}) `;
      queryParams.push(...priorityList);
    }

    if (filterByManager) {
      filterClause += "AND todo.manager = ? ";
      queryParams.push(filterByManager);
    }

    const selectTodoSQL = `
      SELECT 
        todo.*,
        manager.name as manager_name,
        manager.position as manager_position
      FROM todo
      LEFT JOIN manager ON todo.manager = manager.id
      WHERE todo.ifc = ?
      ${filterClause}
      ${orderByClause}
    `;

    const todos = db.prepare(selectTodoSQL).all(...queryParams);

    res.json(todos);
  } catch (err) {
    console.error("Error fetching sorted and filtered todos:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch sorted and filtered todos" });
  }
});

// Edit Todo
app.put("/api/todo/:id", (req: Request, res: Response) => {
  try {
    const todoId = parseInt(req.params.id, 10);
    if (Number.isNaN(todoId)) {
      res.status(400).json({ error: "Invalid Todo ID" });
      return;
    }

    const { title, description, manager, priority, deadline } = req.body;

    if (!title || typeof title !== "string") {
      res.status(400).json({ error: "Invalid title" });
      return;
    }

    if (!description || typeof description !== "string") {
      res.status(400).json({ error: "Invalid description" });
      return;
    }

    if (!manager || typeof manager !== "number") {
      res.status(400).json({ error: "Invalid manager ID" });
      return;
    }

    if (!priority || !["HIGH", "MEDIUM", "LOW"].includes(priority)) {
      res.status(400).json({ error: "Invalid priority value" });
      return;
    }

    if (!deadline || Number.isNaN(Date.parse(deadline))) {
      res.status(400).json({ error: "Invalid deadline" });
      return;
    }

    const updateTodoSQL = `
      UPDATE todo
      SET 
        title = ?,
        description = ?,
        manager = ?,
        priority = ?,
        deadline = ?
      WHERE id = ?
    `;

    const result = db
      .prepare(updateTodoSQL)
      .run(title, description, manager, priority, deadline, todoId);

    if (result.changes === 0) {
      res.status(404).json({ error: "Todo not found or no changes made" });
      return;
    }

    res.status(200).json({ message: "Todo updated successfully" });
  } catch (error) {
    console.error("Error updating todo:", error);
    res.status(500).json({ error: "Failed to update todo" });
  }
});

// Delete todo
app.delete("/api/todo/:id", (req: Request, res: Response) => {
  try {
    const todoId = parseInt(req.params.id, 10); 
    if (Number.isNaN(todoId)) {
      res.status(400).json({ error: "Invalid Todo ID" });
      return;
    }

    const deleteTodoSQL = db.prepare(`
      DELETE
      FROM todo
      WHERE id = ?
      `);

    const result = deleteTodoSQL.run(todoId);

    if (result.changes > 0) {
      console.log(`Todo with ID ${todoId} deleted successfully.`);
      res.status(200).json({ message: "Todo deleted successfully." });
    } else {
      console.warn(`Todo with ID ${todoId} not found.`);
      res.status(404).json({ error: "Todo not found." });
    }
  } catch (err) {
    console.error("Error deleting Todo:", err);
    res.status(500).json({ error: "Failed to delete Todo" });
  }
});

// Get expressIDs from ifc
app.get("/api/expressIDs/:id", (req: Request, res: Response) => {
  try {
    const ifcId = parseInt(req.params.id, 10);
    if (Number.isNaN(ifcId)) {
      res.status(400).json({ error: "Invalid IFC ID" });
      return;
    }

    const selectExpressIDsSQL = db.prepare(`
      SELECT 
        expressIDs
      FROM
        todo
      WHERE
        todo.ifc = ?
    `);

    const expressIDS = selectExpressIDsSQL.all(ifcId);
    res.json(expressIDS);
  } catch (err) {
    console.error("Error fetching expressIDs:", err);
    res.status(500).json({ error: "FailedR to fetch expressIDs" });
  }
});

app.post("/api/ifc_manager", async (req: Request, res: Response): Promise<any> => {
  try {
    const { ifcId, managerIds } = req.body;

    const parsedIfcId = parseInt(ifcId, 10);

    if (!parsedIfcId || !Array.isArray(managerIds)) {
      return res
        .status(400)
        .json({ error: "IFC ID and manager IDs are required." });
    }

    const insertManagerSQL = db.prepare(`
      INSERT OR IGNORE INTO ifc_manager (ifcId, managerId)
      VALUES (?, ?)
    `);

    for (const managerId of managerIds) {
      insertManagerSQL.run(parsedIfcId, managerId);
    }

    return res.json(managerIds);
  } catch (err) {
    console.error("Error saving managers to IFC:", err);
    return res.status(500).json({ error: "Failed to save managers to IFC" });
  }
});


// Get managers from an ifc
app.get("/api/managers/:id", (req: Request, res: Response) => {
  try {
    const ifcId = parseInt(req.params.id, 10);
    if (Number.isNaN(ifcId)) {
      res.status(400).json({ error: "Invalid IFC ID" });
      return;
    }

    const selectedManagersSQL = db.prepare(`
      SELECT 
        m.id, m.name, m.position
      FROM
        ifc_manager im
      JOIN
        manager m ON im.managerId = m.id
      WHERE
        im.ifcId = ?
    `);

    const managers = selectedManagersSQL.all(ifcId);
    res.json(managers);
  } catch (err) {
    console.error("Error fetching managers:", err); 
    res.status(500).json({ error: "Failed to fetch managers" });
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

const todoSQL = `
  CREATE TABLE IF NOT EXISTS todo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    writer INTEGER,
    ifc INTEGER,
    manager INTEGER,
    createDate TEXT,
    deadline TEXT,
    priority TEXT CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH')),
    expressIDs TEXT,
    camera TEXT,
    FOREIGN KEY (ifc) REFERENCES ifc(id) ON DELETE CASCADE,
    FOREIGN KEY (manager) REFERENCES manager(id) ON DELETE CASCADE
  )
`;

const ifcManagerSQL = ` 
  CREATE TABLE IF NOT EXISTS ifc_manager (
    ifcId INTEGER,
    managerId INTEGER,
    PRIMARY KEY (ifcId, managerId)
  )
`;

function setupIfcDatabase() {
  try {
    db.prepare("DROP TABLE IF EXISTS ifc").run();
    db.prepare(ifcSQL).run();
  } catch (error) {
    console.error("Error setting up ifc database:", error);
  }
}

function setupIfcManagerDatabase() {
  try {
    db.prepare("DROP TABLE IF EXISTS ifc_manager").run();
    db.prepare(ifcManagerSQL).run();
  } catch (error) {
    console.error("Error setting up ifc_manager database:", error);
  }
}

function insertIfcSQL() {
  try {
    const ifcFiles = ["small.ifc", "HNS-CTL-MOD-EST-001.ifc"];

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

      const name = path.basename(fileName, ".ifc");
      const fileContent = fs.readFileSync(filePath);

      insertIfcSQL.run(name, fileContent);
      console.log(`IFC file ${name} inserted into the ifc database.`);
    }
  } catch (err) {
    console.error("Error reading or inserting the files:", err);
  }
}

function selectIFCs() {
  try {
    const selectIFCSQL = db.prepare("SELECT id FROM ifc");
    const rows = selectIFCSQL.get();
    if (rows) {
      console.log("Retrieved rows:", rows);
    } else {
      console.log("No row found with the given ID.");
    }
  } catch (err) {
    console.error("Error selecting IFCs:", err);
  }
}

function selectIFC(id: number) {
  try {
    const selectIFCSQL = db.prepare("SELECT * FROM ifc WHERE id = ?");
    const row = selectIFCSQL.get(id);
    if (row) {
      console.log("Retrieved row:", row);
    } else {
      console.log("No row found with the given ID.");
    }
  } catch (err) {
    console.error("Error selecting IFC:", err);
  }
}

function deleteIFC(id: number) {
  try {
    const deleteIFCSQL = db.prepare("DELETE FROM ifc WHERE id = ?");
    const row = deleteIFCSQL.run(id);
    if (row) {
      console.log("Retrieved row:", row);
    } else {
      console.log("No row found with the given ID.");
    }
  } catch (err) {
    console.error("Error deleting IFC:", err);
  }
}

function setupManagerDatabase() {
  try {
    db.prepare("DROP TABLE IF EXISTS manager").run();

    db.prepare(managerSQL).run();
  } catch (error) {
    console.error("Error setting up manager database:", error);
  }
}

function insertManager(
  name: string,
  position: string,
  company: string,
  department: string,
  team: string,
) {
  try {
    const insertManagerSQL = `
        INSERT INTO manager (name, position, company, department, team)
        VALUES (?, ?, ?, ?, ?)
      `;
    db.prepare(insertManagerSQL).run(name, position, company, department, team);
    console.log("Manager inserted into the database.");
  } catch (err) {
    console.error("Error inserting manager:", err);
  }
}

function deleteManager(id: number) {
  try {
    const deleteManagerSQL = db.prepare("DELETE FROM manager WHERE id = ?");
    const row = deleteManagerSQL.run(id);
    if (row) {
      console.log("Retrieved row:", row);
    } else {
      console.log("No row found with the given ID.");
    }
  } catch (err) {
    console.error("Error deleting Manager:", err);
  }
}

function setupTodoDatabase() {
  try {
    db.prepare("DROP TABLE IF EXISTS todo").run();

    db.prepare(todoSQL).run();

    console.log("complete setup Todo Database.");
  } catch (error) {
    console.error("Error setting up todo database:", error);
  }
}

function closeDatabase() {
  db.close();
  console.log("Close Database.");
}

function main() {
  try {
    // setupIfcManagerDatabase();
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
    console.error("An error occurred:", error);
  } finally {
    closeDatabase();
  }
}

// main();
