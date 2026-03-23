FROM node:18-slim

WORKDIR /app

ADD package.json .
ADD yarn.lock .
RUN yarn install --frozen-lockfile && \
    yarn cache clean --all
COPY . .
RUN yarn build

EXPOSE 3000
CMD ["yarn", "start:prod"]
