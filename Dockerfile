FROM node:20.5.1
WORKDIR /mynodeproject
COPY package*.json ./
RUN npm install
COPY ./server ./server
COPY ./public ./public
EXPOSE 3000
CMD npm start
