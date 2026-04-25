# 1. Generate licenses

FROM node:24.14.1-alpine3.22@sha256:4f33c7804fa7775b87875f512e25e515692210bfdeafd715eb8bc441c364e2f6 AS builder

WORKDIR /usr/src/alfresco
COPY package.json package.json

# Extract the package versions from main package.json
RUN cat package.json | tr -d '\n' | tr -d ' ' | sed -E 's/.*"@alfresco\/adf-core":"?([^,"]*)"?.*/\1/' > adfCore.version
RUN cat package.json | tr -d '\n' | tr -d ' ' | sed -E 's/.*"@angular\/cdk":"?([^,"]*)"?.*/\1/' > angular.cdk.version
RUN cat package.json | tr -d '\n' | tr -d ' ' | sed -E 's/.*"@angular\/material":"?([^,"]*)"?.*/\1/' > angular.material.version
RUN cat package.json | tr -d '\n' | tr -d ' ' | sed -E 's/.*"@angular\/material-date-fns-adapter":"?([^,"]*)"?.*/\1/' > angular.material-date-fns-adapter.version
RUN cat package.json | tr -d '\n' | tr -d ' ' | sed -E 's/.*"@mat-datetimepicker\/core":"?([^,"]*)"?.*/\1/' > mat-datetimepicker.core.version

# 3. Generate Theme
FROM node:24.14.1-alpine3.22@sha256:4f33c7804fa7775b87875f512e25e515692210bfdeafd715eb8bc441c364e2f6 AS builder-theme
USER root

# Copy HxP styles structure
COPY apps/workspace-hxp/src/styles.scss custom-theme/style.scss
COPY apps/workspace-hxp/src/styles custom-theme/styles
COPY libs/shared/core/src/styles custom-theme/styles
COPY libs/shared-hxp/idp-document-viewer/src/lib/theming/_viewer.theme.scss custom-theme/styles/_viewer.theme.scss

# Prepare custom material theme creation
COPY docker/custom-theme/styles custom-theme/styles/custom-material-theme
COPY docker/custom-theme/hxp/material-theme.scss custom-theme/styles/material-theme.scss
# Since '@alfresco/adf-core/custom-theme' is agnostic to hxp theme, we want to provide our own
# default palettes
COPY docker/custom-theme/hxp/default-colors.scss custom-theme/styles/custom-material-theme/theme/default-colors.scss

# Prepare npm environment for theme generation
COPY docker/custom-theme/hxp/package.json custom-theme/package.json
COPY docker/custom-theme/hxp/webpack.style.js custom-theme/webpack.style.js

# Update custom-theme package.json with proper versions
COPY --from=builder /usr/src/alfresco/adfCore.version custom-theme/adfCore.version
COPY --from=builder /usr/src/alfresco/angular.cdk.version custom-theme/angular.cdk.version
COPY --from=builder /usr/src/alfresco/angular.material.version custom-theme/angular.material.version
COPY --from=builder /usr/src/alfresco/angular.material-date-fns-adapter.version custom-theme/angular.material-date-fns-adapter.version
COPY --from=builder /usr/src/alfresco/mat-datetimepicker.core.version custom-theme/mat-datetimepicker.core.version

WORKDIR /custom-theme
# Set the ADF version extracted from main package.json in the custom theme module
RUN sed -i "s/ADF_CORE_VERSION/$(cat adfCore.version)/" package.json
RUN sed -i "s/ANGULAR_CDK_VERSION/$(cat angular.cdk.version)/" package.json
RUN sed -i "s/ANGULAR_MATERIAL_VERSION/$(cat angular.material.version)/" package.json
RUN sed -i "s/ANGULAR_MATERIAL-DATE-FNS-ADAPTER_VERSION/$(cat angular.material-date-fns-adapters.version)/" package.json
RUN sed -i "s/MAT-DATETIMEPICKER_CORE_VERSION/$(cat mat-datetimepicker.core.version)/" package.json

RUN npm install --legacy-peer-deps --ignore-scripts

# Copying hyland dependency, since docker does not have proper access for downloading Hyland packages
COPY node_modules/@hyland /custom-theme/node_modules/@hyland
COPY node_modules/@hylandsoftware/design-tokens /custom-theme/node_modules/@hylandsoftware/design-tokens
COPY node_modules/@hylandsoftware/satori-ui /custom-theme/node_modules/@hylandsoftware/satori-ui
COPY node_modules/@hylandsoftware/satori-fonts /custom-theme/node_modules/@hylandsoftware/satori-fonts
COPY node_modules/@hylandsoftware/satori-tokens /custom-theme/node_modules/@hylandsoftware/satori-tokens
COPY node_modules/@hylandsoftware/satori-icons /custom-theme/node_modules/@hylandsoftware/satori-icons
COPY node_modules/@hylandsoftware/satori-preview /custom-theme/node_modules/@hylandsoftware/satori-preview
COPY node_modules/@hylandsoftware/satori-lint /custom-theme/node_modules/@hylandsoftware/satori-lint

