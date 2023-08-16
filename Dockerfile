FROM node:16-alpine
COPY ./_dist /app/dist
WORKDIR /app/dist
RUN npm i -g serve
CMD npx serve -n -S -C .