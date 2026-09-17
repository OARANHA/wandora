FROM node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5

WORKDIR /app

COPY spikes/mastra-agent-runtime-v1/package.json ./package.json
COPY spikes/mastra-agent-runtime-v1/package-lock.json ./package-lock.json
RUN npm ci --no-audit --no-fund

COPY integrations/mastra/operator-console-v1/tsconfig.json ./tsconfig.json
COPY integrations/mastra/operator-console-v1/src ./src
RUN mkdir -p /app/src/mastra/public && chown -R node:node /app

USER node
ENV HOME=/tmp/home
ENV MASTRA_TELEMETRY_DISABLED=true
ENV DO_NOT_TRACK=1
EXPOSE 4111

CMD ["npm", "run", "dev"]
