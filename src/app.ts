// import express, {Application, Response} from "express";
// import cors from 'cors';
// import path from 'path';
// import fs from 'fs';

// const app: Application = express();
// const port: number = 3000;

// app.use(express.json());
// app.use(cors());

// app.get('/', (res: Response) => {
//   res.send('Hello World')
// });

// app.listen(port, () => {
//   console.log(`Connected successfully on port ${port}`)
// });

// const sqlite3 = require('sqlite3').verbose();
// const db = new sqlite3.Database('testDB.db');

// const ifcSQL = `
//   CREATE TABLE IF NOT EXISTS ifc (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     name VARCHAR(255),
//     content BLOB
//   )
// `;

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

// const projectSQL = `
//   CREATE TABLE IF NOT EXISTS project (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     name VARCHAR(255),
//     description VARCHAR(255),
//     role VARCHAR(255),
//     status VARCHAR(255),
//     finishDate DATE,
//     FOREIGN KEY (project_ifc) REFERENCES ifc(id)
//   )
// `;

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

// // 파일 경로 설정
// const filePath = path.join(__dirname, '../../sampleIFC/small.ifc');

// async function setupIfcDatabase() {
//   return new Promise<void>((resolve, reject) => {
  
//     db.run(ifcSQL, (err: Error | null) => {
//       if (err) {
//         console.error(err.message);
//         reject(err);
//       } else {
//         console.log('Ifc Table created or already exists');
//         resolve();
//       }
//     });
//   });
// }

// async function insertIfcSQL() {
//   return new Promise<void>((resolve, reject) => {
//     // 파일을 읽어서 데이터베이스에 삽입
//     fs.readFile(filePath, (err, data) => {
//       if (err) {
//         console.error('Error reading the file:', err);
//         return;
//       }

//       const insertIfcSQL = `
//         INSERT INTO ifc (name, content)
//         VALUES (?, ?)
//       `;

//       db.run(insertIfcSQL, ["first", data], (err: Error | null) => {
//         if (err) {
//           console.error(err.message);
//         } else {
//           console.log('Row added to the table');
//         }
//       })
//     });
//   });
// }

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

// async function setupProjectDatabase() {
//     return new Promise<void>((resolve, reject) => {
    
//       db.run(projectSQL, (err: Error | null) => {
//         if (err) {
//           console.error(err.message);
//           reject(err);
//         } else {
//           console.log('Project Table created or already exists');
//           resolve();
//         }
//       });
//     });
// }

// async function insertProject() {
//     return new Promise<void>((resolve, reject) => {
//       const insertProjectSQL = `
//         INSERT INTO project (name, description, role, status, finishDate, project_ifc)
//         VALUES ("project", "description", "architect", "pending", datetime('now'), 1)
//       `;
    
//       db.run(insertProjectSQL, (err: Error | null) => {
//         if (err) {
//           console.error(err.message);
//           reject(err);
//         } else {
//           console.log('Project insert Row added to the table');
//           resolve();
//         }
//       });
//     });
//   }

//   async function selectProject() {
//     return new Promise<void>((resolve, reject) => {
//       const selectProjectSQL = `SELECT * FROM project WHERE id = ?`;
//       db.get(selectProjectSQL, 1, (err: Error | null, row: any) => {
//         if (err) {
//           console.error(err.message);
//           reject(err);
//         } else {
//           console.log('Retrieved row:', row);
//           resolve();
//         }
//       });
//     });
//   }
  


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

// async function closeDatabase() {
//   return new Promise<void>((resolve, reject) => {
//     db.close((err: Error | null) => {
//       if (err) {
//         console.error(err.message);
//         reject(err);
//       } else {
//         console.log('Close the database connection.');
//         resolve();
//       }
//     });
//   });
// }

// async function main() {
//   try {
//     // await setupManagerDatabase();
//     // await insertManager();
//     // await selectManager();
//     // await setupTodoDatabase();
//     // await insertTodo();
//     // await selectTodo();
//     await setupProjectDatabase();
//     await insertProject();
//     await selectProject();
//   } catch (error) {
//     console.error('An error occurred:', error);
//   } finally {
//     await closeDatabase();
//   }
// }

// main();