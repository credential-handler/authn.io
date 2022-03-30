FROM node:14-alpine AS base
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app

FROM base AS build-setup
RUN apk add --no-cache git bash autoconf automake libtool binutils gcc g++ make python3

FROM build-setup AS build
USER node
COPY --chown=node:node . .
RUN mv authn.io.js index.js
# There are not tests available for this context
# RUN npm i --package-lock-only && npm ci --no-optional --production && cd test && npm i
# RUN npm i --no-optional --production --package-lock
RUN npm i --production --package-lock
RUN node index.js bundle --webpack-mode production --bundle-mode production

FROM build AS test
# There are not tests available for this context
# RUN cd test && npm t
# RUN rm -rf test && rm .npmrc

FROM base AS release
COPY --from=test --chown=node:node /home/node/app ./
COPY --from=test --chown=node:node /home/node/app/.cache ./.cache
EXPOSE 10443
ENV NODE_ENV=production
CMD [ "node", "index", "--bundle-mode", "production"]
