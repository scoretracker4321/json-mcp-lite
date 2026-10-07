FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY examples ./examples
# Serves the sample catalogue on stdio. Mount your own file and override the args to use your data:
#   docker run -i -v $(pwd)/data.json:/data.json json-mcp-lite --file /data.json --name records --id id
ENTRYPOINT ["node", "src/server.js"]
CMD ["--file", "examples/products.json", "--name", "products", "--id", "sku", "--search", "title,description"]
