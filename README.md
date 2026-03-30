# Event Ticketing API

A RESTful API for managing event tickets built with Node.js, Express.js and MongoDB.

## Features
- Create and manage events
- Book and cancel tickets
- User authentication and authorization with JWT
- Protected routes for authenticated users only
- JSON responses with proper status codes

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **Authentication:** JSON Web Tokens (JWT)

## Getting Started

### Prerequisites
- Node.js installed
- MongoDB installed or MongoDB Atlas account

### Installation
```bash
git clone https://github.com/coderBOI007/ticketing-api
cd ticketing-api
npm install
```

### Environment Variables
Create a `.env` file in the root directory:
```
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### Run the app
```bash
npm start
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login and get token |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/events | Get all events |
| GET | /api/events/:id | Get a single event |
| POST | /api/events | Create a new event |
| PUT | /api/events/:id | Update an event |
| DELETE | /api/events/:id | Delete an event |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/tickets | Book a ticket |
| GET | /api/tickets | Get all tickets |
| DELETE | /api/tickets/:id | Cancel a ticket |

## Author
Boladale Ibrahim Oluwatosin
