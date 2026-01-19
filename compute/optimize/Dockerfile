FROM python:3.11-slim AS builder
WORKDIR /app
RUN pip install uv
COPY pyproject.toml .
COPY src/ src/
RUN uv pip install --system -e .

FROM python:3.11-slim
WORKDIR /app
RUN pip install uv
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /app /app
ENV TZ=Asia/Shanghai
EXPOSE 9103
CMD ["python", "-m", "src.grpc_server"]
