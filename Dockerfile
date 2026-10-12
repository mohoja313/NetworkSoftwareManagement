# Multi-stage: build frontend + backend JAR, then run on JRE 21
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /app
COPY pom.xml ./
COPY src ./src
COPY --from=frontend-build /app/frontend/dist ./src/main/resources/static
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
ENV SERVER_PORT=8099 STORAGE_PATH=/data/storage DATA_PATH=/data
COPY --from=backend-build /app/target/network-software-management-1.0.0.jar ./app.jar
VOLUME ["/data"]
EXPOSE 8099
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
