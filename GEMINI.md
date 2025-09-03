# GEMINI.md

## Project Overview

This project is a customer service chat system client built with Vue.js 2. It provides a real-time chat interface for both users and customer service operators. The application uses Vuex for state management, Vue Router for navigation, and Socket.IO for real-time communication with the backend server. The UI is built with the Element UI component library.

**Main Technologies:**

*   Vue.js 2.7.14
*   Vuex 3.6.2
*   Vue Router 3.6.5
*   Element UI 2.15.14
*   Socket.IO Client 4.7.5
*   Webpack 5
*   Babel

**Architecture:**

The project follows a standard Vue.js project structure:

*   `src/main.js`: The main entry point of the application, where the Vue instance is created and configured with the router and Vuex store.
*   `src/App.vue`: The root Vue component that contains the main layout and a `router-view` to display the different pages.
*   `src/components`: Contains all the Vue components used in the application, such as the chat window, message items, and operator-specific components.
*   `src/router/index.js`: Defines the application's routes, mapping URLs to specific components.
*   `src/store/index.js`: The main Vuex store file, which combines the different store modules.
*   `src/store/modules`: Contains the Vuex store modules for managing different parts of the application's state, such as `chat.js` for chat-related state and `messages.js` for message history.
*   `src/services`: Contains services for interacting with external APIs and the Socket.IO server.
    *   `ApiService.js`: For making HTTP requests to a backend API.
    *   `SocketService.js`: For handling real-time communication with the Socket.IO server.
*   `public/index.html`: The main HTML file that serves as the entry point for the application.
*   `webpack.config.js`: The Webpack configuration file for building and bundling the application.

## Building and Running

**Installation:**

```bash
npm install
```

**Development Server:**

To start the development server with hot-reloading, run the following command:

```bash
npm run dev
```

The application will be available at `http://localhost:8080`.

**Production Build:**

To build the application for production, run the following command:

```bash
npm run build
```

The production-ready files will be generated in the `dist` directory.

## Development Conventions

*   **State Management:** The application uses Vuex for centralized state management. The store is modularized to separate concerns.
*   **Routing:** Vue Router is used for client-side routing. Routes are defined in `src/router/index.js`.
*   **Real-time Communication:** Socket.IO is used for real-time communication between the client and the server. The `SocketService.js` file encapsulates the Socket.IO logic.
*   **UI Components:** The application uses the Element UI library for its UI components.
*   **Coding Style:** The project follows the standard JavaScript and Vue.js coding conventions.
