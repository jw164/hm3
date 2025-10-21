Task Management API (Todo List API)

A complete RESTful API for task management, built with Node.js, Express, and MongoDB.
Supports advanced querying, validation, statistics, full CRUD for users & tasks, bulk updates, search, and bidirectional consistency.

Table of Contents

Tech Stack

Features

API Overview

Project Structure

Getting Started

Environment Variables

Seeding

Query Parameters

Endpoints & Examples

Users

Tasks

Data Models

Response Format

HTTP Status Codes

Validation Rules

Notes for Production

License

Tech Stack

Node.js – JavaScript runtime

Express – Web application framework

MongoDB Atlas – Cloud database

Mongoose – MongoDB ODM

dotenv – Environment variables

cors – Cross-origin resource sharing

morgan – HTTP logging

Features
Core

✅ Users CRUD

✅ Tasks CRUD

✅ Advanced query filtering (where, sort, skip, limit, select, populate)

✅ Data validation & centralized error handling

✅ Bidirectional integrity (user–task)

✅ Statistics endpoints

✅ Bulk operations

✅ Keyword search (title/description/tags)

Query Parameters

where: JSON filter (e.g., {"status":"pending"})

sort: JSON sort (e.g., {"priority":-1,"dueDate":1})

skip: integer offset

limit: integer page size (1–100)

select: JSON array of fields (e.g., ["title","status"])

populate: JSON populate config (e.g., {"path":"userId","select":"name email"})

API Overview

Base URL (local): http://localhost:3000/api

Users

GET /users – list (with query params)

GET /users/:id – get one

POST /users – create

PUT /users/:id – update

DELETE /users/:id – delete user and their tasks

GET /users/:id/tasks – list tasks of a user

GET /users/stats – user statistics

Tasks

GET /tasks – list (with query params)

GET /tasks/:id – get one

POST /tasks – create

PUT /tasks/:id – update

DELETE /tasks/:id – delete

GET /tasks/stats – task statistics

GET /tasks/search – keyword search

PATCH /tasks/batch-update – bulk status update
.
├── config/
│   └── database.js          
├── models/
│   ├── User.js              
│   └── Task.js              
├── controllers/
│   ├── userController.js   
│   └── taskController.js    
├── routes/
│   ├── userRoutes.js        
│   └── taskRoutes.js        
├── middleware/
│   ├── queryParser.js       
│   └── errorHandler.js      
├── scripts/
│   └── seed.js              
├── server.js                
├── package.json             
├── .gitignore              
└── README.md               
```

Development Notes
Query Parameter Examples

Complex Conditional Query

?where={"status":"pending","priority":{"$in":["high","urgent"]}}


Multi-field Sorting

?sort={"priority":-1,"dueDate":1}


Populate (Join Query)

?populate={"path":"userId","select":"name email role"}


Combined Usage

?where={"status":"in-progress"}&sort={"dueDate":1}&skip=0&limit=10&populate={"path":"userId","select":"name email"}

Notes

The MongoDB Atlas connection string must be correctly configured.

Ensure sufficient database storage space.

The limit parameter has a maximum value of 100.

Date fields should follow the ISO 8601 standard format.

Deleting a user will automatically delete all associated tasks.
