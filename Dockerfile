FROM verdaccio/verdaccio:5

USER root

RUN yarn add verdaccio-github-oauth-ui@3
COPY config.yaml /verdaccio/conf/config.yaml

USER verdaccio
