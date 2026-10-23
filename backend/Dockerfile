# ---------------------------------------------------------------- build stage
# Maven 3.10.0 matches .mvn/wrapper/maven-wrapper.properties exactly, so this
# image, CI and a developer machine all compile with the same Maven. The image
# ships Maven preinstalled, so nothing is downloaded to bootstrap the wrapper.
FROM maven:3.10.0-eclipse-temurin-21 AS build
WORKDIR /build

# Dependencies resolve in their own layer. A source-only change then reuses it
# instead of re-resolving every dependency on every deploy.
COPY pom.xml ./
RUN mvn -B dependency:go-offline

COPY src ./src

# Tests are deliberately skipped here: they need Docker for Testcontainers, and
# a Docker build has no daemon to talk to. CI runs the suite on every push, so
# an image is only ever built from a commit whose tests already ran.
RUN mvn -B -DskipTests package

# Split the fat jar into layers that change at different rates - dependencies
# are stable, application classes are not - so a one-line change re-uploads
# kilobytes rather than the whole jar.
RUN cp target/*.jar application.jar \
 && java -Djarmode=tools -jar application.jar extract --layers --destination extracted

# -------------------------------------------------------------- runtime stage
# JRE only: no compiler, no Maven, no source in the image that faces the
# internet, and roughly a quarter of the size of a JDK-based one.
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /application

# Ordered least- to most-frequently-changed so Docker's layer cache is useful.
COPY --from=build /build/extracted/dependencies/ ./
COPY --from=build /build/extracted/spring-boot-loader/ ./
COPY --from=build /build/extracted/snapshot-dependencies/ ./
COPY --from=build /build/extracted/application/ ./

# Render's free instance has 512 MB. The JVM defaults its heap ceiling to 25%
# of container memory, which leaves most of that idle; 75% suits a container
# running exactly one process.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0"

RUN addgroup -S app && adduser -S -G app app
USER app

# Documentation only. Render injects PORT at runtime and the app reads it.
EXPOSE 8081

ENTRYPOINT ["java", "-jar", "application.jar"]
