# User and Transactions Relationship Visualization System

This project visualizes relationships between user accounts using transaction data and shared attributes in a Neo4j graph database environment. It includes both backend API services and a frontend visualization interface.

## Features

- **Graph Database**: Neo4j for storing user and transaction relationships
- **Backend API**: RESTful API endpoints for managing users, transactions, and relationships
- **Frontend Visualization**: Interactive graph visualization using Cytoscape.js or a similar library
- **Relationship Detection**: Automatic detection of relationships based on transactions and shared attributes
- **Containerized Environment**: Containerized application for easy deployment

## API Endpoints

- `POST /users`: Add or update user information
- `POST /transactions`: Add or update transaction details
- `GET /users`: List all users
- `GET /transactions`: List all transactions
- `GET /relationships/user/:id`: Fetch all connections of a user
- `GET /relationships/transaction/:id`: Fetch all connections of a transaction
- `GET /analytics/shortestPath`: Find the shortest path between two users
- `GET /analytics/transactionClusters`: Find clusters of transactions sharing attributes
- `GET /export/graph`: Export the full graph in JSON or CSV

## Prerequisites

- Docker and Docker Compose
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. Start the application using Docker Compose

```bash
docker-compose up
```

This will:

Build and start the frontend, backend, and Neo4j containers

Automatically seed the database with sample data

Make the services available at:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:3000](http://localhost:3000)
- Neo4j Browser: [http://localhost:7474](http://localhost:7474) (user: neo4j, password: password)

### 3. To stop the application

```bash
docker-compose down
```

### Database Seeding

The project includes automatic database seeding when containers are started. The seed data includes:

- 7 users with shared attributes (e.g., phone, address, payment methods)
- 10 transactions with direct and indirect user links
- Multiple examples of shared attributes used for relationship detection (e.g., phone number, address, device ID, IP)

If you need to manually trigger reseeding:

```bash
docker-compose run --rm seed
```

## Relationship Types

The system identifies and visualizes the following relationships:

- **User-to-User (Shared Attributes)**: Links based on common emails, phone numbers, addresses, or payment methods.
- **User-to-Transaction**:
  - `SENT_MONEY`: User initiated a transaction.
  - `RECEIVED_BY`: User received a transaction.
- **User-to-User (Transfers)**:
  - `TRANSFERRED_TO`: Direct transfers between users (INCOMING/OUTGOING).
- **Transaction-to-Transaction**: Links based on shared metadata (e.g., device ID, IP address, behavior patterns).