# 3. Generate Image

FROM nginxinc/nginx-unprivileged:1.29.3-alpine3.22@sha256:5aea7cc516b419e3526f47dd1531be31a56a046cfe44754d94f9383e13e2ee99

USER root
RUN apk add --no-cache jq
RUN apk update && apk upgrade --no-cache libcrypto3 libssl3 busybox && \
    if apk info nginx-module-image-filter > /dev/null 2>&1; then apk del --no-cache --purge nginx-module-image-filter; fi && \
    if apk info nginx-module-xslt > /dev/null 2>&1; then apk del --no-cache --purge nginx-module-xslt; fi && \
    apk del --no-cache --purge curl
USER 101

COPY dist/workspace-hxp /usr/share/nginx/html/
COPY dist/workspace-hxp/app.config.json /etc/nginx/templates/app.config.json.template
COPY docker/default.conf.template /etc/nginx/templates/
COPY docker/custom-theme/hxp/create-custom-theme.sh /docker-entrypoint.d/40-create-custom-theme.sh

USER root

RUN sed -i '/^error_log.*notice;/ s/notice/error/' /etc/nginx/nginx.conf && \
    chown -R 101:101 /etc/nginx/conf.d && \
    chmod u+w -R /etc/nginx/conf.d

COPY --from=builder /usr/lib /usr/lib
COPY --from=builder /usr/local/lib /usr/local/lib
COPY --from=builder /usr/local/include /usr/local/include
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder-theme /custom-theme /custom-theme

RUN chown -R 101:101 /custom-theme/ && \
    chmod u+rw -R /custom-theme/ && \
    chmod a+x /docker-entrypoint.d/40-create-custom-theme.sh && \
    chown -R 101:101 /usr/local/lib/node_modules/ && \
    chmod u+rw -R /usr/local/lib/node_modules/ && \
    chown 101:101 /usr/local/include && \
    chmod u+rw -R /usr/local/include && \
    chown 101:101 /usr/local/bin/node && \
    chmod u+rwx /usr/local/bin/node && \
    mkdir /usr/share/nginx/html/assets/theme && \
    chown 101:101 /usr/share/nginx/html/assets/theme/ && \
    chmod u+rw /usr/share/nginx/html/assets/theme/

WORKDIR /

# Nginx default settings
# -------------------------------
ENV SERVER_PORT=8080
ENV BASE_PATH=/
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d

ENV APP_CONFIG_PROVIDER="ALL"

ENV APP_CONFIG_BPM_HOST="{protocol}//{hostname}{:port}"
ENV APP_CONFIG_ECM_HOST="{protocol}//{hostname}{:port}"

ENV APP_CONFIG_OAUTH2_HOST="{protocol}//{hostname}{:port}/idp"

ENV APP_CONFIG_OAUTH2_CLIENTID="studio-client"
ENV APP_CONFIG_OAUTH2_IMPLICIT_FLOW=false
ENV APP_CONFIG_OAUTH2_CODE_FLOW=true
ENV APP_CONFIG_OAUTH2_SILENT_LOGIN=true
ENV APP_CONFIG_OAUTH2_REDIRECT_SILENT_IFRAME_URI="{protocol}//{hostname}{:port}/assets/silent-refresh.html"
ENV APP_CONFIG_OAUTH2_REDIRECT_LOGIN="/"
ENV APP_CONFIG_OAUTH2_REDIRECT_LOGOUT="/"
ENV APP_CONFIG_OAUTH2_SCOPE="openid profile hxp hxps environment_authorization offline_access groups profile.attributes"
ENV APP_CONFIG_CUSTOM_MODELED_EXTENSION='{}'
ENV APP_CONFIG_PLUGIN_CONTENT_SERVICE=true
ENV APP_CONFIG_ANALYTICS_PENDO_DISABLE_GUIDES=false
ENV APP_CONFIG_CUSTOM_CSS_PATH=""
ENV APP_CONFIG_CUSTOM_FONT_PATH=""
ENV APP_CONFIG_CUSTOM_HEADER_LOGO=""
ENV APP_CONFIG_CUSTOM_HEADER_IMAGE=""
ENV APP_CONFIG_CUSTOM_HEADER_COLOR=""
ENV APP_CONFIG_CUSTOM_HEADER_TEXT_COLOR=""
