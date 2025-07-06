# nexus-panel/bot/Dockerfile

# ---- Base Stage ----
# This stage is used to install all dependencies, including devDependencies,
# which are necessary for building the application (e.g., typescript).
FROM node:18-alpine AS base
WORKDIR /usr/src/app

# Copy package management files
COPY package*.json ./

# ---- Dependencies Stage ----
# In this stage, we install all npm packages.
FROM base AS dependencies
# Install all dependencies, including dev dependencies for the build step.
RUN npm install

# ---- Build Stage ----
# This stage builds the TypeScript source code into JavaScript.
FROM dependencies AS build
# Copy the rest of the source code
COPY . .
# Compile TypeScript to JavaScript. The output will be in the 'dist' folder.
RUN npm run build

# ---- Production Stage ----
# This is the final, lean image that will be used in production.
# It only contains the necessary files to run the application.
FROM base AS production
# Copy only production dependencies from the 'dependencies' stage.
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
# Copy the compiled code from the 'build' stage.
COPY --from=build /usr/src/app/dist ./dist
# Copy the package.json file.
COPY --from=build /usr/src/app/package.json ./

# The command to start the bot. The entry point is 'dist/index.js'.
CMD ["node", "dist/index.js"]