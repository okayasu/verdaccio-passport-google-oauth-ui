FROM verdaccio/verdaccio

USER root

RUN yarn add verdaccio-google-oauth-ui
COPY verdaccio.yaml /verdaccio/conf/config.yaml

USER verdaccio
