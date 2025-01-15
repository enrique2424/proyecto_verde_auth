# Install dependencies only when needed
FROM node:20-slim AS deps
WORKDIR /usr/src/app
COPY package*.json ./
COPY yarn.lock ./
RUN apt-get update && apt-get install -y python3 build-essential && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN yarn add glob rimraf
RUN yarn install --production=false

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY src ./src
COPY test ./test
COPY .eslintrc.js ./
COPY .prettierrc ./
COPY nest-cli.json ./
COPY tsconfig.build.json ./
COPY tsconfig.json ./
COPY package*.json ./
COPY yarn.lock ./

RUN yarn build

# Production image, copy all the files and run next
FROM node:20-slim AS runner
WORKDIR /opt/oracle
# Instlación de librerias para Oracle
RUN apt-get update && \
    apt-get install -y libaio1 unzip curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
# Descarga de cliente lite para Oracle con curl
RUN curl -L -o instantclient-basiclite-linuxx64.zip https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip && \
    unzip instantclient-basiclite-linuxx64.zip && \
    rm -f instantclient-basiclite-linuxx64.zip && \
    cd instantclient* && \
    rm -f *jdbc* *occi* *mysql* *jar uidrvci genezi adrci && \
    echo /opt/oracle/instantclient* > /etc/ld.so.conf.d/oracle-instantclient.conf && \
    ldconfig
# Zona horaria La Paz para la imagen
ENV TZ America/La_Paz
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
WORKDIR /usr/src/app
COPY package*.json ./
COPY yarn.lock ./
RUN apt-get update && apt-get install -y python3 build-essential && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN yarn add glob rimraf
RUN yarn install --production=false
COPY --from=builder /app/dist ./dist
RUN groupadd gestion-comercial-login \
    && useradd gestion-comercial-login -g gestion-comercial-login
RUN chown -R gestion-comercial-login:gestion-comercial-login /usr/src/app
USER gestion-comercial-login
USER node
EXPOSE 3000

CMD ["node", "dist/main"]
