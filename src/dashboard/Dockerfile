FROM --platform=linux/amd64 node:19-alpine3.15

# ENV NODE_OPTIONS=--max_old_space_size=2048
ENV FRONTEND_PORT 3000

WORKDIR /app

COPY ./package.json ./package-lock.json /app/
# COPY ./tsconfig.json /app/

RUN mkdir -p /app/src
COPY ./src /app/src

RUN mkdir -p /app/public
COPY ./public /app/public

RUN npm install -g npm@latest
RUN npm config set legacy-peer-deps true
RUN npm install 
RUN npm run build

EXPOSE $FRONTEND_PORT

CMD ["npm", "start"]
