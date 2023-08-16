FROM node:16-alpine
RUN npm i -g serve
COPY ./_dist /app/dist
WORKDIR /app/dist
CMD npx serve -n -S -C .