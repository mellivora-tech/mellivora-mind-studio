FROM oven/bun:1

WORKDIR /app

# Copy root package.json and lockfile
COPY package.json bun.lockb turbo.json ./

# Copy packages
COPY packages ./packages
COPY apps ./apps

# Install dependencies
RUN bun install

# Build argument to specify which package to start
ARG PACKAGE
ENV PACKAGE_NAME=$PACKAGE

# Build the specific package (optional, if build step is needed)
# RUN bun run build --filter=${PACKAGE_NAME}

# Start the specific package
CMD bun run --filter=${PACKAGE_NAME} start
