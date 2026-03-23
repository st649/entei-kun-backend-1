FROM node:18-slim

WORKDIR /app

ADD package.json .
RUN yarn install && \
    yarn cache clean --all
COPY . .
RUN yarn build

EXPOSE 3000
CMD ["yarn", "start:prod"]
