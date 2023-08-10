FROM node:16-alpine
COPY ./dist /app
WORKDIR /app
RUN npm i -g serve
CMD npx serve -n -S -C .